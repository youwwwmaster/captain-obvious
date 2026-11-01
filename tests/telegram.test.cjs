const { test } = require('node:test');
const assert = require('node:assert/strict');

// Load the real bot/grammY pipeline, replacing only external services.
function stub(path, exports) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

stub('../dist/config', { config: {
  bot: { token: '123:test', botUsername: 'test_bot', supportAdminChatId: '' },
  ai: { provider: 'openai', systemPrompt: 'test' },
  stars: { packPrice: 3, packCalls: 10 },
} });
stub('../dist/db', { db: {} });
let complete;
stub('../dist/ai/openai', { openaiProvider: { complete: (...args) => complete(...args) } });
stub('../dist/ai/anthropic', { anthropicProvider: {} });
stub('../dist/db/repositories/user', {
  findOrCreateUser: async () => ({ id: 'test-user', daily_limit: 10, bonus_balance: 0 }),
});
let charged = 0;
stub('../dist/db/repositories/request', {
  countFreeRequestsLast24h: async () => 0,
  logRequest: async () => { charged++; },
});
let fetchImpl;
const fakeFetch = (...args) => fetchImpl(...args);
fakeFetch.default = fakeFetch;
stub('node-fetch', fakeFetch);

const { bot } = require('../dist/bot');
const { handleMessage } = require('../dist/handler');
const { HttpError } = require('grammy');

function networkError() {
  return Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' });
}

test('Bot API uses one IPv4 keep-alive agent, retries timeout and preserves payload', async () => {
  const calls = [];
  fetchImpl = async (_url, options) => {
    calls.push(options);
    if (calls.length === 1) throw networkError();
    return { json: async () => ({ ok: true, result: { message_id: 42 } }) };
  };
  assert.equal((await bot.api.sendMessage(-123, 'test')).message_id, 42);
  await bot.api.getFile('test-file');
  assert.equal(calls.length, 3);
  assert.equal(calls[0].agent.options.family, 4);
  assert.equal(calls[0].agent.options.keepAlive, true);
  assert.equal(calls[0].compress, true);
  assert.equal(calls[0].agent, calls[2].agent);
  assert.equal(calls[0].body, calls[1].body);
});

test('persistent network error stops after initial call plus two retries', async () => {
  let attempts = 0;
  fetchImpl = async () => { attempts++; throw networkError(); };
  await assert.rejects(bot.api.sendMessage(-123, 'test'), HttpError);
  assert.equal(attempts, 3);
});

test('Telegram 400 is not retried', async () => {
  let attempts = 0;
  fetchImpl = async () => {
    attempts++;
    return { json: async () => ({ ok: false, error_code: 400, description: 'Bad Request' }) };
  };
  await assert.rejects(bot.api.sendMessage(-123, 'test'), /400/);
  assert.equal(attempts, 1);
});

async function runHandler({ aiFails = false, sendFails = false } = {}) {
  const logs = [];
  const errors = [];
  const replies = [];
  charged = 0;
  complete = async () => {
    if (aiFails) throw new Error('provider failed');
    return 'PRIVATE ANSWER';
  };
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args) => logs.push(args);
  console.error = (...args) => errors.push(args);
  try {
    await handleMessage({
      from: { id: 1 }, chat: { id: -123 },
      message: {
        message_id: 20, text: 'капитан объясни',
        reply_to_message: { message_id: 10, text: 'PRIVATE INPUT' },
      },
      reply: async (...args) => {
        replies.push(args);
        if (sendFails) throw networkError();
      },
    });
    return { logs, errors, replies, charged };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

test('successful answer logs time and chat id without message text', async () => {
  const result = await runHandler();
  assert.equal(result.charged, 1);
  assert.equal(result.replies[0][1].reply_parameters.message_id, 10);
  assert.equal(result.errors.length, 0);
  assert.equal(result.logs.length, 1);
  const meta = result.logs[0][1];
  assert.equal(meta.chatId, -123);
  assert.ok(Number.isFinite(Date.parse(meta.time)));
  assert.ok(meta.durationMs >= 0);
  assert.ok(!JSON.stringify(result.logs).includes('PRIVATE'));
});

test('send failure is logged as Telegram error, without another reply or AI call', async () => {
  const result = await runHandler({ sendFails: true });
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0][0], 'Ошибка отправки в Telegram:');
  assert.equal(result.logs.length, 0);
  assert.equal(result.replies.length, 1);
  assert.equal(result.charged, 1);
});

test('AI failure and failure to send its notification are logged separately', async () => {
  const result = await runHandler({ aiFails: true, sendFails: true });
  assert.deepEqual(result.errors.map(([label]) => label), [
    'Ошибка AI:', 'Ошибка отправки в Telegram:',
  ]);
  assert.equal(result.logs.length, 0);
  assert.equal(result.charged, 0);
  assert.equal(result.replies.length, 1);
});

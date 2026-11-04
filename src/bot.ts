import { Bot, Context, HttpError, webhookCallback } from 'grammy';
import { Agent } from 'https';
import { setTimeout as delay } from 'timers/promises';
import { autoRetry } from '@grammyjs/auto-retry';
import { config } from './config';
import { handleMessage } from './handler';
import { handlePreCheckoutQuery, handleSuccessfulStarPayment } from './payments';
import { handleTermsCommand } from './legal';
import { handleSupportCommand } from './support';
import { handleStartCommand } from './welcome';

const agent = new Agent({ keepAlive: true, family: 4 });

export const bot = new Bot(config.bot.token, {
  client: { baseFetchConfig: { agent, compress: true } },
});

// auto-retry 2.0.2 does not apply maxRetryAttempts to HttpError.
// Let it handle 429/5xx, and bound network retries separately.
const retryApi = autoRetry({
  maxRetryAttempts: 2,
  maxDelaySeconds: 5,
  rethrowHttpErrors: true,
});
bot.api.config.use(async (prev, method, payload, signal) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await retryApi(prev, method, payload, signal);
    } catch (err) {
      if (!(err instanceof HttpError) || attempt >= 2 || signal?.aborted) throw err;
      await delay(3000 * 2 ** attempt);
      if (signal?.aborted) throw err;
    }
  }
});

/** Deep link `t.me/bot?start=terms` → в чат приходит `/start terms`. */
function startPayload(ctx: Context): string {
  const t = ctx.message?.text?.trim() ?? '';
  const m = t.match(/^\/start(?:@[\w]+)?(?:\s+(\S+))?/i);
  return (m?.[1] ?? '').trim();
}

async function handleStartRoute(ctx: Context): Promise<void> {
  if (startPayload(ctx) === 'terms') {
    await handleTermsCommand(ctx);
    return;
  }
  await handleStartCommand(ctx);
}

bot.on('pre_checkout_query', handlePreCheckoutQuery);

bot.use(async (ctx, next) => {
  if (ctx.message?.successful_payment) {
    await handleSuccessfulStarPayment(ctx);
    return;
  }
  await next();
});

bot.command('start', handleStartRoute);
bot.command('terms', handleTermsCommand);
bot.command('support', handleSupportCommand);

bot.on('message', handleMessage);

bot.catch((err) => {
  console.error('Ошибка бота:', err);
});

export const handleUpdate = webhookCallback(bot, 'http', {
  secretToken: config.bot.webhookSecretToken,
  onTimeout: () => console.warn('Webhook: update > 20 с, задание сброшено'),
  timeoutMilliseconds: 20_000,
});

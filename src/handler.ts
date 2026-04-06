import { Context } from 'grammy';
import { config } from './config';
import { openaiProvider } from './ai/openai';
import { anthropicProvider } from './ai/anthropic';
import { AiMessage } from './ai/provider';
import { findOrCreateUser } from './db/repositories/user';
import { countTodayRequests, logRequest } from './db/repositories/request';

const TRIGGERS = [
  'капитан объясни',
  'капитан поясни',
  'капитан твой выход',
  'капитан объясняй',
];

const LIMIT_TRIGGER = 'эй капитан лимит';

const UNKNOWN_MESSAGE = 'Мы не знаем что это такое.... Если бы мы знали что это такое...';

const provider = config.ai.provider === 'anthropic' ? anthropicProvider : openaiProvider;

function hasLimitTrigger(text: string): boolean {
  return text.toLowerCase().includes(LIMIT_TRIGGER);
}

function hasTrigger(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some(t => lower.includes(t));
}

export async function handleMessage(ctx: Context): Promise<void> {
  const msg = ctx.message;
  if (!msg || !ctx.from) return;

  const text = msg.text || msg.caption || '';

  // Лимит: без реплая, без списания запроса, до остальных триггеров
  if (hasLimitTrigger(text)) {
    const user = await findOrCreateUser(ctx.from.id, ctx.from.username);
    const used = await countTodayRequests(user.id);
    const remaining = Math.max(0, user.daily_limit - used);
    await ctx.reply(
      `Капитан подсказывает: за последние 24 часа ты использовал ${used} из ${user.daily_limit} запросов. Осталось: ${remaining}.`,
      { reply_parameters: { message_id: msg.message_id } }
    );
    return;
  }

  // 1. Есть триггер? Нет → игнор (без БД)
  if (!hasTrigger(text)) return;

  // 2. Есть реплай? Нет → фраза без API
  if (!msg.reply_to_message) {
    await ctx.reply(UNKNOWN_MESSAGE, {
      reply_parameters: { message_id: msg.message_id },
    });
    return;
  }

  const replied = msg.reply_to_message;

  // 3. Определяем тип контента реплая
  let aiMessage: AiMessage;

  if (replied.photo) {
    const photo = replied.photo[replied.photo.length - 1];
    const file = await ctx.api.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${config.bot.token}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    aiMessage = {
      type: 'image',
      imageBase64: base64,
      imageMediaType: 'image/jpeg',
      text: replied.caption || '',
    };
  } else if (replied.text) {
    aiMessage = {
      type: 'text',
      text: replied.text,
    };
  } else {
    // Документ, видео, голосовое, стикер и т.д. → фраза без API
    await ctx.reply(UNKNOWN_MESSAGE, {
      reply_parameters: { message_id: msg.message_id },
    });
    return;
  }

  // 4. Находим или создаём юзера
  const user = await findOrCreateUser(ctx.from.id, ctx.from.username);

  // 5. Проверяем rate limit
  const todayCount = await countTodayRequests(user.id);
  if (todayCount >= user.daily_limit) {
    await ctx.reply(
      `Капитан устал! Лимит ${user.daily_limit} запросов в день исчерпан. Возвращайся завтра.`,
      { reply_parameters: { message_id: msg.message_id } }
    );
    return;
  }

  // 6. Запрос к AI
  try {
    const answer = await provider.complete(config.ai.systemPrompt, aiMessage);

    // 7. Логируем запрос
    await logRequest(user.id);

    // 8. Отвечаем
    await ctx.reply(answer, {
      reply_parameters: { message_id: replied.message_id },
    });
  } catch (err) {
    console.error('Ошибка AI:', err);
    await ctx.reply('Капитан временно недоступен. Попробуй позже.', {
      reply_parameters: { message_id: msg.message_id },
    });
  }
}

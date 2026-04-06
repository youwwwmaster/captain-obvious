import { Context } from 'grammy';
import { config } from './config';
import { openaiProvider } from './ai/openai';
import { anthropicProvider } from './ai/anthropic';
import { AiMessage } from './ai/provider';
import { findOrCreateUser } from './db/repositories/user';
import {
  countFreeRequestsLast24h,
  logRequest,
  consumeBonusSlot,
} from './db/repositories/request';
import { sendExtraCallsInvoice, STARS_EXTRA_PACK_PRICE, STARS_EXTRA_PACK_CALLS } from './payments';
import { maybeHandleSupportReply } from './support';
import { escapeMarkdownV2 as esc, mdBold as b, mdItalic as i, mdLink } from './tgMarkdownV2';

const TRIGGERS = [
  'капитан объясни',
  'эй капитан',
  'эй, капитан',
  'капитан поясни',
  'капитан твой выход',
  'капитан объясняй',
];

const LIMIT_TRIGGER = 'эй капитан лимит';

const UNKNOWN_MESSAGE =
  'Мы не знаем что это такое.... Если бы мы знали что это такое... Но это точно не текст и не картинка';

const provider = config.ai.provider === 'anthropic' ? anthropicProvider : openaiProvider;

function hasLimitTrigger(text: string): boolean {
  return text.toLowerCase().includes(LIMIT_TRIGGER);
}

function hasTrigger(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export async function handleMessage(ctx: Context): Promise<void> {
  const msg = ctx.message;
  if (!msg || !ctx.from) return;

  if (await maybeHandleSupportReply(ctx)) return;

  const text = msg.text || msg.caption || '';

  if (hasLimitTrigger(text)) {
    const user = await findOrCreateUser(ctx.from.id, ctx.from.username);
    const freeUsed = await countFreeRequestsLast24h(user.id);
    const remainingFree = Math.max(0, user.daily_limit - freeUsed);
    const bonus = Number(user.bonus_balance) || 0;
    const limitStatsMsg = [
      `🧭 ${b('Капитан подсказывает')}`,
      '',
      `⏱ ${esc('Базовые запросы за последние 24 часа')}`,
      `${b(`${freeUsed} из ${user.daily_limit}`)} · ${esc('осталось')} ${b(String(remainingFree))}`,
      '',
      `⭐ ${esc('Экстра-вызовов в запасе:')} ${b(String(bonus))}`,
    ].join('\n');
    await ctx.reply(limitStatsMsg, {
      parse_mode: 'MarkdownV2',
      reply_parameters: { message_id: msg.message_id },
    });
    return;
  }

  if (!hasTrigger(text)) return;

  if (!msg.reply_to_message) {
    await ctx.reply(UNKNOWN_MESSAGE, {
      reply_parameters: { message_id: msg.message_id },
    });
    return;
  }

  const replied = msg.reply_to_message;

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
    await ctx.reply(UNKNOWN_MESSAGE, {
      reply_parameters: { message_id: msg.message_id },
    });
    return;
  }

  const user = await findOrCreateUser(ctx.from.id, ctx.from.username);
  const freeUsed = await countFreeRequestsLast24h(user.id);
  const bonus = Number(user.bonus_balance) || 0;

  const canUseFree = freeUsed < user.daily_limit;
  const canUseBonus = bonus > 0;

  if (!canUseFree && !canUseBonus) {
    const uname = (ctx.me?.username || config.bot.botUsername).trim();
    const termsLine = uname
      ? `_${esc('Оплачивая, ты принимаешь ')}${mdLink(
          'условия использования бота',
          `https://t.me/${uname}?start=terms`
        )}${esc('.')}_`
      : i('Оплачивая, ты принимаешь условия использования.');
    const limitMsg = [
      `😮‍💨 ${b('Капитан устал...')}`,
      `${esc('Базовый лимит ')}${b(`${user.daily_limit} запросов`)}${esc(' за 24 ч исчерпан!')}`,
      '',
      `☕ ${esc('Но если подкинешь на рюмку кофе — ')}${b(`${STARS_EXTRA_PACK_PRICE} ⭐`)}${esc(' я расскажу ещё ')}${b(`${STARS_EXTRA_PACK_CALLS} историй`)}${esc('!')}`,
      '',
      termsLine,
    ].join('\n');
    await ctx.reply(limitMsg, {
      parse_mode: 'MarkdownV2',
      link_preview_options: { is_disabled: true },
      reply_parameters: { message_id: msg.message_id },
    });
    await sendExtraCallsInvoice(ctx, msg.message_id);
    return;
  }

  try {
    const answer = await provider.complete(config.ai.systemPrompt, aiMessage);

    if (canUseFree) {
      await logRequest(user.id, 'free');
    } else {
      const consumed = await consumeBonusSlot(user.id);
      if (!consumed) {
        console.error('consumeBonusSlot failed after AI success', user.id);
      }
    }

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

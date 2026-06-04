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
  'captain explain',
  'hey captain',
  'hey, captain',
  'captain clarify',
  'captain your turn',
  'captain explain more',
];

const LIMIT_TRIGGER = 'hey captain limit';

const UNKNOWN_MESSAGE =
  "We don't know what this is.... If we knew what this was... But it's definitely not text or an image";

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
      `🧭 ${b('Captain says')}`,
      '',
      `⏱ ${esc('Free requests in the last 24 hours')}`,
      `${b(`${freeUsed} of ${user.daily_limit}`)} · ${esc('left')} ${b(String(remainingFree))}`,
      '',
      `⭐ ${esc('Extra calls in reserve:')} ${b(String(bonus))}`,
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
      ? `_${esc('By paying you accept the ')}${mdLink(
          'bot terms of use',
          `https://t.me/${uname}?start=terms`
        )}${esc('.')}_`
      : i('By paying you accept the terms of use.');
    const limitMsg = [
      `😮‍💨 ${b('The Captain is tired...')}`,
      `${esc('Free limit of ')}${b(`${user.daily_limit} requests`)}${esc(' per 24h is used up!')}`,
      '',
      `☕ ${esc('Buy me a coffee — ')}${b(`${STARS_EXTRA_PACK_PRICE} ⭐`)}${esc(' for ')}${b(`${STARS_EXTRA_PACK_CALLS} more stories`)}${esc('!')}`,
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
    console.error('AI error:', err);
    await ctx.reply('Captain is temporarily unavailable. Try again later.', {
      reply_parameters: { message_id: msg.message_id },
    });
  }
}

import { Context } from 'grammy';
import { config } from './config';
import { escapeMarkdownV2 as esc, mdBold as b, mdCode as c } from './tgMarkdownV2';

/** Users waiting to send one message after /support */
const awaitingTicket = new Set<number>();

/** Numeric Telegram user id only. Bot API cannot DM by @username. */
function supportAdminId(): number | null {
  const raw = config.bot.supportAdminChatId.trim();
  if (!raw || !/^-?\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id !== 0 ? id : null;
}

/** Same as bot.command('support') — not a ticket body */
function isBareSupportCommand(text: string | undefined): boolean {
  if (!text) return false;
  return /^\/support(?:@[\w]+)?$/i.test(text.trim());
}

const MSG_INSTRUCTIONS = [
  `📩 ${b('Support')}`,
  '',
  esc('Briefly describe the issue: what you did and what went wrong.'),
  '',
  b('What helps us resolve faster'),
  esc('• a screenshot'),
  esc('• or a short video / screencast showing the problem'),
  '',
  `${esc('Send ')}${b('one message')}${esc(': text (caption on photo/video if needed) and attachments.')}`,
  '',
  esc('We will forward it to the admin and send you a confirmation.'),
].join('\n');

const MSG_ACCEPTED = [
  `✅ ${b('Request received')}`,
  '',
  esc('Thank you — we got your message and passed it for review.'),
  '',
  `⏱ ${b('Response time: up to 48 hours.')}`,
  esc('We will reach you here on Telegram within that window.'),
  '',
  esc('To send another request, run /support again and send a new message.'),
].join('\n');

const MSG_NO_ADMIN = [
  esc('⚠️ Support is unavailable right now.'),
  '',
  esc('Try again later or use the contact in the bot description.'),
].join('\n');

const MSG_FORWARD_FAILED = [
  esc('Could not deliver your message to the admin.'),
  '',
  esc('Try again in a minute. If it keeps failing, contact us another way (see bot description).'),
].join('\n');

export async function handleSupportCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  if (!supportAdminId()) {
    await ctx.reply(MSG_NO_ADMIN, { parse_mode: 'MarkdownV2', link_preview_options: { is_disabled: true } });
    return;
  }

  awaitingTicket.add(from.id);
  await ctx.reply(MSG_INSTRUCTIONS, {
    parse_mode: 'MarkdownV2',
    link_preview_options: { is_disabled: true },
    reply_parameters: ctx.message ? { message_id: ctx.message.message_id } : undefined,
  });
}

/**
 * If the user is waiting to file a ticket — forward to admin and confirm.
 * @returns true if the message was handled (stop the chain)
 */
export async function maybeHandleSupportReply(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  const msg = ctx.message;
  if (!from || !msg) return false;
  if (!awaitingTicket.has(from.id)) return false;

  const text = msg.text ?? '';
  if (isBareSupportCommand(text)) {
    return false;
  }

  const adminId = supportAdminId();
  if (!adminId) {
    awaitingTicket.delete(from.id);
    await ctx.reply(MSG_NO_ADMIN, { parse_mode: 'MarkdownV2', link_preview_options: { is_disabled: true } });
    return true;
  }

  if (text.startsWith('/')) {
    awaitingTicket.delete(from.id);
    return false;
  }

  const uname = from.username ? `@${from.username}` : 'no username';
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || '—';
  const header = [
    `🎫 ${b('Support request')}`,
    '',
    `${esc('👤')} ${esc(name)} \\(${esc(uname)}\\)`,
    `${esc('🆔')} ${c(String(from.id))}`,
    '',
    esc('Forwarded user message below:'),
  ].join('\n');

  try {
    await ctx.api.sendMessage(adminId, header, { parse_mode: 'MarkdownV2' });
    await ctx.api.forwardMessage(adminId, msg.chat.id, msg.message_id);
  } catch (e) {
    console.error('support forward failed', e);
    await ctx.reply(MSG_FORWARD_FAILED, { parse_mode: 'MarkdownV2', link_preview_options: { is_disabled: true } });
    return true;
  }

  awaitingTicket.delete(from.id);
  await ctx.reply(MSG_ACCEPTED, {
    parse_mode: 'MarkdownV2',
    link_preview_options: { is_disabled: true },
    reply_parameters: { message_id: msg.message_id },
  });
  return true;
}

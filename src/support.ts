import { Context } from 'grammy';
import { config } from './config';

/** Пользователи, которым после /support нужно принять одно обращение */
const awaitingTicket = new Set<number>();

/** Только числовой Telegram user id. @username в личку через Bot API не работает — ограничение платформы. */
function supportAdminId(): number | null {
  const raw = config.bot.supportAdminChatId.trim();
  if (!raw || !/^-?\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id !== 0 ? id : null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** То же сообщение, что обработал bot.command('support') — не считаем тикетом */
function isBareSupportCommand(text: string | undefined): boolean {
  if (!text) return false;
  return /^\/support(?:@[\w]+)?$/i.test(text.trim());
}

const MSG_INSTRUCTIONS = [
  '📩 <b>Поддержка</b>',
  '',
  'Кратко опишите, в чём проблема: что вы делали и что пошло не так.',
  '',
  '<b>Что поможет разобраться быстрее</b>',
  '• скриншот экрана',
  '• или короткое видео / скринкаст, где видно проблему',
  '',
  'Пришлите <b>одним сообщением</b>: текст (при необходимости — подпись к фото или видео) и вложения.',
  '',
  'После отправки я передам обращение администратору и пришлю подтверждение.',
].join('\n');

const MSG_ACCEPTED = [
  '✅ <b>Обращение принято</b>',
  '',
  'Спасибо, мы получили ваше сообщение и передали его на рассмотрение.',
  '',
  '⏱ <b>Срок ответа — до 48 часов.</b>',
  'В этом интервале мы обязательно ответим вам здесь, в чате с ботом.',
  '',
  'Если нужно отправить ещё одно обращение — снова введите /support и пришлите новое сообщение.',
].join('\n');

const MSG_NO_ADMIN = [
  '⚠️ Служба поддержки сейчас недоступна.',
  '',
  'Попробуйте позже или воспользуйтесь контактом из описания бота.',
].join('\n');

const MSG_FORWARD_FAILED = [
  'Не удалось доставить обращение администратору.',
  '',
  'Попробуйте отправить ещё раз через минуту. Если ошибка повторяется — напишите нам другим способом (контакт в описании бота).',
].join('\n');

export async function handleSupportCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  if (!supportAdminId()) {
    await ctx.reply(MSG_NO_ADMIN, { link_preview_options: { is_disabled: true } });
    return;
  }

  awaitingTicket.add(from.id);
  await ctx.reply(MSG_INSTRUCTIONS, {
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_parameters: ctx.message ? { message_id: ctx.message.message_id } : undefined,
  });
}

/**
 * Если пользователь ждёт отправки тикета — пересылаем админу и отвечаем пользователю.
 * @returns true, если сообщение обработано (дальше по цепочке не идём)
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
    await ctx.reply(MSG_NO_ADMIN, { link_preview_options: { is_disabled: true } });
    return true;
  }

  if (text.startsWith('/')) {
    awaitingTicket.delete(from.id);
    return false;
  }

  const uname = from.username ? `@${from.username}` : 'без username';
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || '—';
  const header = [
    '🎫 <b>Обращение в поддержку</b>',
    '',
    `👤 ${escapeHtml(name)} (${escapeHtml(uname)})`,
    `🆔 <code>${from.id}</code>`,
    '',
    'Ниже — пересланное сообщение пользователя:',
  ].join('\n');

  try {
    await ctx.api.sendMessage(adminId, header, { parse_mode: 'HTML' });
    await ctx.api.forwardMessage(adminId, msg.chat.id, msg.message_id);
  } catch (e) {
    console.error('support forward failed', e);
    await ctx.reply(MSG_FORWARD_FAILED, { link_preview_options: { is_disabled: true } });
    return true;
  }

  awaitingTicket.delete(from.id);
  await ctx.reply(MSG_ACCEPTED, {
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_parameters: { message_id: msg.message_id },
  });
  return true;
}

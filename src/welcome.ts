import { Context } from 'grammy';
import { config } from './config';
import { STARS_EXTRA_PACK_CALLS, STARS_EXTRA_PACK_PRICE } from './payments';
import { escapeMarkdownV2 as esc, mdBold as b, mdCode as c } from './tgMarkdownV2';

const DAILY = config.dailyLimit;

const START_MESSAGE = [
  `🎩 ${b('Captain Obvious')}${esc(' — explains any post in plain words')}`,
  '',
  b('How to invoke:'),
  `${esc('Reply to the message you want explained and add a trigger:')}`,
  '',
  esc('- captain explain'),
  esc('- captain clarify'),
  esc('- captain explain more'),
  esc('- captain your turn'),
  esc('- hey captain'),
  esc('- hey, captain'),
  '',
  `${esc('Supports ')}${b('text')}${esc(' and ')}${b('images')}${esc('.')}`,
  '',
  `💰 ${b('Limits')}`,
  `${esc('- ')}${b(`${DAILY} free`)}${esc(' requests per rolling 24 hours')}`,
  esc('- When free quota is gone, paid calls are used'),
  `${esc('- No quota left — bot sends an invoice: ')}${b(`${STARS_EXTRA_PACK_PRICE} ⭐ for +${STARS_EXTRA_PACK_CALLS} calls`)}`,
  `${esc('- Purchased calls never expire')}`,
  '',
  `📊 ${esc('Check balance (no reply needed): ')}${c('hey captain limit')}`,
  '',
  `📋 ${b('Commands')}`,
  esc('/start — this help'),
  esc('/terms — terms of use'),
  esc('/support — contact support'),
].join('\n');

export async function handleStartCommand(ctx: Context): Promise<void> {
  await ctx.reply(START_MESSAGE, {
    parse_mode: 'MarkdownV2',
    link_preview_options: { is_disabled: true },
    reply_parameters: ctx.message ? { message_id: ctx.message.message_id } : undefined,
  });
}

import { Context } from 'grammy';
import { config } from './config';
import { STARS_EXTRA_PACK_CALLS, STARS_EXTRA_PACK_PRICE } from './payments';
import { escapeMarkdownV2 as esc, mdBold as b, mdCode as c, mdItalic as i } from './tgMarkdownV2';

const DAILY = config.dailyLimit;

const START_MESSAGE = [
  `👋 ${b('Капитан Очевидность')}`,
  `${esc('Поясняю')} ${b('текст')} ${esc('или')} ${b('картинку')} ${esc('из сообщения простыми словами.')}`,
  '',
  b('Как вызвать'),
  esc('1. Найди сообщение с текстом или фото.'),
  esc('2. Нажми «Ответить» на это сообщение.'),
  `${esc('3. В ответе напиши одну из фраз ниже — Капитан ответит на ')}${i('исходное')}${esc(' сообщение.')}`,
  '',
  b('На какие фразы реагирую'),
  `${c('капитан объясни')} · ${c('эй капитан')} · ${c('эй, капитан')}`,
  `${c('капитан поясни')} · ${c('капитан твой выход')} · ${c('капитан объясняй')}`,
  '',
  b('Лимит и баланс'),
  `${esc('Бесплатно до ')}${b(String(DAILY))}${esc(' вызовов за скользящие 24 часа. Если лимит кончился — можно купить пакет за ')}${b(String(STARS_EXTRA_PACK_PRICE))}${esc(' ⭐ (+')}${b(String(STARS_EXTRA_PACK_CALLS))}${esc(' вызовов без срока, тратятся после бесплатных).')}`,
  `${esc('Чтобы посмотреть остаток: напиши в чат ')}${c('эй капитан лимит')}${esc(' (тоже обычным сообщением, можно с реплаем — не важно).')}`,
  '',
  b('В личных сообщениях'),
  esc('Так же: ответ на сообщение с текстом/фото + фраза-триггер (своё или пересланное тебе).'),
  '',
  b('В группе'),
  esc('Добавь бота в чат через «Участники» → «Добавить участников». Логика та же: ответ на сообщение с текстом или фото + фраза-триггер.'),
  `${esc('Бесплатный лимит и купленные вызовы считаются по ')}${b('тому, кто написал')}${esc(' фразу (не по чату целиком).')}`,
  '',
  b('Команды'),
  esc('/start — краткая справка'),
  esc('/terms — условия использования'),
  esc('/support — написать в поддержку'),
].join('\n');

export async function handleStartCommand(ctx: Context): Promise<void> {
  await ctx.reply(START_MESSAGE, {
    parse_mode: 'MarkdownV2',
    link_preview_options: { is_disabled: true },
    reply_parameters: ctx.message ? { message_id: ctx.message.message_id } : undefined,
  });
}

import { Context } from 'grammy';
import { config } from './config';
import { STARS_EXTRA_PACK_CALLS, STARS_EXTRA_PACK_PRICE } from './payments';
import { escapeMarkdownV2 as esc, mdBold as b, mdCode as c } from './tgMarkdownV2';

const DAILY = config.dailyLimit;

const START_MESSAGE = [
  `🎩 ${b('Капитан Очевидность')}${esc(' — объясняет любой пост простыми словами')}`,
  '',
  b('Как вызвать:'),
  `${esc('Сделай ')}${b('реплай')}${esc(' на нужное сообщение и напиши любой триггер:')}`,
  '',
  esc('- капитан объясни'),
  esc('- капитан поясни'),
  esc('- капитан объясняй'),
  esc('- капитан твой выход'),
  esc('- эй капитан'),
  esc('- эй, капитан'),
  '',
  `${esc('Капитан понимает ')}${b('текст')}${esc(' и ')}${b('картинки')}${esc('.')}`,
  '',
  `💰 ${b('Лимиты')}`,
  `${esc('- ')}${b(`${DAILY} бесплатных`)}${esc(' запросов каждые 24 часа')}`,
  esc('- Когда кончились — тратятся купленные вызовы'),
  `${esc('- Нет ни тех ни других — бот выставит счёт: ')}${b(`${STARS_EXTRA_PACK_PRICE} ⭐ за +${STARS_EXTRA_PACK_CALLS} вызовов`)}`,
  `${esc('- Купленные вызовы ')}${b('бессрочны')}`,
  '',
  `📊 ${esc('Проверить остаток: просто напиши без реплая - ')}${c('эй капитан лимит')}`,
  '',
  `📋 ${b('Команды')}`,
  esc('/start — эта справка'),
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

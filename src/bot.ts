import { Bot, Context, webhookCallback } from 'grammy';
import { config } from './config';
import { handleMessage } from './handler';
import { handlePreCheckoutQuery, handleSuccessfulStarPayment } from './payments';
import { handleTermsCommand } from './legal';
import { handleSupportCommand } from './support';
import { handleStartCommand } from './welcome';

export const bot = new Bot(config.bot.token);

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
  onTimeout: () => console.warn('Webhook: update > 20 с, задание сброшено'),
  timeoutMilliseconds: 20_000,
});

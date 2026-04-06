import { Bot, webhookCallback } from 'grammy';
import { config } from './config';
import { handleMessage } from './handler';
import { handlePreCheckoutQuery, handleSuccessfulStarPayment } from './payments';

export const bot = new Bot(config.bot.token);

bot.on('pre_checkout_query', handlePreCheckoutQuery);

bot.use(async (ctx, next) => {
  if (ctx.message?.successful_payment) {
    await handleSuccessfulStarPayment(ctx);
    return;
  }
  await next();
});

bot.on('message', handleMessage);

bot.catch((err) => {
  console.error('Ошибка бота:', err);
});

export const handleUpdate = webhookCallback(bot, 'http');

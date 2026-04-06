import { Bot, webhookCallback } from 'grammy';
import { config } from './config';
import { handleMessage } from './handler';

export const bot = new Bot(config.bot.token);

bot.on('message', handleMessage);

bot.catch((err) => {
  console.error('Ошибка бота:', err);
});

export const handleUpdate = webhookCallback(bot, 'http');

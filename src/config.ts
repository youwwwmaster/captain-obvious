import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Не задана переменная окружения: ${key}`);
  return value;
}

function optional(key: string, def: string): string {
  return process.env[key] || def;
}

function parsePositiveInt(key: string, def: string, min: number): number {
  const n = parseInt(optional(key, def), 10);
  if (!Number.isFinite(n) || n < min) {
    throw new Error(`Переменная ${key} должна быть целым числом ≥ ${min}`);
  }
  return n;
}

export const config = {
  bot: {
    token: required('BOT_TOKEN'),
    webhookDomain: required('WEBHOOK_DOMAIN'),
    webhookPort: parseInt(optional('WEBHOOK_PORT', '3000')),
    /** Без @. Нужен для t.me/… ссылок, если в апдейте нет ctx.me.username (часто группы). */
    botUsername: optional('BOT_USERNAME', '').replace(/^@/, '').trim(),
    /** Куда слать /support: только числовой user id админа (Bot API не шлёт в личку по @username) */
    supportAdminChatId: optional('SUPPORT_ADMIN_CHAT_ID', ''),
  },
  ai: {
    provider: optional('AI_PROVIDER', 'openai') as 'openai' | 'anthropic',
    model: optional('MODEL', 'gpt-5.4-mini'),
    openaiApiKey: optional('OPENAI_API_KEY', ''),
    anthropicApiKey: optional('ANTHROPIC_API_KEY', ''),
    systemPrompt: fs.readFileSync(path.join(process.cwd(), 'prompt.md'), 'utf-8'),
  },
  database: {
    url: required('DATABASE_URL'),
  },
  dailyLimit: parseInt(optional('DAILY_LIMIT', '10')),
  /** Пакет Stars: цена в XTR и сколько бонусных вызовов начисляется */
  stars: {
    packPrice: parsePositiveInt('STARS_PACK_PRICE', '3', 1),
    packCalls: parsePositiveInt('STARS_PACK_CALLS', '10', 1),
  },
};

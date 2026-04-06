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

export const config = {
  bot: {
    token: required('BOT_TOKEN'),
    webhookDomain: required('WEBHOOK_DOMAIN'),
    webhookPort: parseInt(optional('WEBHOOK_PORT', '3000')),
    /** Числовой Telegram user id администратора (куда пересылаются обращения /support) */
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
};

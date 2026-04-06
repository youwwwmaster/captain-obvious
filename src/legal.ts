import * as fs from 'fs';
import * as path from 'path';
import { Context } from 'grammy';
import { config } from './config';

const TERMS_PATH = path.join(process.cwd(), 'terms.md');

function getTermsText(): string {
  return fs.readFileSync(TERMS_PATH, 'utf-8').trim();
}

const TG_MAX = 3900;

function splitForTelegram(text: string): string[] {
  if (text.length <= TG_MAX) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > 0) {
    chunks.push(rest.slice(0, TG_MAX));
    rest = rest.slice(TG_MAX);
  }
  return chunks;
}

export async function handleTermsCommand(ctx: Context): Promise<void> {
  const parts = splitForTelegram(getTermsText());
  for (let i = 0; i < parts.length; i++) {
    await ctx.reply(parts[i], {
      link_preview_options: { is_disabled: true },
      ...(i === 0 && ctx.message ? { reply_parameters: { message_id: ctx.message.message_id } } : {}),
    });
  }
}

export async function handleSupportCommand(ctx: Context): Promise<void> {
  await ctx.reply(config.bot.supportReply, {
    reply_parameters: ctx.message ? { message_id: ctx.message.message_id } : undefined,
  });
}

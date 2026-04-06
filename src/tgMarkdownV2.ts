/**
 * Telegram Bot API — MarkdownV2 (актуальный режим с полным набором сущностей).
 * @see https://core.telegram.org/bots/api#markdownv2-style
 */

const MD2_SPECIAL = new Set<string>([
  '_',
  '*',
  '[',
  ']',
  '(',
  ')',
  '~',
  '`',
  '>',
  '#',
  '+',
  '-',
  '=',
  '|',
  '{',
  '}',
  '.',
  '!',
  '\\',
]);

/** Экранирование произвольного текста вне code/pre (все зарезервированные символы). */
export function escapeMarkdownV2(text: string): string {
  let out = '';
  for (const c of text) {
    out += MD2_SPECIAL.has(c) ? `\\${c}` : c;
  }
  return out;
}

/** Внутри inline code: только ` и \\ */
export function escapeMd2Code(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

export function mdBold(text: string): string {
  return `*${escapeMarkdownV2(text)}*`;
}

export function mdItalic(text: string): string {
  return `_${escapeMarkdownV2(text)}_`;
}

export function mdCode(text: string): string {
  return `\`${escapeMd2Code(text)}\``;
}

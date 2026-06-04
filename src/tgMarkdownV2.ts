/**
 * Telegram Bot API — MarkdownV2 (full entity set).
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

/** Escape plain text outside code/pre (all reserved characters). */
export function escapeMarkdownV2(text: string): string {
  let out = '';
  for (const c of text) {
    out += MD2_SPECIAL.has(c) ? `\\${c}` : c;
  }
  return out;
}

/** Inside inline code: escape only ` and \\ */
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

/** Inline link: escape `)` and `\` in the URL (Bot API MarkdownV2). */
export function mdLink(label: string, url: string): string {
  const escUrl = url.replace(/\\/g, '\\\\').replace(/\)/g, '\\)');
  return `[${escapeMarkdownV2(label)}](${escUrl})`;
}

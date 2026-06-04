import { Context } from 'grammy';
import { config } from './config';
import { db } from './db';
import { getUserById, findOrCreateUser } from './db/repositories/user';

export const STARS_EXTRA_PACK_PRICE = config.stars.packPrice;
export const STARS_EXTRA_PACK_CALLS = config.stars.packCalls;

const PAYLOAD_PREFIX = 'bonus:';
/** Legacy invoices before prefix change */
const LEGACY_PAYLOAD_PREFIX = 'bonus10:';

function buildPayload(userInternalId: string): string {
  return `${PAYLOAD_PREFIX}${userInternalId}`;
}

export function parseBonusPayload(payload: string): string | null {
  if (payload.startsWith(PAYLOAD_PREFIX)) {
    const id = payload.slice(PAYLOAD_PREFIX.length);
    return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  }
  if (payload.startsWith(LEGACY_PAYLOAD_PREFIX)) {
    const id = payload.slice(LEGACY_PAYLOAD_PREFIX.length);
    return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  }
  return null;
}

export async function sendExtraCallsInvoice(
  ctx: Context,
  replyToMessageId: number
): Promise<void> {
  const user = ctx.from;
  if (!user) return;

  const u = await findOrCreateUser(user.id, user.username);

  await ctx.replyWithInvoice(
    `+${STARS_EXTRA_PACK_CALLS} Captain calls`,
    'No expiry: used only after the free 24h quota is exhausted.',
    buildPayload(u.id),
    'XTR',
    [{ label: `+${STARS_EXTRA_PACK_CALLS} calls`, amount: STARS_EXTRA_PACK_PRICE }],
    {
      provider_token: '',
      reply_parameters: { message_id: replyToMessageId },
    }
  );
}

export async function handlePreCheckoutQuery(ctx: Context): Promise<void> {
  const q = ctx.preCheckoutQuery;
  if (!q) return;

  const userId = parseBonusPayload(q.invoice_payload);
  if (!userId) {
    await ctx.answerPreCheckoutQuery(false, { error_message: 'Invalid invoice.' });
    return;
  }

  const row = await getUserById(userId);
  if (!row || String(row.telegram_id) !== String(q.from.id)) {
    await ctx.answerPreCheckoutQuery(false, { error_message: 'This invoice is not for you.' });
    return;
  }

  if (q.currency !== 'XTR' || q.total_amount !== STARS_EXTRA_PACK_PRICE) {
    await ctx.answerPreCheckoutQuery(false, { error_message: 'Invalid amount.' });
    return;
  }

  await ctx.answerPreCheckoutQuery(true);
}

export async function handleSuccessfulStarPayment(ctx: Context): Promise<void> {
  const msg = ctx.message;
  const sp = msg?.successful_payment;
  if (!sp || !ctx.from) return;

  if (sp.currency !== 'XTR' || sp.total_amount !== STARS_EXTRA_PACK_PRICE) {
    console.warn('Stars payment: unexpected amount/currency', sp);
    return;
  }

  const userId = parseBonusPayload(sp.invoice_payload);
  if (!userId) return;

  const row = await getUserById(userId);
  if (!row || String(row.telegram_id) !== String(ctx.from.id)) {
    console.warn('Stars payment: user mismatch', userId);
    return;
  }

  const chargeId = sp.telegram_payment_charge_id;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const ins = await client.query(
      `INSERT INTO processed_star_payments (charge_id, user_id) VALUES ($1, $2)
       ON CONFLICT (charge_id) DO NOTHING RETURNING charge_id`,
      [chargeId, userId]
    );
    if (ins.rowCount === 0) {
      await client.query('ROLLBACK');
      return;
    }
    await client.query('UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2', [
      STARS_EXTRA_PACK_CALLS,
      userId,
    ]);
    await client.query(
      'INSERT INTO transactions (user_id, stars_amount, type) VALUES ($1, $2, $3)',
      [userId, STARS_EXTRA_PACK_PRICE, 'purchase']
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  await ctx.reply(
    `Captain received ${STARS_EXTRA_PACK_PRICE} ⭐. +${STARS_EXTRA_PACK_CALLS} calls added (no expiry) — used after the free limit.`
  );
}

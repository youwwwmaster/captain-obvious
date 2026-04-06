import { db } from '../../db';

export type RequestSource = 'free' | 'bonus';

/** Сколько бесплатных вызовов за последние 24 часа (только source=free). */
export async function countFreeRequestsLast24h(userId: string): Promise<number> {
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM requests
     WHERE user_id = $1 AND source = 'free' AND created_at > NOW() - INTERVAL '24 hours'`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}

export async function logRequest(userId: string, source: RequestSource): Promise<void> {
  await db.query('INSERT INTO requests (user_id, source) VALUES ($1, $2)', [userId, source]);
}

/** Атомарно: −1 bonus_balance и запись запроса bonus. */
export async function consumeBonusSlot(userId: string): Promise<boolean> {
  const r = await db.query<{ id: string }>(
    `WITH u AS (
       UPDATE users SET bonus_balance = bonus_balance - 1
       WHERE id = $1::uuid AND bonus_balance > 0
       RETURNING id
     )
     INSERT INTO requests (user_id, source)
     SELECT id, 'bonus' FROM u
     RETURNING id`,
    [userId]
  );
  return r.rows.length > 0;
}

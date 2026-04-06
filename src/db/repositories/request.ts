import { db } from '../../db';

export async function countTodayRequests(userId: string): Promise<number> {
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM requests
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}

export async function logRequest(userId: string): Promise<void> {
  await db.query('INSERT INTO requests (user_id) VALUES ($1)', [userId]);
}

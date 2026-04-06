import { db } from '../../db';
import { config } from '../../config';

export interface User {
  id: string;
  telegram_id: string;
  username: string | null;
  daily_limit: number;
  bonus_balance: number;
  created_at: Date;
}

export async function findOrCreateUser(telegramId: number, username?: string): Promise<User> {
  const existing = await db.query<User>(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );

  if (existing.rows[0]) return existing.rows[0];

  const created = await db.query<User>(
    'INSERT INTO users (telegram_id, username, daily_limit) VALUES ($1, $2, $3) RETURNING *',
    [telegramId, username || null, config.dailyLimit]
  );

  return created.rows[0];
}

export async function getUserById(id: string): Promise<User | null> {
  const r = await db.query<User>('SELECT * FROM users WHERE id = $1', [id]);
  return r.rows[0] || null;
}

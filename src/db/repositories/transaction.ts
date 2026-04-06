import { db } from '../../db';

export type TransactionType = 'purchase' | 'spend';

export async function logTransaction(
  userId: string,
  starsAmount: number,
  type: TransactionType
): Promise<void> {
  await db.query(
    'INSERT INTO transactions (user_id, stars_amount, type) VALUES ($1, $2, $3)',
    [userId, starsAmount, type]
  );
}

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db';

export async function runMigrations(): Promise<void> {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations/001-init.sql'),
    'utf-8'
  );
  await db.query(sql);
  console.log('✅ Миграции выполнены');
}

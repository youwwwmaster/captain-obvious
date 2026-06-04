import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db';

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await db.query(sql);
    console.log(`✅ Migration ${file}`);
  }
  console.log('✅ Migrations complete');
}

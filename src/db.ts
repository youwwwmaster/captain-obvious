import { Pool } from 'pg';
import { config } from './config';

export const db = new Pool({
  connectionString: config.database.url,
});

db.on('error', (err) => {
  console.error('PostgreSQL error:', err);
});

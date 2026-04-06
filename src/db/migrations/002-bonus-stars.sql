ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_balance INT NOT NULL DEFAULT 0;

ALTER TABLE requests ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'free';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'requests_source_check'
  ) THEN
    ALTER TABLE requests ADD CONSTRAINT requests_source_check CHECK (source IN ('free', 'bonus'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS processed_star_payments (
  charge_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

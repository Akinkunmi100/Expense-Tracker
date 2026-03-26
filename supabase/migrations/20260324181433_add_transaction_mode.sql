-- 1. Add transaction_mode column to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'transaction_mode'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transaction_mode TEXT DEFAULT 'personal' CHECK (transaction_mode IN ('personal', 'business'));
  END IF;
END $$;

-- 2. Index for performance since we filter by it almost every query now
CREATE INDEX IF NOT EXISTS idx_transactions_mode
  ON transactions (user_id, transaction_mode);

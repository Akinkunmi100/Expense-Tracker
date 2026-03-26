-- Mono Bank Integration Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. Create the linked_accounts table for storing Mono-connected bank accounts
CREATE TABLE IF NOT EXISTS linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mono_account_id TEXT NOT NULL UNIQUE,
  institution_name TEXT,
  account_name TEXT,
  account_type TEXT,
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE linked_accounts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: Users can only see/manage their own linked accounts
CREATE POLICY "Users can view own linked accounts"
  ON linked_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own linked accounts"
  ON linked_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own linked accounts"
  ON linked_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own linked accounts"
  ON linked_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Rename plaid column to be bank-agnostic (skip if column doesn't exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'plaid_transaction_id'
  ) THEN
    ALTER TABLE transactions RENAME COLUMN plaid_transaction_id TO bank_transaction_id;
  END IF;
END $$;

-- 5. Create index for faster deduplication lookups
CREATE INDEX IF NOT EXISTS idx_transactions_bank_tx_id
  ON transactions (bank_transaction_id)
  WHERE bank_transaction_id IS NOT NULL;

-- 6. Create index for fetching accounts by user
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_id
  ON linked_accounts (user_id);

-- 7. Update source check constraint: replace 'plaid' with 'mono'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_source_check'
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_source_check;
  END IF;
END $$;

ALTER TABLE transactions ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('manual', 'mono'));


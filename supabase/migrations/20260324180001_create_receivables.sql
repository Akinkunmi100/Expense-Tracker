-- Vendor Enhancements Migration
-- Run this in your Supabase SQL Editor

-- 1. Add app_mode column to profiles (default: personal)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'app_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN app_mode TEXT DEFAULT 'personal';
  END IF;
END $$;

-- 2. Create receivables table for outstanding payments tracking
CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  matched_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view own receivables"
  ON receivables FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receivables"
  ON receivables FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receivables"
  ON receivables FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receivables"
  ON receivables FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS idx_receivables_user_id
  ON receivables (user_id);

CREATE INDEX IF NOT EXISTS idx_receivables_status
  ON receivables (user_id, status);

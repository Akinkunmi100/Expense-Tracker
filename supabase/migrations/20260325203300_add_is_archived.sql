-- Add is_archived to the transactions table for soft deletes and bulk clearing
ALTER TABLE public.transactions
ADD COLUMN is_archived boolean DEFAULT false;

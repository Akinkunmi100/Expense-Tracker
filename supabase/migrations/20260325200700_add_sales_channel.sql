ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS sales_channel varchar;

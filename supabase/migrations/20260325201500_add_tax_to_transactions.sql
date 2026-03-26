-- Add tax columns to transactions table so businesses can track VAT/WHT per transaction
ALTER TABLE public.transactions
ADD COLUMN tax_amount numeric DEFAULT 0,
ADD COLUMN tax_rate numeric DEFAULT 0,
ADD COLUMN tax_type text DEFAULT 'VAT';

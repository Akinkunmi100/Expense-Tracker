-- Add has_onboarded to the profiles table
ALTER TABLE public.profiles
ADD COLUMN has_onboarded boolean DEFAULT false;

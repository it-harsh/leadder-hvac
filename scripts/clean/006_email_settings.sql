-- 006_email_settings.sql
-- Add customer quote email toggle to business_settings

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS customer_quote_email_enabled BOOLEAN DEFAULT TRUE;

UPDATE public.business_settings
  SET customer_quote_email_enabled = TRUE
  WHERE customer_quote_email_enabled IS NULL;

-- ============================================================
-- 004_ghl_integration.sql
-- Add GoHighLevel (GHL) CRM integration columns to business_settings
-- Run in Supabase SQL editor
-- ============================================================

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS ghl_api_key       TEXT,
  ADD COLUMN IF NOT EXISTS ghl_location_id   TEXT,
  ADD COLUMN IF NOT EXISTS ghl_pipeline_id   TEXT,
  ADD COLUMN IF NOT EXISTS ghl_stage_id      TEXT,
  ADD COLUMN IF NOT EXISTS ghl_enabled       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS webhook_enabled   BOOLEAN DEFAULT TRUE;

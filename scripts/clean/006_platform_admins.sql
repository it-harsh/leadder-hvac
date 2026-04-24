CREATE TABLE public.platform_admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS with no policies.
-- This means no anon/authenticated client can read or write this table.
-- All access goes exclusively through the service role client (server-side only).
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

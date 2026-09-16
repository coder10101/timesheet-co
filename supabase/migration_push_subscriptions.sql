-- =============================================================================
-- Migration: Push Subscriptions
-- Stores browser Web Push subscription endpoints per user.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions (user_id);

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage only their own subscriptions
CREATE POLICY "push_subs_select_own" ON public.push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "push_subs_insert_own" ON public.push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subs_delete_own" ON public.push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Service role can read all (needed by the Edge Function)
CREATE POLICY "push_subs_service_role_select" ON public.push_subscriptions
  FOR SELECT TO service_role USING (true);

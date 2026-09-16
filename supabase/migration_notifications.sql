-- ============================================================
-- Migration: Notifications System
-- ============================================================
-- Stores in-app and push notification records for employees
-- and administrators with full Row Level Security (RLS)
-- and Realtime replication support.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON public.notifications(recipient_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_date ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(org_id);

-- Enforces exactly one reminder per employee per day for each milestone key
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_daily_reminder_dedup
ON public.notifications (recipient_id, type, (metadata->>'date'), (metadata->>'reminderKey'))
WHERE metadata->>'reminderKey' IS NOT NULL;

-- 3. Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can read notifications addressed to them, created by them, or admins can read org notifications
DROP POLICY IF EXISTS "users read own notifications" ON public.notifications;
CREATE POLICY "users read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    recipient_id = auth.uid()
    OR actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can insert notifications (leave requests, approvals, attendance edits, reminders)
DROP POLICY IF EXISTS "users create notifications" ON public.notifications;
CREATE POLICY "users create notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can update their own notifications (e.g. mark as read)
DROP POLICY IF EXISTS "users update own notifications" ON public.notifications;
CREATE POLICY "users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Users can delete their own notifications
DROP POLICY IF EXISTS "users delete own notifications" ON public.notifications;
CREATE POLICY "users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (recipient_id = auth.uid());

-- 5. Enable Realtime publication for live notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- In some managed Supabase environments, publication alteration is handled via dashboard
    RAISE NOTICE 'Realtime publication notice: %', SQLERRM;
END $$;

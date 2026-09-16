-- ============================================================
-- Migration: Add settings column and RLS policies for organizations
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Ensure organizations table has settings column (JSONB)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- 2. Ensure office_hours column exists with proper default
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS office_hours jsonb DEFAULT '{"workDayHours": 7, "includeLunch": true, "lunchMinutes": 0, "startTime": "10:00", "graceMinutes": 30}'::jsonb;

-- 3. Enable Row Level Security on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 4. Allow any authenticated user (or anon during onboarding/login) to read organization details
DROP POLICY IF EXISTS "anyone reads organizations" ON public.organizations;
CREATE POLICY "anyone reads organizations" ON public.organizations
  FOR SELECT USING (true);

-- 5. Allow admins to update organization configuration (office hours, settings, presets)
DROP POLICY IF EXISTS "admins update organizations" ON public.organizations;
CREATE POLICY "admins update organizations" ON public.organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND role = 'admin' 
        AND (org_id = organizations.id OR org_id = '00000000-0000-0000-0000-000000000001'::uuid)
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. RPC helper to check / update org settings securely if needed
COMMENT ON COLUMN public.organizations.settings IS 'Stores workspace project presets, category configs, and custom workspace preferences';

-- ============================================================
-- Migration: Add edit_history column to attendance and work_logs
-- ============================================================
-- Tracks chronological audit trail of modifications to attendance
-- and work log entries, including timestamps, editor identity,
-- previous values, and edit reasons.
-- ============================================================

-- 1. Attendance edit history
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;

-- 2. Work logs edit history
ALTER TABLE public.work_logs
ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;

-- 3. Ensure admins can update attendance records for employees in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'attendance' AND policyname = 'admins update org attendance'
  ) THEN
    CREATE POLICY "admins update org attendance" ON public.attendance
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = attendance.employee_id
            AND is_org_admin(p.org_id)
        )
      );
  END IF;
END $$;

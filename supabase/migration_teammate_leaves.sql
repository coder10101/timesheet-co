-- ============================================================
-- Migration: Allow Organization Members to View Approved Leaves
-- ============================================================
-- This policy allows employees to see when their teammates are on
-- approved leave (for team calendars, dashboards, and coverage planning),
-- while ensuring pending and rejected requests remain strictly private
-- to the requester and organization administrators.
-- ============================================================

drop policy if exists "org members read approved leaves" on public.leave_requests;

create policy "org members read approved leaves" on public.leave_requests
  for select using (
    status = 'Approved'
    and exists (
      select 1 from profiles p
      where p.id = leave_requests.employee_id
        and p.org_id = get_auth_org_id()
    )
  );

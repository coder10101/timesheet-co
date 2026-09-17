-- =============================================================================
-- Migration: Scheduled Reminders (server-side fallback via pg_cron)
-- =============================================================================
-- This function mirrors the logic in useAttendanceReminders.js and
-- useEventReminders.js but runs entirely on the DB side so reminders fire
-- even when no browser tab is open.
--
-- Prerequisites:
--   1. migration_notifications.sql must already be applied (notifications table).
--   2. pg_cron extension must be enabled on your Supabase project
--      (Dashboard → Database → Extensions → pg_cron).
--
-- To enable scheduling, uncomment the cron.schedule() call at the bottom.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: returns current UTC time as timestamptz (used for comparisons)
-- Shift times are built as (Nepal date + local time) AT TIME ZONE 'Asia/Kathmandu'
-- which converts correctly to UTC — so we compare everything in UTC.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nepal_now()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT now();
$$;

-- ---------------------------------------------------------------------------
-- Helper: get today's date in Nepal timezone (UTC+05:45)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.nepal_today()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Kathmandu')::date;
$$;

-- ---------------------------------------------------------------------------
-- Core function: evaluate_scheduled_reminders
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_scheduled_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org            RECORD;
  v_emp            RECORD;
  v_event          RECORD;
  v_today          date        := public.nepal_today();
  v_now            timestamptz := now();  -- plain UTC, compared against UTC shift times
  v_dow            int;
  v_is_holiday     bool;
  v_has_leave      bool;
  v_has_clockin    bool;
  v_has_worklog    bool;
  v_start_mins     int;
  v_grace_mins     int;
  v_end_mins       int;
  v_shift_start    timestamptz;
  v_grace_cutoff   timestamptz;
  v_shift_end      timestamptz;
  v_event_ts       timestamptz;
  v_mins_until     int;
  v_reminder_key   text;
  v_date_str       text := v_today::text;
  v_now_time       time := (now() AT TIME ZONE 'Asia/Kathmandu')::time;
BEGIN
  v_dow := EXTRACT(DOW FROM v_today)::int;

  -- Skip Saturday (6 = Saturday, weekly holiday)
  IF v_dow = 6 THEN
    RETURN;
  END IF;

  -- Quiet hours guard: Do NOT evaluate or send any reminders during night hours (9:00 PM to 7:00 AM Nepal time).
  -- Strictly ensures that no reminders of any kind are triggered at midnight (00:00) or while employees are asleep.
  IF v_now_time < time '07:00' OR v_now_time >= time '21:00' THEN
    RETURN;
  END IF;

  FOR v_org IN
    SELECT
      id,
      office_hours,
      -- startTime is stored as "HH:MM" string e.g. "14:00"
      COALESCE(
        SPLIT_PART(office_hours->>'startTime', ':', 1)::int * 60
        + SPLIT_PART(office_hours->>'startTime', ':', 2)::int,
        600  -- default 10:00 AM
      ) AS start_mins,
      -- graceMinutes stored as camelCase integer
      COALESCE((office_hours->>'graceMinutes')::int, 30) AS grace_mins,
      -- no explicit endTime — derive from startTime + workDayHours
      COALESCE(
        SPLIT_PART(office_hours->>'startTime', ':', 1)::int * 60
        + SPLIT_PART(office_hours->>'startTime', ':', 2)::int
        + (office_hours->>'workDayHours')::int * 60,
        1020  -- default 5:00 PM
      ) AS end_mins
    FROM organizations
  LOOP
    v_start_mins := v_org.start_mins;
    v_grace_mins := v_org.grace_mins;
    v_end_mins   := v_org.end_mins;

    v_shift_start  := (v_today + make_time(v_start_mins / 60, v_start_mins % 60, 0)) AT TIME ZONE 'Asia/Kathmandu';
    v_grace_cutoff := v_shift_start + (v_grace_mins || ' minutes')::interval;
    v_shift_end    := (v_today + make_time(v_end_mins / 60, v_end_mins % 60, 0)) AT TIME ZONE 'Asia/Kathmandu';

    -- Skip public holidays
    SELECT EXISTS (
      SELECT 1 FROM holidays WHERE org_id = v_org.id AND date = v_today
    ) INTO v_is_holiday;

    IF v_is_holiday THEN
      CONTINUE;
    END IF;

    -- -----------------------------------------------------------------------
    -- Attendance reminders
    -- -----------------------------------------------------------------------
    FOR v_emp IN
      SELECT p.id AS user_id FROM profiles p
      WHERE p.org_id = v_org.id AND p.role = 'employee' AND p.is_active = true
    LOOP
      SELECT EXISTS (
        SELECT 1 FROM leave_requests
        WHERE employee_id = v_emp.user_id AND status = 'Approved'
          AND start_date <= v_today AND end_date >= v_today
      ) INTO v_has_leave;
      CONTINUE WHEN v_has_leave;

      SELECT EXISTS (
        SELECT 1 FROM attendance
        WHERE employee_id = v_emp.user_id AND date = v_today AND clock_in IS NOT NULL
      ) INTO v_has_clockin;

      -- -----------------------------------------------------------------------
      -- Reminder 1: Clock-In (within grace period only)
      -- Fires: shift_start → grace_cutoff
      -- Semantic: "You can still clock in on time."
      -- Dedup key ensures it fires only once even if pg_cron hits multiple times.
      -- -----------------------------------------------------------------------
      IF NOT v_has_clockin
         AND v_now >= v_shift_start
         AND v_now <= v_grace_cutoff
      THEN
        INSERT INTO notifications (org_id, recipient_id, actor_id, type, title, message, metadata)
        VALUES (v_org.id, v_emp.user_id, v_emp.user_id, 'attendance_reminder',
                'Time to Clock In', 'Your shift has started. Please clock in.',
                jsonb_build_object('date', v_date_str, 'reminderKey', 'shift_start'))
        ON CONFLICT (recipient_id, type, (metadata->>'date'), (metadata->>'reminderKey')) WHERE metadata->>'reminderKey' IS NOT NULL DO NOTHING;
      END IF;

      -- -----------------------------------------------------------------------
      -- Reminder 2: Late / Absent Alert (up to 2 hours after grace cutoff)
      -- Fires: grace_cutoff → grace_cutoff + 2 hours
      -- Semantic: "You're late — may be marked absent."
      -- After 2 hours past grace, notification is no longer useful.
      -- -----------------------------------------------------------------------
      IF NOT v_has_clockin
         AND v_now > v_grace_cutoff
         AND v_now <= v_grace_cutoff + interval '2 hours'
      THEN
        INSERT INTO notifications (org_id, recipient_id, actor_id, type, title, message, metadata)
        VALUES (v_org.id, v_emp.user_id, v_emp.user_id, 'attendance_reminder',
                '⚠️ You Haven''t Clocked In', 'You haven''t clocked in yet. You may be marked late or absent.',
                jsonb_build_object('date', v_date_str, 'reminderKey', 'late_absent_alert'))
        ON CONFLICT (recipient_id, type, (metadata->>'date'), (metadata->>'reminderKey')) WHERE metadata->>'reminderKey' IS NOT NULL DO NOTHING;
      END IF;

      -- -----------------------------------------------------------------------
      -- Reminder 3: Clock-Out (30 min window before shift end)
      -- Fires: shift_end - 30 min → shift_end
      -- -----------------------------------------------------------------------
      -- Reminder 3: Clock-Out (30 min window before shift end)
      -- Fires: shift_end - 30 min → shift_end
      -- Only fires if employee has already clocked in.
      -- -----------------------------------------------------------------------
      IF v_has_clockin
         AND v_now >= v_shift_end - interval '30 minutes'
         AND v_now <= v_shift_end
      THEN
        INSERT INTO notifications (org_id, recipient_id, actor_id, type, title, message, metadata)
        VALUES (v_org.id, v_emp.user_id, v_emp.user_id, 'clockout_reminder',
                'Clock-Out Reminder', 'Your shift ends in 30 minutes. Remember to clock out.',
                jsonb_build_object('date', v_date_str, 'reminderKey', 'shift_end_warning'))
        ON CONFLICT (recipient_id, type, (metadata->>'date'), (metadata->>'reminderKey')) WHERE metadata->>'reminderKey' IS NOT NULL DO NOTHING;
      END IF;

      -- -----------------------------------------------------------------------
      -- Reminder 4: Work Log Reminder (15-30 min window before shift end)
      -- Fires: shift_end - 30 min → shift_end
      -- Only fires if employee clocked in today but hasn't entered a work log
      -- -----------------------------------------------------------------------
      IF v_has_clockin
         AND v_now >= v_shift_end - interval '30 minutes'
         AND v_now <= v_shift_end
      THEN
        SELECT EXISTS (
          SELECT 1 FROM work_logs
          WHERE employee_id = v_emp.user_id
            AND date = v_today
        ) INTO v_has_worklog;

        IF NOT v_has_worklog THEN
          INSERT INTO notifications (org_id, recipient_id, actor_id, type, title, message, link, metadata)
          VALUES (v_org.id, v_emp.user_id, v_emp.user_id, 'worklog_reminder',
                  'Work Log Reminder 📝', 'Don''t forget to submit your daily work log before the day ends.',
                  '/work-logs',
                  jsonb_build_object('date', v_date_str, 'reminderKey', 'work_log_reminder'))
          ON CONFLICT (recipient_id, type, (metadata->>'date'), (metadata->>'reminderKey')) WHERE metadata->>'reminderKey' IS NOT NULL DO NOTHING;
        END IF;
      END IF;
    END LOOP;

    -- -----------------------------------------------------------------------
    -- Event / meeting / deadline reminders
    -- -----------------------------------------------------------------------
    FOR v_event IN
      SELECT e.id, e.title, e.event_type, e.date, e.time, e.all_org, e.created_by, e.created_at,
             array_agg(ea.employee_id) FILTER (WHERE ea.employee_id IS NOT NULL) AS assignees
      FROM events e
      LEFT JOIN event_assignees ea ON ea.event_id = e.id
      WHERE e.org_id = v_org.id AND e.date BETWEEN v_today AND v_today + 1
      GROUP BY e.id
    LOOP
      FOR v_emp IN
        SELECT p.id AS user_id FROM profiles p
        WHERE p.org_id = v_org.id AND p.is_active = true
          AND (v_event.all_org = true OR p.role = 'admin' OR p.id = ANY(v_event.assignees))
      LOOP
        -- 1-day prior (Upcoming event / meeting tomorrow)
        -- Primary: Sends in the morning around 7:00 AM - 8:00 AM Nepal time for pre-scheduled events.
        -- Fallback: Also sends during daytime office hours (until 8:00 PM) if newly scheduled today for tomorrow.
        -- Strictly NEVER fires at midnight or during night/sleep hours.
        IF v_event.date = v_today + 1
           AND (
             (v_now_time >= time '07:00' AND v_now_time <= time '08:00')
             OR (v_event.created_at::date = v_today AND v_now_time >= time '07:00' AND v_now_time < time '20:00')
           )
        THEN
          v_reminder_key := 'event_1day_' || v_event.id::text;
          INSERT INTO notifications (org_id, recipient_id, actor_id, type, title, message, link, metadata)
          VALUES (v_org.id, v_emp.user_id, v_event.created_by, 'event_reminder',
                  'Upcoming ' || initcap(v_event.event_type) || ' Tomorrow',
                  '"' || v_event.title || '" is scheduled for tomorrow.',
                  '/events',
                  jsonb_build_object('date', v_date_str, 'reminderKey', v_reminder_key, 'eventId', v_event.id))
          ON CONFLICT (recipient_id, type, (metadata->>'date'), (metadata->>'reminderKey')) WHERE metadata->>'reminderKey' IS NOT NULL DO NOTHING;
        END IF;

        -- 1–2 hours before (timed events today)
        IF v_event.date = v_today AND v_event.time IS NOT NULL THEN
          v_event_ts   := (v_event.date + v_event.time::time) AT TIME ZONE 'Asia/Kathmandu';
          v_mins_until := EXTRACT(EPOCH FROM (v_event_ts - v_now))::int / 60;
          IF v_mins_until >= 60 AND v_mins_until < 120 THEN
            v_reminder_key := 'event_1h_' || v_event.id::text;
            INSERT INTO notifications (org_id, recipient_id, actor_id, type, title, message, link, metadata)
            VALUES (v_org.id, v_emp.user_id, v_event.created_by, 'event_reminder',
                    initcap(v_event.event_type) || ' Starting Soon',
                    '"' || v_event.title || '" starts in about 1 hour.',
                    '/events',
                    jsonb_build_object('date', v_date_str, 'reminderKey', v_reminder_key, 'eventId', v_event.id))
            ON CONFLICT (recipient_id, type, (metadata->>'date'), (metadata->>'reminderKey')) WHERE metadata->>'reminderKey' IS NOT NULL DO NOTHING;
          END IF;
        END IF;
      END LOOP;
    END LOOP;

  END LOOP; -- organizations
END;
$$;

-- =============================================================================
-- Grants
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.evaluate_scheduled_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION public.nepal_now()                    TO service_role;
GRANT EXECUTE ON FUNCTION public.nepal_today()                  TO service_role;

-- =============================================================================
-- pg_cron schedule (uncomment after enabling pg_cron in Supabase Dashboard)
-- Dashboard -> Database -> Extensions -> search "pg_cron" -> Enable
-- =============================================================================
SELECT cron.schedule(
  'attendance_and_event_reminders',
  '*/15 * * * *',
  'SELECT public.evaluate_scheduled_reminders();'
);

-- To remove later:
-- SELECT cron.unschedule('attendance_and_event_reminders');

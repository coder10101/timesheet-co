import { useEffect, useRef } from "react";
import { useOfficeHours } from "../constants/officeHours";
import { useHolidays } from "./useHolidaysData";
import { todayISO } from "../utils/timezone";
import { sendNotification } from "./useNotificationsData";
import { supabase } from "../lib/supabaseClient";

/**
 * Returns current time in minutes (0 - 1439) in Nepal timezone (Asia/Kathmandu).
 */
export function getNepalCurrentMinutes() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return h * 60 + m;
}

/**
 * Returns whether today is Saturday in Nepal timezone.
 */
export function isNepalSaturday() {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    weekday: "short",
  }).format(new Date());
  return weekday.toLowerCase().startsWith("sat");
}

/**
 * Background reminder engine that dynamically evaluates attendance
 * against dynamic office hours configuration.
 *
 * - When an employee is logged in, it verifies their own attendance directly against Supabase.
 * - When an admin is logged in, it evaluates all active staff in the organization,
 *   ensuring employees who haven't clocked in receive reminders even if they haven't opened the app yet.
 * - Authoritatively queries Supabase to eliminate race conditions and caching mismatches.
 */
export function useAttendanceReminders(me) {
  const userRole = me?.role || "employee";
  const currentUserId = me?.id;
  const orgId = me?.org_id;

  const officeHours = useOfficeHours();
  const { holidays } = useHolidays();
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (!currentUserId) return;

    const checkReminders = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const today = todayISO();
        const currentMins = getNepalCurrentMinutes();

        // 1. Skip on Saturdays (standard weekly holiday in Nepal)
        if (isNepalSaturday()) {
          return;
        }

        // 2. Skip on Public or Company Holidays
        const isHoliday = (holidays || []).some((h) => h.date === today);
        if (isHoliday) {
          return;
        }

        // 3. Determine target employees to evaluate:
        // - Admin evaluates all active regular staff in the organization
        // - Employee evaluates themselves
        let targetEmployees = [];

        if (userRole === "admin") {
          let query = supabase
            .from("profiles")
            .select("id, name, role")
            .eq("role", "employee");

          if (orgId) {
            query = query.eq("org_id", orgId);
          }

          const { data: staffList, error: staffErr } = await query;
          if (staffErr) {
            console.warn("Notice querying staff for reminders:", staffErr.message);
            return;
          }
          targetEmployees = staffList || [];
        } else {
          targetEmployees = [{ id: currentUserId, name: me?.name || "Employee", role: "employee" }];
        }

        if (targetEmployees.length === 0) return;

        const empIds = targetEmployees.map((e) => e.id);

        // 4. Fetch today's approved leaves for target employees
        const { data: approvedLeaves } = await supabase
          .from("leave_requests")
          .select("employee_id")
          .eq("status", "Approved")
          .lte("start_date", today)
          .gte("end_date", today)
          .in("employee_id", empIds);

        const onLeaveEmpIds = new Set((approvedLeaves || []).map((l) => l.employee_id));

        // 5. Authoritatively fetch today's attendance records directly from DB
        const { data: attendanceRecords, error: attErr } = await supabase
          .from("attendance")
          .select("employee_id, clock_in, clock_out")
          .eq("date", today)
          .in("employee_id", empIds);

        if (attErr) {
          console.warn("Notice checking attendance records for reminders:", attErr.message);
          return;
        }

        const attendanceMap = new Map();
        (attendanceRecords || []).forEach((r) => {
          attendanceMap.set(r.employee_id, r);
        });

        // 6. Dynamic schedule thresholds from organization office_hours
        const startMins = officeHours.startTimeMinutes ?? 600; // e.g. 10:00 AM
        const graceEndMins = officeHours.graceMinutesTotal ?? (startMins + 30); // e.g. 10:30 AM
        const graceWarningMins = Math.max(startMins, graceEndMins - 5); // e.g. 10:25 AM
        const lateCheckMins = graceEndMins + 30; // e.g. 11:00 AM

        const endMins = officeHours.endTimeMinutes ?? 1020; // e.g. 5:00 PM
        const overtimeAlertMins = endMins + 30; // e.g. 5:30 PM

        // 7. Evaluate each employee
        for (const emp of targetEmployees) {
          // Skip if on approved leave
          if (onLeaveEmpIds.has(emp.id)) {
            continue;
          }

          const record = attendanceMap.get(emp.id);
          const hasClockedIn = Boolean(record?.clock_in);
          const hasClockedOut = Boolean(record?.clock_out);

          let reminderToSend = null;

          // --- CLOCK-IN REMINDERS (If employee has NOT clocked in) ---
          if (!hasClockedIn) {
            // A. Shift Start Reminder (e.g. 10:00 AM - 10:24 AM)
            if (currentMins >= startMins && currentMins < graceWarningMins) {
              reminderToSend = {
                type: "clockin_reminder",
                reminderKey: "shift_start",
                title: "Shift Started · Clock In Reminder",
                message: `Good morning! Work day has begun (${officeHours.startTimeAmPm || "10:00 AM"}). Don't forget to clock in.`,
                link: "/attendance",
              };
            }
            // B. Grace Period Warning (e.g. 10:25 AM - 10:35 AM)
            else if (currentMins >= graceWarningMins && currentMins < graceEndMins + 5) {
              reminderToSend = {
                type: "clockin_reminder",
                reminderKey: "grace_warning",
                title: "Grace Period Ending Soon ⚠️",
                message: `Grace period ends at ${officeHours.graceCutoffAmPm || "10:30 AM"}. Clock in now to avoid being marked late!`,
                link: "/attendance",
              };
            }
            // C. Absence / Late Alert (e.g. 11:00 AM until shift end)
            else if (currentMins >= lateCheckMins && currentMins < endMins) {
              reminderToSend = {
                type: "clockin_reminder",
                reminderKey: "absence_check",
                title: "Missing Clock-In Alert",
                message: "You have not clocked in today. If you are taking leave or working off-site, please submit a request.",
                link: "/attendance",
              };
            }
          }

          // --- CLOCK-OUT REMINDERS (If clocked in, but NOT yet clocked out) ---
          if (hasClockedIn && !hasClockedOut) {
            // D. Shift End Wrap-Up (e.g. 5:00 PM - 5:29 PM)
            if (currentMins >= endMins && currentMins < overtimeAlertMins) {
              reminderToSend = {
                type: "clockout_reminder",
                reminderKey: "shift_end",
                title: "Work Day Complete · Clock Out Reminder",
                message: `Shift ended at ${officeHours.endTimeAmPm || "5:00 PM"}. Don't forget to submit your daily work log and clock out.`,
                link: "/attendance",
              };
            }
            // E. Active Timer Warning (e.g. 5:30 PM onwards)
            else if (currentMins >= overtimeAlertMins) {
              reminderToSend = {
                type: "clockout_reminder",
                reminderKey: "overtime_warning",
                title: "Active Timer Running ⏱️",
                message: "You are still clocked in. Please clock out to ensure your work hours are recorded accurately.",
                link: "/attendance",
              };
            }
          }

          if (!reminderToSend) continue;

          // Deduplication: Verify with database so each reminder key fires at most once per day
          const storageKey = `att_rem_${emp.id}_${today}_${reminderToSend.reminderKey}`;
          try {
            if (localStorage.getItem(storageKey)) continue;
          } catch (_) {}

          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("recipient_id", emp.id)
            .eq("type", reminderToSend.type)
            .filter("metadata->>reminderKey", "eq", reminderToSend.reminderKey)
            .filter("metadata->>date", "eq", today)
            .limit(1);

          if (existingNotif && existingNotif.length > 0) {
            try {
              localStorage.setItem(storageKey, "1");
            } catch (_) {}
            continue;
          }

          // Dispatch reminder strictly to the unclocked employee
          await sendNotification({
            recipientId: emp.id,
            orgId,
            type: reminderToSend.type,
            title: reminderToSend.title,
            message: reminderToSend.message,
            link: reminderToSend.link,
            metadata: {
              reminderKey: reminderToSend.reminderKey,
              date: today,
            },
          });

          try {
            localStorage.setItem(storageKey, "1");
          } catch (_) {}
        }
      } catch (err) {
        console.warn("Notice checking attendance reminders:", err);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Run check immediately on mount or dependencies update
    checkReminders();

    // Check periodically every 60 seconds
    const interval = setInterval(checkReminders, 60 * 1000);
    return () => clearInterval(interval);
  }, [
    userRole,
    currentUserId,
    orgId,
    officeHours,
    holidays,
    me?.name,
  ]);
}

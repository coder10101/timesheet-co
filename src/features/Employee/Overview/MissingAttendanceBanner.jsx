import { useState, useMemo } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";
import { getWeekDates } from "../../../utils/workTime";
import { isoToBS, NEPALI_MONTHS, WEEKDAY_LABELS } from "../../../utils/nepaliCalendar";
import { getWeekday } from "../../../utils/attendance";

export function MissingAttendanceBanner({
  records,
  leaveRequests,
  holidays,
  today,
  me,
  onLogDate,
}) {
  const [dismissedDates, setDismissedDates] = useState(new Set());

  const weekDates = useMemo(() => {
    return getWeekDates(today);
  }, [today]);

  const loggedDates = useMemo(() => {
    return new Set(
      (records || [])
        .filter((record) => record.clock_in)
        .map((record) => record.date),
    );
  }, [records]);

  const holidayMap = useMemo(() => {
    const map = new Map();
    (holidays || []).forEach((h) => {
      if (h?.date) map.set(h.date, h.name);
    });
    return map;
  }, [holidays]);

  const leaveDates = useMemo(() => {
    const dates = new Set();
    (leaveRequests || [])
      .filter((request) => request.status === "Approved")
      .forEach((request) => {
        const [sy, sm, sd] = request.start_date.split("-").map(Number);
        const [ey, em, ed] = request.end_date.split("-").map(Number);
        const start = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);

        const current = new Date(start);
        while (current <= end) {
          const y = current.getFullYear();
          const m = String(current.getMonth() + 1).padStart(2, "0");
          const d = String(current.getDate()).padStart(2, "0");
          dates.add(`${y}-${m}-${d}`);
          current.setDate(current.getDate() + 1);
        }
      });
    return dates;
  }, [leaveRequests]);

  // Find unlogged past workdays in the current week
  const missingDates = useMemo(() => {
    return weekDates.filter((date) => {
      if (date >= today) return false;

      // Exclude Saturdays
      const [y, m, dt] = date.split("-").map(Number);
      const isSat = new Date(y, m - 1, dt).getDay() === 6;
      if (isSat) return false;

      // Exclude public holidays
      if (holidayMap.has(date)) return false;

      // Exclude approved leaves
      if (leaveDates.has(date)) return false;

      // Exclude already logged attendance
      if (loggedDates.has(date)) return false;

      // Exclude dismissed in this session
      if (dismissedDates.has(date)) return false;

      // Exclude dismissed in localStorage
      try {
        const isDismissed = localStorage.getItem(
          `dismissed_missing_attendance_${me?.id}_${date}`,
        );
        if (isDismissed) return false;
      } catch (_) {}

      return true;
    });
  }, [
    weekDates,
    today,
    holidayMap,
    leaveDates,
    loggedDates,
    dismissedDates,
    me?.id,
  ]);

  if (missingDates.length === 0) {
    return null;
  }

  const primaryMissingDate = missingDates[0];
  const bs = isoToBS(primaryMissingDate);
  const weekday = getWeekday(primaryMissingDate);
  const weekdayName = WEEKDAY_LABELS[weekday] || "";
  const dateFormatted = bs
    ? `${weekdayName} (${bs.day} ${NEPALI_MONTHS[bs.month - 1]})`
    : `${weekdayName} (${primaryMissingDate})`;

  const handleDismissDate = (date) => {
    try {
      localStorage.setItem(
        `dismissed_missing_attendance_${me?.id}_${date}`,
        "true",
      );
    } catch (_) {}
    setDismissedDates((prev) => new Set([...prev, date]));
  };

  return (
    <div className="mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 sm:p-4 text-text fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-amber-900">
              {missingDates.length === 1
                ? "1 Missing Attendance Day This Week"
                : `${missingDates.length} Missing Attendance Days This Week`}
            </h4>
            <p className="text-[11px] sm:text-xs text-amber-800/90 mt-0.5">
              <span className="font-semibold text-amber-950">{dateFormatted}</span>{" "}
              has no clock-in or clock-out. Did you work this day?
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => handleDismissDate(primaryMissingDate)}
            className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white/80 hover:bg-white text-amber-900 text-xs font-semibold cursor-pointer shadow-2xs transition-all"
            title="Mark as absent or dismiss reminder"
          >
            I was Absent / Dismiss
          </button>

          <button
            type="button"
            onClick={() => onLogDate(primaryMissingDate)}
            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-dark active:scale-98 text-white text-xs font-bold cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>Log Attendance</span>
          </button>
        </div>
      </div>
    </div>
  );
}

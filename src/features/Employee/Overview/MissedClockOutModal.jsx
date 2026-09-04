import { useState, useMemo } from "react";
import { X, Clock, AlertCircle } from "lucide-react";
import { fmtTime } from "../../../utils/workTime";
import { isoToBS, NEPALI_MONTHS } from "../../../utils/nepaliCalendar";

export function MissedClockOutModal({ records, today, me, updateAttendance }) {
  const [closedDate, setClosedDate] = useState(null);
  const [time, setTime] = useState("18:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Identify the most recent unclosed shift in the past (up to 7 days ago)
  const unclosedRecord = useMemo(() => {
    if (!records || !today) return null;

    const pastUnclosed = records
      .filter((r) => r.date < today && r.clock_in && !r.clock_out)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (pastUnclosed.length === 0) return null;
    const latest = pastUnclosed[0];

    // Don't show if user closed it in current session
    if (closedDate === latest.date) return null;

    // Only prompt for records within the last 7 days
    const diffDays = Math.round(
      (new Date(`${today}T00:00:00`).getTime() -
        new Date(`${latest.date}T00:00:00`).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (diffDays > 7) return null;

    // Check if dismissed in localStorage
    try {
      const isDismissed = localStorage.getItem(
        `dismissed_missed_clockout_${me?.id}_${latest.date}`,
      );
      if (isDismissed) return null;
    } catch (_) {}

    return latest;
  }, [records, today, me?.id, closedDate]);

  if (!unclosedRecord) {
    return null;
  }

  // Determine if it was yesterday or earlier
  const yesterday = new Date(`${today}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().slice(0, 10);
  const isYesterday = unclosedRecord.date === yesterdayISO;

  const bs = isoToBS(unclosedRecord.date);
  const dateLabel = bs
    ? `${bs.day} ${NEPALI_MONTHS[bs.month - 1]}`
    : unclosedRecord.date;

  const clockInFmt = fmtTime(unclosedRecord.clock_in);

  const handleDismiss = () => {
    try {
      localStorage.setItem(
        `dismissed_missed_clockout_${me?.id}_${unclosedRecord.date}`,
        "true",
      );
    } catch (_) {}
    setClosedDate(unclosedRecord.date);
  };

  const handleKeepDefault = async () => {
    setSaving(true);
    setError("");
    try {
      const defaultClockOut = `${unclosedRecord.date}T18:00`;
      if (updateAttendance) {
        await updateAttendance({
          attendanceId: unclosedRecord.id,
          date: unclosedRecord.date,
          clockIn: unclosedRecord.clock_in,
          clockOut: defaultClockOut,
          breakMinutes: unclosedRecord.break_minutes || 0,
        });
      }
    } catch (_) {
      // If error occurs, still permit dismissal so employee is not blocked
    } finally {
      handleDismiss();
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!time) {
      setError("Please select a clock-out time.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const customClockOut = `${unclosedRecord.date}T${time}`;
      if (updateAttendance) {
        await updateAttendance({
          attendanceId: unclosedRecord.id,
          date: unclosedRecord.date,
          clockIn: unclosedRecord.clock_in,
          clockOut: customClockOut,
          breakMinutes: unclosedRecord.break_minutes || 0,
        });
      }
      handleDismiss();
    } catch (err) {
      setError(err.message || "Failed to save clock-out time.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden fade-in">
        {/* MODAL HEADER */}
        <div className="px-5 pt-4 pb-3.5 border-b border-border-light flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                {isYesterday
                  ? "Forgot to Clock Out Yesterday?"
                  : "Forgot to Clock Out?"}
              </h3>
              <p className="text-[11px] text-text-muted">
                {isYesterday ? "Shift from yesterday" : `Shift on ${dateLabel}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 space-y-4">
          <div className="text-xs text-text-muted space-y-1">
            <p>
              You clocked in at{" "}
              <span className="font-mono font-semibold text-text">
                {clockInFmt}
              </span>{" "}
              {isYesterday ? "yesterday" : `on ${dateLabel}`}, but didn't clock
              out.
            </p>
            <p className="font-medium text-text">What time did you leave?</p>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-alert-light text-alert text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <label className="text-xs font-semibold text-text whitespace-nowrap">
              Enter time:
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-36 px-3 py-1.5 text-xs font-mono font-semibold text-text bg-surface-muted/60 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
            />
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 bg-surface-muted/40 border-t border-border-light flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleKeepDefault}
            disabled={saving}
            className="px-3.5 py-2 rounded-xl border border-border bg-white hover:bg-surface text-text-muted hover:text-text text-xs font-semibold cursor-pointer shadow-2xs transition-all disabled:opacity-50"
          >
            Keep 06:00 PM (Default)
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark active:scale-98 text-white text-xs font-bold cursor-pointer shadow-xs transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Clock-Out Time"}
          </button>
        </div>
      </div>
    </div>
  );
}

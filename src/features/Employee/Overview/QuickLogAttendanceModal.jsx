import { useState } from "react";
import { X, Clock, Calendar, AlertCircle } from "lucide-react";
import { isoToBS, NEPALI_MONTHS, WEEKDAY_LABELS } from "../../../utils/nepaliCalendar";
import { getWeekday } from "../../../utils/attendance";
import { useOfficeHours } from "../../../constants/officeHours";

export function QuickLogAttendanceModal({
  date,
  onClose,
  onSave,
  saving,
  error,
  setError,
}) {
  const officeHours = useOfficeHours();
  const [clockIn, setClockIn] = useState(officeHours.startTime);
  const [clockOut, setClockOut] = useState(officeHours.endTime);
  const [breakMinutes, setBreakMinutes] = useState(0);

  if (!date) return null;

  const bs = isoToBS(date);
  const weekday = getWeekday(date);
  const dateLabel = bs
    ? `${bs.day} ${NEPALI_MONTHS[bs.month - 1]}, ${bs.year}`
    : date;
  const weekdayLabel = WEEKDAY_LABELS[weekday] || "";

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!clockIn) {
      setError("Clock-in time is required.");
      return;
    }
    if (clockOut && clockIn >= clockOut) {
      setError("Clock-out must be after clock-in.");
      return;
    }

    if (setError) setError("");
    await onSave({
      date,
      clockIn,
      clockOut,
      breakMinutes: Number(breakMinutes) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden fade-in">
        {/* MODAL HEADER */}
        <div className="px-5 pt-4 pb-3.5 border-b border-border-light flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-light border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                Log Past Attendance
              </h3>
              <p className="text-[11px] text-text-muted">
                {weekdayLabel} · {dateLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleFormSubmit}>
          <div className="p-5 space-y-4">
            <p className="text-xs text-text-muted">
              Add your attendance hours for{" "}
              <span className="font-semibold text-text">
                {weekdayLabel}, {dateLabel}
              </span>
              . Standard {officeHours.workDayHours}-hour workday ({officeHours.startTimeAmPm} – {officeHours.endTimeAmPm}) is pre-filled.
            </p>

            {error && (
              <div className="p-2.5 rounded-lg bg-alert-light text-alert text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Clock In
                </label>
                <input
                  type="time"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs font-mono font-semibold text-text bg-surface-muted/60 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Clock Out
                </label>
                <input
                  type="time"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-semibold text-text bg-surface-muted/60 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="px-5 py-3.5 bg-surface-muted/40 border-t border-border-light flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-2 rounded-xl border border-border bg-white hover:bg-surface text-text-muted hover:text-text text-xs font-semibold cursor-pointer shadow-2xs transition-all disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark active:scale-98 text-white text-xs font-bold cursor-pointer shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

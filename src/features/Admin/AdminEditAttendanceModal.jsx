import { useState, useEffect } from "react";
import { X, Clock, Calendar, AlertCircle, CheckCircle2, Coffee, User } from "lucide-react";
import { toNepalTimeString } from "../../utils/timezone";
import { isoToBS, NEPALI_MONTHS } from "../../utils/nepaliCalendar";

export function AdminEditAttendanceModal({
  isOpen,
  onClose,
  record,
  employee,
  onSave,
  officeHours,
}) {
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (record) {
      setClockIn(record.clock_in ? toNepalTimeString(record.clock_in) : (officeHours?.startTime || "10:00"));
      setClockOut(record.clock_out ? toNepalTimeString(record.clock_out) : "");
      setBreakMinutes(record.break_minutes || 0);
      setReason("");
      setError("");
    }
  }, [record, officeHours]);

  if (!isOpen || !record) return null;

  const bs = isoToBS(record.date);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!clockIn) {
      setError("Clock-in time is required.");
      return;
    }

    if (clockOut && clockIn >= clockOut) {
      setError("Clock-out time must be after clock-in time.");
      return;
    }

    setSaving(true);
    try {
      const clockInVal = `${record.date}T${clockIn}`;
      const clockOutVal = clockOut ? `${record.date}T${clockOut}` : null;

      await onSave({
        attendanceId: record.id?.startsWith("site-") ? undefined : record.id,
        date: record.date,
        clockIn: clockInVal,
        clockOut: clockOutVal,
        breakMinutes: Number(breakMinutes) || 0,
        reason: reason.trim(),
      });
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to save attendance record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-border-light flex items-center justify-between bg-surface-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">Edit Attendance</h3>
              <p className="text-[11px] text-text-muted">
                {employee?.name || "Staff"} · {bs ? `${bs.day} ${NEPALI_MONTHS[bs.month - 1]} ${bs.year}` : record.date}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-text transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-alert-light border border-alert/20 text-alert text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* CLOCK IN & OUT */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
                Clock In
              </label>
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-surface-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
                Clock Out
              </label>
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-surface-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="In progress"
              />
            </div>
          </div>

          {/* PRESETS */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-text-muted">Presets:</span>
            <button
              type="button"
              onClick={() => {
                setClockIn(officeHours?.startTime || "10:00");
                setClockOut(officeHours?.endTime || "18:00");
              }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-muted hover:bg-surface-muted/80 text-text-muted border border-border-light cursor-pointer"
            >
              Standard ({officeHours?.startTimeAmPm || "10:00 AM"} – {officeHours?.endTimeAmPm || "6:00 PM"})
            </button>
            {clockOut && (
              <button
                type="button"
                onClick={() => setClockOut("")}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-500/20 cursor-pointer"
              >
                Clear Clock-Out
              </button>
            )}
          </div>

          {/* BREAK MINUTES */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Personal Break (Minutes)
              </label>
              <span className="text-xs font-mono font-bold text-text">
                {breakMinutes}m
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 15, 30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setBreakMinutes(mins)}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    breakMinutes === mins
                      ? "bg-amber-500 text-slate-950 border-amber-500 shadow-2xs font-bold"
                      : "bg-surface-muted hover:bg-surface-muted/80 text-text-muted border-border-light"
                  }`}
                >
                  {mins === 0 ? "0m" : `${mins}m`}
                </button>
              ))}
            </div>
          </div>

          {/* REASON FOR EDIT */}
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
              Reason for Modification <span className="font-normal text-text-faint">(Audit Log)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Employee forgot to punch in, Manager approval..."
              className="w-full text-xs px-3 py-2 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-text-faint"
            />
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-light">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-text hover:bg-surface-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

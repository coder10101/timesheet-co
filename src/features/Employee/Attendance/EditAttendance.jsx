import { useMemo } from "react";
import {
  Clock,
  Clock9,
  Clock10,
  Clock12,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { NEPALI_MONTHS, WEEKDAY_LABELS } from "../../../utils/nepaliCalendar";
import {
  formatDuration,
  LUNCH_MINUTES,
  WORK_DAY_MINUTES,
} from "../../../utils/workTime";
import { formatDifference, getWeekday } from "../../../utils/attendance";

export default function AttendanceEditForm({
  editing,
  saving,
  error,
  setEditing,
  onSave,
  onCancel,
}) {
  if (!editing) {
    return null;
  }

  // Calculate live preview metrics based on current input values
  const preview = useMemo(() => {
    if (!editing.clockIn) {
      return null;
    }

    const [inH, inM] = editing.clockIn.split(":").map(Number);
    const inTotalMins = inH * 60 + inM;

    let punctuality = "on_time";
    if (inTotalMins < 10 * 60) {
      punctuality = "early";
    } else if (inTotalMins > 10 * 60 + 30) {
      punctuality = "late";
    }

    if (!editing.clockOut) {
      return {
        hasClockOut: false,
        punctuality,
        inTimeLabel: editing.clockIn,
      };
    }

    const [outH, outM] = editing.clockOut.split(":").map(Number);
    const outTotalMins = outH * 60 + outM;

    if (outTotalMins <= inTotalMins) {
      return {
        invalid: true,
        error: "Clock-out time must be after clock-in time.",
      };
    }

    const elapsedMins = outTotalMins - inTotalMins;
    const workedMins = Math.max(0, elapsedMins - LUNCH_MINUTES);
    const diffMins = workedMins - WORK_DAY_MINUTES;

    let statusType = "normal";
    if (diffMins > 15) {
      statusType = "overtime";
    } else if (diffMins < -15) {
      statusType = "undertime";
    }

    return {
      hasClockOut: true,
      invalid: false,
      punctuality,
      elapsedMins,
      workedMins,
      diffMins,
      statusType,
    };
  }, [editing.clockIn, editing.clockOut]);

  const weekday = editing.date ? getWeekday(editing.date) : null;
  const monthName =
    editing.bsMonth && NEPALI_MONTHS[editing.bsMonth - 1]
      ? NEPALI_MONTHS[editing.bsMonth - 1]
      : "";

  const handleApplyPreset = (inTime, outTime) => {
    setEditing((current) => ({
      ...current,
      clockIn: inTime,
      clockOut: outTime,
    }));
  };

  return (
    <div className="p-4 sm:p-5 bg-surface-muted/80 border-b border-border-light rounded-lg transition-all">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text text-sm sm:text-base">
              {editing.isNew ? "Log Attendance" : "Edit Attendance"}
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-primary-light text-primary font-semibold">
              {editing.date}
            </span>
          </div>

          <div className="text-xs text-text-muted mt-0.5 font-medium">
            {editing.bsDay && `${editing.bsDay} `}
            {monthName} {editing.bsYear}{" "}
            {weekday !== null && (
              <span className="text-text-faint">
                · {WEEKDAY_LABELS[weekday]}
              </span>
            )}
          </div>
        </div>

        {/* QUICK PRESETS */}
        <div className="flex items-center gap-2">
          {editing.clockOut ? (
            <button
              type="button"
              onClick={() => handleApplyPreset(editing.clockIn, "")}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-white border border-border hover:border-alert/50 text-text-muted hover:text-alert transition-all shadow-2xs"
              title="Leave clock-out empty if shift is still in progress"
            >
              Clear clock-out (still working)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleApplyPreset(editing.clockIn || "10:00", "19:00")}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-white border border-border hover:border-primary/50 text-text-muted hover:text-primary transition-all shadow-2xs"
              title="Set standard shift 10:00 AM to 7:00 PM (8h worked + 1h lunch)"
            >
              <Sparkles size={11} className="text-primary" />
              Standard Shift (10–19)
            </button>
          )}
        </div>
      </div>

      {/* TIME INPUTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="block">
          <span className="text-xs font-semibold text-text flex items-center justify-between">
            <span>Clock In Time</span>
            <span className="text-[10px] font-normal text-text-muted">
              (Standard ~10:00 AM)
            </span>
          </span>
          <input
            type="time"
            value={editing.clockIn || ""}
            onChange={(e) =>
              setEditing((current) => ({
                ...current,
                clockIn: e.target.value,
              }))
            }
            className="mt-1.5 w-full border border-border rounded-lg px-3 py-2 text-sm font-mono bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-text flex items-center justify-between">
            <span>Clock Out Time</span>
            <span className="text-[10px] font-normal text-text-muted">
              {!editing.clockOut
                ? "(Optional — leave empty if still on shift)"
                : "(Standard ~07:00 PM)"}
            </span>
          </span>
          <input
            type="time"
            value={editing.clockOut || ""}
            onChange={(e) =>
              setEditing((current) => ({
                ...current,
                clockOut: e.target.value,
              }))
            }
            className="mt-1.5 w-full border border-border rounded-lg px-3 py-2 text-sm font-mono bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </label>
      </div>

      {/* LIVE SHIFT CALCULATION PREVIEW */}
      {preview && (
        <div className="mb-4 p-3 rounded-xl bg-white border border-border-light shadow-2xs">
          <div className="text-[11px] uppercase font-bold text-text-muted tracking-wider mb-2 flex items-center gap-1.5">
            <Clock size={12} className="text-primary" />
            Shift Calculation Preview
          </div>

          {preview.invalid ? (
            <div className="text-xs text-alert font-medium flex items-center gap-1.5">
              <AlertCircle size={14} />
              {preview.error}
            </div>
          ) : preview.hasClockOut ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-surface-muted/50 border border-border-light">
                <span className="text-[10px] text-text-muted block">
                  Gross Elapsed
                </span>
                <span className="font-mono font-semibold text-text">
                  {formatDuration(preview.elapsedMins)}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-surface-muted/50 border border-border-light">
                <span className="text-[10px] text-text-muted block">
                  Lunch Deducted
                </span>
                <span className="font-mono font-semibold text-text-muted">
                  -1h 00m
                </span>
              </div>

              <div className="p-2 rounded-lg bg-surface-muted/50 border border-border-light">
                <span className="text-[10px] text-text-muted block">
                  Net Worked
                </span>
                <span className="font-mono font-bold text-text">
                  {formatDuration(preview.workedMins)}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-surface-muted/50 border border-border-light flex flex-col justify-center">
                <span className="text-[10px] text-text-muted block">
                  Shift Status
                </span>
                {preview.statusType === "overtime" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-overtime">
                    <TrendingUp size={12} />+{formatDifference(preview.diffMins)}{" "}
                    OT
                  </span>
                )}
                {preview.statusType === "undertime" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-alert">
                    <TrendingDown size={12} />-
                    {formatDifference(Math.abs(preview.diffMins))} Under
                  </span>
                )}
                {preview.statusType === "normal" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-primary">
                    <CheckCircle2 size={12} />
                    Standard 8h
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-text-muted italic">
              Clock-in set to {preview.inTimeLabel}. Shift in progress (no
              clock-out set).
            </div>
          )}

          {/* Punctuality tag */}
          {preview.punctuality && (
            <div className="mt-2 pt-2 border-t border-border-light flex items-center gap-2 text-xs">
              <span className="text-text-muted text-[11px]">Punctuality:</span>
              {preview.punctuality === "on_time" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success bg-success-light px-2 py-0.5 rounded">
                  <Clock10 size={11} /> On time (10:00 – 10:30 AM)
                </span>
              )}
              {preview.punctuality === "late" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning bg-warning-light px-2 py-0.5 rounded">
                  <Clock12 size={11} /> Late (After 10:30 AM)
                </span>
              )}
              {preview.punctuality === "early" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary-light px-2 py-0.5 rounded">
                  <Clock9 size={11} /> Early (Before 10:00 AM)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* INLINE ERROR DISPLAY */}
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-alert-light border border-alert/20 text-alert text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ACTIONS */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || preview?.invalid}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:active:scale-100 flex items-center gap-1.5 shadow-2xs"
        >
          {saving ? (
            <>
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save changes</span>
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-3.5 py-2 rounded-lg border border-border text-xs font-medium text-text hover:bg-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}


import { useState, useEffect } from "react";
import { X, Clock, Check, AlertCircle, Sparkles, Building2 } from "lucide-react";
import {
  useOfficeHours,
  computeOfficeSchedule,
  DEFAULT_OFFICE_CONFIG,
} from "../../constants/officeHours";
import { useOrganization } from "../../hooks/useOrgData";

export function EditOfficeHoursModal({ isOpen, onClose, orgId }) {
  const currentOfficeHours = useOfficeHours();
  const { updateOfficeHours } = useOrganization(orgId);

  const [workDayHours, setWorkDayHours] = useState(
    currentOfficeHours.workDayHours ?? 7,
  );
  const [startTime, setStartTime] = useState(
    currentOfficeHours.startTime ?? "10:00",
  );
  const [graceMinutes, setGraceMinutes] = useState(
    currentOfficeHours.graceMinutes ?? 30,
  );
  const [includeLunch, setIncludeLunch] = useState(
    currentOfficeHours.includeLunch ?? true,
  );
  const [lunchMinutes, setLunchMinutes] = useState(
    currentOfficeHours.lunchMinutes ?? 0,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Sync state whenever modal opens or current schedule changes
  useEffect(() => {
    if (isOpen) {
      setWorkDayHours(currentOfficeHours.workDayHours ?? 7);
      setStartTime(currentOfficeHours.startTime ?? "10:00");
      setGraceMinutes(currentOfficeHours.graceMinutes ?? 30);
      setIncludeLunch(currentOfficeHours.includeLunch ?? true);
      setLunchMinutes(currentOfficeHours.lunchMinutes ?? 0);
      setError("");
      setSuccess(false);
    }
  }, [isOpen, currentOfficeHours]);

  if (!isOpen) return null;

  // Live schedule preview calculation
  const previewSchedule = computeOfficeSchedule({
    workDayHours: Number(workDayHours) || 7,
    startTime: startTime || "10:00",
    graceMinutes: Number(graceMinutes) || 0,
    includeLunch: Boolean(includeLunch),
    lunchMinutes: Number(lunchMinutes) || 0,
  });

  const applyPreset = (preset) => {
    setWorkDayHours(preset.workDayHours);
    setStartTime(preset.startTime);
    setGraceMinutes(preset.graceMinutes);
    setIncludeLunch(preset.includeLunch);
    setLunchMinutes(preset.lunchMinutes);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload = {
        workDayHours: Number(workDayHours),
        startTime: startTime.trim(),
        graceMinutes: Number(graceMinutes),
        includeLunch: Boolean(includeLunch),
        lunchMinutes: Number(lunchMinutes),
      };

      await updateOfficeHours(payload);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error("Failed to update office hours:", err);
      if (err.message?.includes("column") || err.code === "42703") {
        setError(
          "Supabase migration pending: Please add the 'office_hours' column to the 'organizations' table using the provided SQL script.",
        );
      } else {
        setError(err.message || "Failed to update office hours.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-border overflow-hidden">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                Organization Office Hours
              </h3>
              <p className="text-[11px] text-text-muted">
                Configure shift schedules, work day targets, and grace periods
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-alert-light border border-alert/20 text-alert text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-success-light border border-success/20 text-success text-xs flex items-center gap-2">
              <Check size={15} className="shrink-0" />
              <span>Office hours updated successfully!</span>
            </div>
          )}

          {/* QUICK PRESETS */}
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
              Quick Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    workDayHours: 7,
                    startTime: "10:00",
                    graceMinutes: 30,
                    includeLunch: true,
                    lunchMinutes: 0,
                  })
                }
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold text-center transition-all cursor-pointer ${
                  workDayHours === 7 && startTime === "10:00"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-surface hover:bg-surface-muted text-text border-border"
                }`}
              >
                7h (10 AM – 5 PM)
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    workDayHours: 8,
                    startTime: "10:00",
                    graceMinutes: 30,
                    includeLunch: true,
                    lunchMinutes: 0,
                  })
                }
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold text-center transition-all cursor-pointer ${
                  workDayHours === 8 && startTime === "10:00"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-surface hover:bg-surface-muted text-text border-border"
                }`}
              >
                8h (10 AM – 6 PM)
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    workDayHours: 8,
                    startTime: "09:00",
                    graceMinutes: 30,
                    includeLunch: true,
                    lunchMinutes: 0,
                  })
                }
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold text-center transition-all cursor-pointer ${
                  workDayHours === 8 && startTime === "09:00"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-surface hover:bg-surface-muted text-text border-border"
                }`}
              >
                8h (9 AM – 5 PM)
              </button>
            </div>
          </div>

          {/* INPUT FORM FIELDS */}
          <div className="grid grid-cols-2 gap-3">
            {/* WORK DAY HOURS */}
            <div>
              <label className="text-xs font-semibold text-text block mb-1">
                Work Hours per Day
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="4"
                  max="14"
                  step="0.5"
                  value={workDayHours}
                  onChange={(e) => setWorkDayHours(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold text-text bg-surface-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
                <span className="text-xs text-text-muted font-medium">hrs</span>
              </div>
            </div>

            {/* SHIFT START TIME */}
            <div>
              <label className="text-xs font-semibold text-text block mb-1">
                Office Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono font-semibold text-text bg-surface-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* GRACE PERIOD */}
            <div>
              <label className="text-xs font-semibold text-text block mb-1">
                Arrival Grace Period
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="120"
                  step="5"
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold text-text bg-surface-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
                <span className="text-xs text-text-muted font-medium">mins</span>
              </div>
            </div>

            {/* LUNCH INCLUSION */}
            <div>
              <label className="text-xs font-semibold text-text block mb-1">
                Lunch Break Policy
              </label>
              <label className="flex items-center gap-2 p-1.5 rounded-xl border border-border bg-surface-muted/30 cursor-pointer text-xs font-medium text-text mt-0.5">
                <input
                  type="checkbox"
                  checked={includeLunch}
                  onChange={(e) => setIncludeLunch(e.target.checked)}
                  className="rounded text-primary focus:ring-primary cursor-pointer"
                />
                <span>Include lunch in hours</span>
              </label>
            </div>
          </div>

          {/* LIVE SCHEDULE PREVIEW CARD */}
          <div className="p-3 rounded-xl bg-primary-light/30 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-primary">
              <span className="flex items-center gap-1.5">
                <Sparkles size={13} />
                Calculated Schedule Summary
              </span>
              <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-primary/20 shadow-2xs">
                {previewSchedule.shiftLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-text">
              <div className="bg-white/80 p-2 rounded-lg border border-border-light space-y-0.5">
                <div className="text-text-muted">Daily Target</div>
                <div className="font-semibold">
                  {previewSchedule.workDayHours}h ({previewSchedule.workDayMinutes}m)
                </div>
              </div>

              <div className="bg-white/80 p-2 rounded-lg border border-border-light space-y-0.5">
                <div className="text-text-muted">Half-Day Target</div>
                <div className="font-semibold">
                  {previewSchedule.halfDayMinutes / 60}h ({previewSchedule.halfDayMinutes}m)
                </div>
              </div>

              <div className="bg-white/80 p-2 rounded-lg border border-border-light space-y-0.5 col-span-2">
                <div className="text-text-muted">Punctuality Rule</div>
                <div className="font-semibold">
                  On-Time: before {previewSchedule.graceCutoffAmPm} · Late: after{" "}
                  {previewSchedule.graceCutoffAmPm} ({previewSchedule.graceMinutes}m grace)
                </div>
              </div>
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-border-light">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-muted rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || success}
              className="px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover active:scale-98 rounded-xl shadow-xs disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
            >
              {saving ? (
                <>Saving...</>
              ) : success ? (
                <>Saved!</>
              ) : (
                <>Save Office Hours</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Clock,
  Check,
  AlertCircle,
  CheckCircle2,
  Coffee,
} from "lucide-react";
import {
  useOfficeHours,
  computeOfficeSchedule,
} from "../../constants/officeHours";
import { useOrganization } from "../../hooks/useOrgData";

const PRESETS = [
  {
    id: "7h-10-5",
    label: "7h Workday",
    time: "10 AM – 5 PM",
    workDayHours: 7,
    startTime: "10:00",
    graceMinutes: 30,
    includeLunch: true,
    lunchMinutes: 0,
  },
  {
    id: "8h-10-6",
    label: "8h Workday",
    time: "10 AM – 6 PM",
    workDayHours: 8,
    startTime: "10:00",
    graceMinutes: 30,
    includeLunch: true,
    lunchMinutes: 0,
  },
  {
    id: "8h-9-5",
    label: "8h Workday",
    time: "9 AM – 5 PM",
    workDayHours: 8,
    startTime: "09:00",
    graceMinutes: 30,
    includeLunch: true,
    lunchMinutes: 0,
  },
];

const GRACE_OPTIONS = [15, 30, 45, 60];

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

  // Sync state whenever modal opens
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

  // Derived live schedule
  const schedule = useMemo(() => {
    return computeOfficeSchedule({
      workDayHours: Number(workDayHours) || 7,
      startTime: startTime || "10:00",
      graceMinutes: Number(graceMinutes) || 0,
      includeLunch: Boolean(includeLunch),
      lunchMinutes: Number(lunchMinutes) || 0,
    });
  }, [workDayHours, startTime, graceMinutes, includeLunch, lunchMinutes]);

  if (!isOpen) return null;

  // Handle End Time edit directly by user
  const handleEndTimeChange = (newEndTime) => {
    if (!newEndTime) return;
    const [eH, eM] = newEndTime.split(":").map(Number);
    const [sH, sM] = startTime.split(":").map(Number);
    let diff = eH * 60 + eM - (sH * 60 + sM);
    if (diff <= 0) diff += 1440;
    const extraBreak = includeLunch ? 0 : lunchMinutes;
    const netMins = Math.max(120, diff - extraBreak);
    const netHours = Math.round((netMins / 60) * 10) / 10;
    setWorkDayHours(netHours);
  };

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
      }, 600);
    } catch (err) {
      console.error("Failed to update office hours:", err);
      if (err.message?.includes("column") || err.code === "42703") {
        setError(
          "Database migration pending: Please run the SQL migration in Supabase SQL editor to add office_hours column to organizations table.",
        );
      } else {
        setError(err.message || "Failed to update office hours.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-border overflow-hidden my-auto">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-muted/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                Edit Office Shift & Timing
              </h3>
              <p className="text-xs text-text-muted">
                Configure your organization's shift hours and punctuality rules.
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

        {/* BODY */}
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

          {/* 1. QUICK PRESETS */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Quick Presets
              </label>
              <span className="text-[10px] text-text-muted">One-click standard templates</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => {
                const isSelected =
                  Number(workDayHours) === p.workDayHours &&
                  startTime === p.startTime &&
                  Boolean(includeLunch) === p.includeLunch;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border-light bg-surface-muted/30 hover:bg-surface-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text">
                        {p.label}
                      </span>
                      {isSelected && <Check size={12} className="text-primary shrink-0" />}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5 font-medium">
                      {p.time}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. SHIFT TIMINGS (START & END) */}
          <div className="p-3.5 rounded-xl border border-border-light bg-surface-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text">Daily Shift Hours</span>
              <span className="text-xs font-mono font-bold text-primary bg-primary-light px-2.5 py-0.5 rounded-lg border border-primary/20">
                {schedule.workDayHours} hours / day
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              {/* START TIME */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-text-muted">
                    Shift Starts
                  </label>
                  <span className="text-[11px] font-mono font-bold text-primary">
                    {schedule.startTimeAmPm}
                  </span>
                </div>
                <div className="flex items-center h-10 px-3 bg-white border border-border rounded-xl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <Clock size={15} className="text-primary shrink-0 mr-2" />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-text outline-none cursor-pointer"
                    required
                  />
                </div>
              </div>

              {/* END TIME */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-text-muted">
                    Shift Ends
                  </label>
                  <span className="text-[11px] font-mono font-bold text-primary">
                    {schedule.endTimeAmPm}
                  </span>
                </div>
                <div className="flex items-center h-10 px-3 bg-white border border-border rounded-xl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <Clock size={15} className="text-primary shrink-0 mr-2" />
                  <input
                    type="time"
                    value={schedule.endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-text outline-none cursor-pointer"
                    required
                  />
                </div>
              </div>
            </div>

            {/* QUICK DURATION STEPPER */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border-light text-text-muted">
              <span>Work Duration</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setWorkDayHours((h) => Math.max(4, Number(h) - 0.5))}
                  className="w-6 h-6 rounded-lg border border-border bg-white hover:bg-surface-muted flex items-center justify-center font-bold text-xs cursor-pointer"
                  title="Subtract 30 mins"
                >
                  -
                </button>
                <span className="font-mono font-bold text-text px-1">
                  {workDayHours}h
                </span>
                <button
                  type="button"
                  onClick={() => setWorkDayHours((h) => Math.min(14, Number(h) + 0.5))}
                  className="w-6 h-6 rounded-lg border border-border bg-white hover:bg-surface-muted flex items-center justify-center font-bold text-xs cursor-pointer"
                  title="Add 30 mins"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 3. ARRIVAL GRACE BUFFER */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Arrival Grace Buffer
              </label>
              <span className="text-xs font-mono font-semibold text-text">
                {graceMinutes} minutes
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {GRACE_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setGraceMinutes(mins)}
                  className={`py-1.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                    Number(graceMinutes) === mins
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-surface hover:bg-surface-muted text-text border-border"
                  }`}
                >
                  {mins} mins
                </button>
              ))}
            </div>

            <div className="mt-2.5 p-2.5 rounded-xl bg-surface-muted/60 border border-border-light flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-success font-medium">
                <CheckCircle2 size={13} className="shrink-0" />
                <span>On-Time: before {schedule.graceCutoffAmPm}</span>
              </div>
              <div className="flex items-center gap-1.5 text-warning font-medium">
                <AlertCircle size={13} className="shrink-0" />
                <span>Late: after {schedule.graceCutoffAmPm}</span>
              </div>
            </div>
          </div>

          {/* 4. LUNCH POLICY */}
          <div className="p-3 rounded-xl border border-border-light bg-surface-muted/30">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeLunch}
                onChange={(e) => setIncludeLunch(e.target.checked)}
                className="mt-0.5 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
              />
              <div className="text-xs">
                <div className="flex items-center gap-1.5 font-bold text-text">
                  <Coffee size={13} className="text-primary shrink-0" />
                  <span>Include Lunch inside standard shift hours</span>
                </div>
                <p className="text-text-muted mt-0.5">
                  {includeLunch
                    ? `Employees work ${workDayHours}h total (${schedule.startTimeAmPm} to ${schedule.endTimeAmPm}), with lunch taken during this window.`
                    : "Lunch break is unpaid and extends required shift hours."}
                </p>
              </div>
            </label>
          </div>

          {/* 5. ACTIVE SHIFT SCHEDULE SUMMARY */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-primary">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="shrink-0 text-primary" />
                <span>Active Shift Schedule</span>
              </div>
              <span className="font-mono bg-white px-2.5 py-0.5 rounded-md border border-primary/20 shadow-2xs font-bold">
                {schedule.shiftLabel}
              </span>
            </div>

            {/* SCHEDULE TILES */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="bg-white/80 p-2 rounded-lg border border-border-light text-center">
                <span className="text-[10px] text-text-muted block font-medium">Shift Starts</span>
                <span className="text-xs font-bold font-mono text-text">{schedule.startTimeAmPm}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-border-light text-center">
                <span className="text-[10px] text-success block font-medium">Grace Cutoff</span>
                <span className="text-xs font-bold font-mono text-success">{schedule.graceCutoffAmPm}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-border-light text-center">
                <span className="text-[10px] text-text-muted block font-medium">Shift Ends</span>
                <span className="text-xs font-bold font-mono text-text">{schedule.endTimeAmPm}</span>
              </div>
            </div>
          </div>

          {/* MODAL ACTIONS */}
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
              {saving ? "Saving..." : success ? "Saved!" : "Save Office Hours"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

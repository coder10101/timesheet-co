import React, { useState, useEffect } from "react";
import { NepaliDatePicker } from "../../../components/NepaliDatePicker";
import { formatProjectDateNepali, normalizeDateToISO, getDeadlineUrgency } from "../../../constants/projectPresets";
import { todayISO } from "../../../utils/workTime";
import { Calendar, X, Clock, Check, AlertCircle } from "lucide-react";

export function QuickDeadlineModal({ isOpen, onClose, project, onSave, saving }) {
  const [selectedDate, setSelectedDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (project) {
      const raw = project.end_date || project.deadline || "";
      setSelectedDate(normalizeDateToISO(raw) || raw);
      setError("");
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setError("");
      await onSave({
        id: project.id,
        deadline: selectedDate || null,
        endDate: selectedDate || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update deadline");
    }
  };

  const setPreset = (daysFromNow) => {
    if (daysFromNow === null) {
      setSelectedDate("");
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const urgency = getDeadlineUrgency(selectedDate, project.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary">Update Project Deadline</h3>
              <p className="text-xs text-text-muted truncate max-w-[260px]">
                {project.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Quick Select
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPreset(7)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-center"
              >
                +1 Week
              </button>
              <button
                type="button"
                onClick={() => setPreset(14)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-center"
              >
                +2 Weeks
              </button>
              <button
                type="button"
                onClick={() => setPreset(30)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-center"
              >
                +1 Month
              </button>
              <button
                type="button"
                onClick={() => setPreset(null)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all text-center text-text-muted"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Nepali Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Target Deadline (Nepali BS / AD)
            </label>
            <NepaliDatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Select target deadline"
            />
          </div>

          {/* Preview Urgency */}
          {selectedDate && (
            <div className="p-3.5 rounded-xl bg-surface-subtle border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-muted" />
                <span className="text-text-secondary">Nepali Date:</span>
                <strong className="text-text-primary">
                  {formatProjectDateNepali(selectedDate)}
                </strong>
              </div>
              <span className={`px-2 py-0.5 rounded-md font-medium border ${urgency.badgeClass}`}>
                {urgency.label}
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl text-text-secondary hover:bg-surface-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 shadow-sm transition-all"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Deadline</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

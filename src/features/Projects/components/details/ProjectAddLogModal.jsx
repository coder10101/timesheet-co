import { useState, useEffect } from "react";
import { Plus, X, CheckCircle2, AlertCircle } from "lucide-react";
import { NepaliDatePicker } from "../../../../components/NepaliDatePicker";
import { normalizeDateToISO } from "../../../../constants/projectPresets";
import { todayISO } from "../../../../utils/workTime";

export function ProjectAddLogModal({
  isOpen,
  onClose,
  project,
  defaultType = "desk",
  onSaveLog,
}) {
  const [logDate, setLogDate] = useState(todayISO());
  const [logHours, setLogHours] = useState("4");
  const [logType, setLogType] = useState("desk");
  const [logText, setLogText] = useState("");
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [logFeedback, setLogFeedback] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLogDate(todayISO());
      setLogHours("4");
      setLogType(defaultType === "site" ? "site" : "desk");
      setLogText("");
      setLogFeedback(null);
      setIsSavingLog(false);
    }
  }, [isOpen, defaultType]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!logText.trim() || !onSaveLog) return;
    setIsSavingLog(true);
    setLogFeedback(null);

    try {
      await onSaveLog({
        date: logDate || todayISO(),
        hours: logHours,
        workType: logType,
        text: logText.trim(),
      });
      setLogFeedback({
        type: "success",
        message: "Work log entry added successfully!",
      });
      setLogText("");
      setTimeout(() => {
        onClose();
        setLogFeedback(null);
      }, 900);
    } catch (err) {
      setLogFeedback({
        type: "error",
        message: err.message || "Failed to add work log",
      });
    } finally {
      setIsSavingLog(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-border max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-light pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Plus size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                Log Work on Project
              </h3>
              <p className="text-[11px] text-text-muted">{project.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {logFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              logFeedback.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {logFeedback.type === "success" ? (
              <CheckCircle2 size={15} />
            ) : (
              <AlertCircle size={15} />
            )}
            <span>{logFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* DATE PICKER */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text block">Date</label>
            <NepaliDatePicker
              value={normalizeDateToISO(logDate)}
              onChange={(iso) => setLogDate(iso)}
              placeholder="Select log date..."
            />
          </div>

          {/* HOURS & WORK MODE */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text block">
                Hours Spent
              </label>
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={logHours}
                onChange={(e) => setLogHours(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-surface-muted border border-border rounded-xl focus:bg-white focus:outline-hidden focus:border-primary font-mono text-text"
                placeholder="e.g. 4"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text block">
                Work Mode
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setLogType("desk")}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    logType === "desk"
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-surface-muted text-text-muted border-border hover:bg-white hover:text-text"
                  }`}
                >
                  Desk (Design)
                </button>
                <button
                  type="button"
                  onClick={() => setLogType("site")}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    logType === "site"
                      ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                      : "bg-surface-muted text-text-muted border-border hover:bg-white hover:text-text"
                  }`}
                >
                  Site
                </button>
              </div>
            </div>
          </div>

          {/* TASK DESCRIPTION */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text block">
              Work Details / Tasks Performed
            </label>
            <textarea
              rows={3}
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              placeholder="Describe the drawings, 3D models, site inspection, or BOQ work completed..."
              className="w-full text-xs px-3 py-2 bg-surface-muted border border-border rounded-xl focus:bg-white focus:outline-hidden focus:border-primary resize-none leading-relaxed text-text"
              required
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border-light pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface-muted rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingLog || !logText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary/95 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSavingLog ? "Saving Entry..." : "Submit Log Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

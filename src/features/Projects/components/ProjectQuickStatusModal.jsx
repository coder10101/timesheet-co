import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { STATUS_OPTIONS } from "../../../constants/projectPresets";

export function ProjectQuickStatusModal({
  isOpen,
  project,
  onClose,
  onSave,
  saving = false,
}) {
  const [statusInput, setStatusInput] = useState("Active");
  const [progressInput, setProgressInput] = useState(0);

  useEffect(() => {
    if (project) {
      setStatusInput(project.status || "Active");
      setProgressInput(Number(project.progress) || 0);
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!onSave) return;
    await onSave(project, statusInput, progressInput);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4 fade-in">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Update Status & Progress
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-[240px]">
              Project:{" "}
              <span className="font-semibold text-slate-800">
                {project.name}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* STATUS OPTIONS */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Project Status:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((st) => {
                const isSelected =
                  (statusInput || "").toLowerCase() === st.toLowerCase();
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusInput(st);
                      if (st === "Completed") setProgressInput(100);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-left flex items-center justify-between ${
                      isSelected
                        ? st === "Active"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/20"
                          : st === "Completed"
                            ? "bg-purple-50 text-purple-800 border-purple-300 ring-2 ring-purple-400/20"
                            : st === "On Hold"
                              ? "bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-400/20"
                              : "bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-400/20"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    <span>{st}</span>
                    {isSelected && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PROGRESS BAR & SLIDER */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Completion Progress:
              </label>
              <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                {progressInput}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progressInput}
              onChange={(e) => setProgressInput(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex items-center justify-between gap-1">
              {[0, 25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setProgressInput(pct)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                    progressInput === pct
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-xl shadow-xs cursor-pointer hover:bg-primary/95 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Status & Progress"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

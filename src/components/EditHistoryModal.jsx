import { useMemo } from "react";
import { X, History, User, Clock, ArrowRight, FileText, CheckCircle2 } from "lucide-react";
import { fmtTime } from "../utils/workTime";
import { getInitials } from "../constants/projectPresets";
import { getEmployeeColor } from "../constants/colors";

function formatDateTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (_) {
    return isoString;
  }
}

function getRelativeTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 30) return `${diffDay}d ago`;
    return "";
  } catch (_) {
    return "";
  }
}

export default function EditHistoryModal({
  isOpen,
  onClose,
  title = "Edit History",
  subtitle = "",
  history = [],
  type = "attendance", // "attendance" | "work_log"
  projectMap = {},
}) {
  if (!isOpen) return null;

  const entries = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return [...history].sort(
      (a, b) => new Date(b.edited_at || 0) - new Date(a.edited_at || 0)
    );
  }, [history]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-border-light flex items-center justify-between bg-surface-muted/30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <History size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-text truncate">{title}</h3>
              {subtitle && (
                <p className="text-[11px] text-text-muted truncate mt-0.5">{subtitle}</p>
              )}
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

        {/* BODY */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-muted">
              <History size={28} className="mx-auto mb-2 text-text-faint" />
              <p className="font-semibold text-text">No edit history recorded</p>
              <p className="text-[11px] text-text-muted mt-0.5">
                This entry has not been modified since it was originally logged.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-light">
              {entries.map((item, idx) => {
                const editorName = item.editor_name || "Team Member";
                const editorRole = (item.editor_role || "employee").toLowerCase();
                const isAdmin = editorRole === "admin";
                const relative = getRelativeTime(item.edited_at);
                const fullTime = formatDateTime(item.edited_at);
                const changes = item.changes || {};

                return (
                  <div key={item.id || idx} className="relative space-y-2">
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-xs ${
                        isAdmin ? "bg-purple-600" : "bg-primary"
                      }`}
                    />

                    {/* Meta row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[8px] text-white shrink-0 shadow-2xs"
                          style={{ backgroundColor: getEmployeeColor(editorName) }}
                        >
                          {getInitials(editorName)}
                        </div>
                        <span className="text-xs font-bold text-text">{editorName}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                            isAdmin
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {isAdmin ? "Admin" : "Employee"}
                        </span>
                      </div>

                      <div className="text-[11px] text-text-muted font-mono flex items-center gap-1.5">
                        {relative && <span className="font-sans font-medium text-text">{relative}</span>}
                        <span>•</span>
                        <span>{fullTime}</span>
                      </div>
                    </div>

                    {/* Reason if provided */}
                    {item.reason && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-900 text-[11px] flex items-start gap-1.5">
                        <span className="font-bold shrink-0">Reason:</span>
                        <span className="italic">{item.reason}</span>
                      </div>
                    )}

                    {/* Changes Card */}
                    <div className="p-3 rounded-xl bg-surface-muted/40 border border-border-light text-xs space-y-2.5">
                      {type === "attendance" ? (
                        <div className="space-y-1.5">
                          {changes.clock_in && (
                            <div className="flex items-center justify-between text-xs py-1 border-b border-border-light/60">
                              <span className="text-text-muted font-medium">Clock In:</span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-text-muted line-through">
                                  {changes.clock_in.old ? fmtTime(changes.clock_in.old) : "—"}
                                </span>
                                <ArrowRight size={12} className="text-text-muted" />
                                <span className="font-bold text-text">
                                  {changes.clock_in.new ? fmtTime(changes.clock_in.new) : "—"}
                                </span>
                              </div>
                            </div>
                          )}

                          {changes.clock_out && (
                            <div className="flex items-center justify-between text-xs py-1 border-b border-border-light/60">
                              <span className="text-text-muted font-medium">Clock Out:</span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-text-muted line-through">
                                  {changes.clock_out.old ? fmtTime(changes.clock_out.old) : "—"}
                                </span>
                                <ArrowRight size={12} className="text-text-muted" />
                                <span className="font-bold text-text">
                                  {changes.clock_out.new ? fmtTime(changes.clock_out.new) : "—"}
                                </span>
                              </div>
                            </div>
                          )}

                          {changes.break_minutes && (
                            <div className="flex items-center justify-between text-xs py-1">
                              <span className="text-text-muted font-medium">Break Time:</span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-text-muted line-through">
                                  {changes.break_minutes.old ?? 0}m
                                </span>
                                <ArrowRight size={12} className="text-text-muted" />
                                <span className="font-bold text-text">
                                  {changes.break_minutes.new ?? 0}m
                                </span>
                              </div>
                            </div>
                          )}

                          {!changes.clock_in && !changes.clock_out && !changes.break_minutes && (
                            <p className="text-[11px] text-text-muted italic">Record details updated.</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {changes.project_id && (
                            <div className="flex items-center justify-between text-xs py-1 border-b border-border-light/60">
                              <span className="text-text-muted font-medium">Project:</span>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-text-muted line-through">
                                  {projectMap[changes.project_id.old]?.name || "No Project"}
                                </span>
                                <ArrowRight size={12} className="text-text-muted" />
                                <span className="font-bold text-text">
                                  {projectMap[changes.project_id.new]?.name || "No Project"}
                                </span>
                              </div>
                            </div>
                          )}

                          {changes.entry_text && (
                            <div className="space-y-1.5 pt-0.5">
                              <span className="text-text-muted font-medium text-[11px] block">
                                Work Description:
                              </span>
                              <div className="space-y-1">
                                <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-200/70 text-rose-900 text-xs">
                                  <div className="text-[9px] font-bold uppercase tracking-wider text-rose-600 mb-0.5">
                                    Previous
                                  </div>
                                  <p className="leading-relaxed break-words line-through opacity-85">
                                    {changes.entry_text.old}
                                  </p>
                                </div>
                                <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/70 text-emerald-900 text-xs">
                                  <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 mb-0.5">
                                    Updated
                                  </div>
                                  <p className="leading-relaxed break-words font-medium">
                                    {changes.entry_text.new}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-border-light flex justify-end bg-surface-muted/20 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-surface-muted/80 text-text font-semibold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

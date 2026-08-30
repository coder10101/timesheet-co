import { useState, useMemo } from "react";
import {
  useAttendance,
  useWorkLogs,
  useProjects,
} from "../../hooks/useOrgData";

import {
  fmtDate,
  fmtTime,
  formatDuration,
  todayISO,
} from "../../utils/workTime";

import {
  isoToBS,
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
} from "../../utils/nepaliCalendar";

import {
  Pencil,
  Trash2,
  ChevronDown,
  Plus,
  X,
  Check,
  Search,
  Clock,
  AlertCircle,
} from "lucide-react";

import { EmptyState } from "../../components/EmptyState";
import { NepaliDatePicker } from "../../components/NepaliDatePicker";

export function EmployeeWorklog({ me }) {
  const { records } = useAttendance(me.id);
  const { entries, addEntry, updateEntry, deleteEntry } = useWorkLogs(me.id);
  const { projects } = useProjects();

  const [text, setText] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("all");

  // Accordion state
  const [openDates, setOpenDates] = useState(() => new Set([todayISO()]));

  const activeProjects = useMemo(
    () => (projects || []).filter((p) => !p.archived),
    [projects],
  );

  const projectMap = useMemo(() => {
    const map = new Map();
    (projects || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = e.entry_text?.toLowerCase().includes(q);
        const proj = projectMap.get(e.project_id);
        const projMatch = proj?.name?.toLowerCase().includes(q);
        if (!textMatch && !projMatch) return false;
      }
      if (filterProjectId !== "all") {
        if (filterProjectId === "none") {
          if (e.project_id) return false;
        } else if (e.project_id !== filterProjectId) {
          return false;
        }
      }
      return true;
    });
  }, [entries, searchQuery, filterProjectId, projectMap]);

  // Unique dates
  const dates = useMemo(() => {
    if (!records || !entries) return [];
    const set = new Set();

    filteredEntries.forEach((e) => set.add(e.date));

    if (!searchQuery.trim() && filterProjectId === "all") {
      records.forEach((r) => set.add(r.date));
    }

    return Array.from(set).sort((a, b) => new Date(b) - new Date(a));
  }, [records, entries, filteredEntries, searchQuery, filterProjectId]);

  if (records === null || entries === null || projects === null) {
    return null;
  }

  const toggleDate = (date) => {
    setOpenDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenDates(new Set(dates));
  };

  const collapseAll = () => {
    setOpenDates(new Set());
  };

  const startEdit = (entry) => {
    setSelectedDate(entry.date);
    setEditingId(entry.id);
    setText(entry.entry_text);
    setProjectId(entry.project_id || "");
    setErr("");

    setOpenDates((prev) => {
      const next = new Set(prev);
      next.add(entry.date);
      return next;
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setText("");
    setProjectId("");
    setEditingId(null);
    setErr("");
  };

  const saveEntry = async () => {
    const value = text.trim();
    if (!value) return;

    setSaving(true);
    setErr("");

    try {
      if (editingId) {
        await updateEntry(editingId, value, projectId || null);
      } else {
        await addEntry(value, selectedDate, projectId || null);
      }

      setOpenDates((prev) => {
        const next = new Set(prev);
        next.add(selectedDate);
        return next;
      });

      resetForm();
    } catch (e) {
      setErr(e.message || "Failed to save work log.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this work log entry?")) return;
    try {
      await deleteEntry(id);
    } catch (e) {
      setErr(e.message || "Failed to delete work log.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 fade-in">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Work Log</h1>
          <p className="text-xs text-text-muted">
            Record and review your daily accomplishments.
          </p>
        </div>
      </div>

      {err && (
        <div className="px-3.5 py-2 rounded-xl bg-alert-light text-alert text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle size={14} className="shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* ROOMY WORK ENTRY BOX */}
      <div
        className={`bg-white border rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3 transition-all ${
          editingId ? "border-primary ring-2 ring-primary/20" : "border-border"
        }`}
      >
        {/* BIGGER TEXT AREA */}
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                saveEntry();
              }
            }}
            rows={2}
            placeholder={
              editingId
                ? "Update your task description..."
                : "What did you work on? e.g. Finished sprint planning, built API endpoints..."
            }
            className="w-full bg-surface-muted/40 focus:bg-white border border-border-light focus:border-primary rounded-xl p-3 text-xs sm:text-sm text-text outline-none resize-none transition-all shadow-2xs leading-relaxed"
          />
        </div>

        {/* CONTROLS ROW UNDER THE TEXT FIELD */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* DATE PICKER & PROJECT */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
            <div className="w-full sm:w-72 md:w-80 shrink-0">
              <NepaliDatePicker
                value={selectedDate}
                max={todayISO()}
                onChange={setSelectedDate}
                placeholder="Select date"
              />
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-10 flex-1 sm:flex-initial sm:w-44 bg-white border border-border rounded-xl px-3 text-xs font-semibold text-text outline-none focus:border-primary shadow-2xs cursor-pointer truncate"
              >
                <option value="">No Project</option>
                {activeProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              {/* Mobile Action Buttons */}
              <div className="flex sm:hidden items-center gap-1.5 shrink-0">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-10 px-2.5 text-xs text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                <button
                  onClick={saveEntry}
                  disabled={!text.trim() || saving}
                  className="h-10 flex items-center gap-1 px-3 rounded-xl bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-40 shrink-0 cursor-pointer"
                >
                  {editingId ? <Check size={13} /> : <Plus size={13} />}
                  <span>{saving ? "..." : editingId ? "Update" : "Add"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center justify-end gap-2 shrink-0">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="h-10 px-3 text-xs text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              onClick={saveEntry}
              disabled={!text.trim() || saving}
              className="h-10 flex items-center gap-1.5 px-4 rounded-xl bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-40 shrink-0 cursor-pointer"
            >
              {editingId ? <Check size={13} /> : <Plus size={13} />}
              <span>
                {saving ? "Saving..." : editingId ? "Update Task" : "Add Task"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & ACCORDION CONTROLS (ABOVE HISTORY) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Task History
          </h3>

          {/* EXPAND / COLLAPSE */}
          <div className="h-8 flex items-center gap-0.5 bg-surface-muted p-0.5 rounded-xl border border-border-light text-[11px] shadow-2xs shrink-0">
            <button
              onClick={expandAll}
              className="h-full px-2.5 rounded-lg text-text-muted hover:text-text hover:bg-white font-medium transition-colors cursor-pointer"
              title="Expand all days"
            >
              Expand
            </button>
            <button
              onClick={collapseAll}
              className="h-full px-2.5 rounded-lg text-text-muted hover:text-text hover:bg-white font-medium transition-colors cursor-pointer"
              title="Collapse all days"
            >
              Collapse
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SEARCH */}
          <div className="flex-1 h-9 flex items-center gap-1.5 bg-white border border-border rounded-xl px-2.5 text-xs focus-within:border-primary shadow-2xs min-w-0">
            <Search size={13} className="text-text-muted shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-transparent outline-none text-text text-xs min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-text-muted hover:text-text cursor-pointer shrink-0"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* FILTER BY PROJECT */}
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="h-9 bg-white border border-border rounded-xl px-2.5 text-xs text-text outline-none focus:border-primary shadow-2xs cursor-pointer max-w-[130px] sm:max-w-[160px] truncate shrink-0"
          >
            <option value="all">All Projects</option>
            <option value="none">Untagged</option>
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DAILY TIMELINE */}
      <div className="space-y-2.5">
        {dates.length === 0 ? (
          <EmptyState
            title="No work logged"
            description="Use the box above to log your accomplishments."
          />
        ) : (
          dates.map((date) => {
            const attendance = records.find((r) => r.date === date);
            const dayEntries = filteredEntries.filter((e) => e.date === date);
            const isOpen = openDates.has(date);

            const worked = attendance?.clock_out
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(`${date}T${attendance.clock_out}`) -
                      new Date(`${date}T${attendance.clock_in}`)) /
                      60000,
                  ),
                )
              : 0;

            const bs = isoToBS(date);
            const weekday = new Date(`${date}T00:00:00`).getDay();

            return (
              <div
                key={date}
                className="bg-white border border-border rounded-2xl overflow-hidden shadow-2xs"
              >
                {/* DAY HEADER */}
                <button
                  onClick={() => toggleDate(date)}
                  className={`w-full px-3.5 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 text-left transition-colors cursor-pointer ${
                    isOpen
                      ? "bg-surface-muted/40 border-b border-border-light"
                      : "bg-white hover:bg-surface-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-transform duration-150 ${
                        isOpen ? "text-primary rotate-180" : "text-text-muted"
                      }`}
                    >
                      <ChevronDown size={14} />
                    </div>

                    <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-text">
                        {bs.day} {NEPALI_MONTHS[bs.month - 1]}, {bs.year}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        · {WEEKDAY_LABELS[weekday]} ({fmtDate(date)})
                      </span>
                      <span className="text-[10px] text-text-muted font-mono px-1.5 py-0.2 rounded-md bg-surface-muted border border-border-light">
                        {dayEntries.length}{" "}
                        {dayEntries.length === 1 ? "task" : "tasks"}
                      </span>
                    </div>
                  </div>

                  {attendance?.clock_in && (
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-text-muted font-mono shrink-0 pl-6 sm:pl-0">
                      <Clock size={11} className="text-primary" />
                      <span>
                        {fmtTime(attendance.clock_in)} →{" "}
                        {attendance.clock_out
                          ? fmtTime(attendance.clock_out)
                          : "Working"}
                      </span>
                      {worked > 0 && (
                        <span className="font-semibold text-text ml-0.5">
                          ({formatDuration(worked)})
                        </span>
                      )}
                    </div>
                  )}
                </button>

                {/* ENTRIES */}
                {isOpen && (
                  <div className="p-2 sm:p-3">
                    {dayEntries.length === 0 ? (
                      <div className="py-2 px-3 text-xs text-text-muted flex items-center justify-between">
                        <span>No tasks logged for this day.</span>
                        <button
                          onClick={() => {
                            setSelectedDate(date);
                            setEditingId(null);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          + Log for this day
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {dayEntries.map((entry) => {
                          const proj = projectMap.get(entry.project_id);
                          const dotColor = proj?.color || "#4F46E5";

                          return (
                            <div
                              key={entry.id}
                              className="group flex items-start sm:items-center justify-between gap-2 px-2.5 sm:px-3 py-2 rounded-xl hover:bg-surface-muted/60 transition-colors"
                            >
                              <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                                {proj && (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0 mt-0.5 sm:mt-0"
                                    style={{ backgroundColor: dotColor }}
                                  >
                                    {proj.name}
                                  </span>
                                )}
                                <span className="text-xs text-text leading-relaxed break-words min-w-0">
                                  {entry.entry_text}
                                </span>
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEdit(entry)}
                                  className="p-1 rounded-lg hover:bg-white text-text-muted hover:text-text transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  className="p-1 rounded-lg hover:bg-alert-light text-text-muted hover:text-alert transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

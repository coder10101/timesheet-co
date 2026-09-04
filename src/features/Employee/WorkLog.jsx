import { useState, useMemo, useRef } from "react";
import {
  useAttendance,
  useWorkLogs,
  useProjects,
} from "../../hooks/useOrgData";

import {
  fmtDate,
  fmtTime,
  formatDuration,
  getWorkedMinutes,
  getEffectiveClockOut,
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
  Minus,
  X,
  Check,
  Search,
  Clock,
  AlertCircle,
  Building2,
  MapPin,
} from "lucide-react";

import { EmptyState } from "../../components/EmptyState";
import { NepaliDatePicker } from "../../components/NepaliDatePicker";
import {
  parseWorkLogEntry,
  formatWorkLogEntryText,
} from "../../utils/workType";
import { useOfficeHours } from "../../constants/officeHours";

export function EmployeeWorklog({ me }) {
  const officeHours = useOfficeHours();
  const { records } = useAttendance(me.id);
  const { entries, addEntry, updateEntry, deleteEntry } = useWorkLogs(me.id);
  const { projects } = useProjects();

  const textareaRef = useRef(null);

  const [text, setText] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [workType, setWorkType] = useState("desk"); // 'desk' | 'site'
  const [siteHours, setSiteHours] = useState(2);
  const [isFullDay, setIsFullDay] = useState(false);
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
      const parsed = parseWorkLogEntry(e);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = parsed.cleanText?.toLowerCase().includes(q);
        const proj = projectMap.get(e.project_id);
        const projMatch = proj?.name?.toLowerCase().includes(q);
        const typeMatch =
          parsed.workType.toLowerCase().includes(q) ||
          (parsed.workType === "site" && "site visit".includes(q));
        if (!textMatch && !projMatch && !typeMatch) return false;
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

  // Compute project distribution
  const projectStats = useMemo(() => {
    if (!entries || entries.length === 0)
      return { segments: [], totalLogs: 0, totalSiteLogs: 0, totalDeskLogs: 0 };
    const counts = new Map();
    let total = 0;
    let totalSiteLogs = 0;
    let totalDeskLogs = 0;

    const COLORS_PALETTE = [
      "#63537E",
      "#497833",
      "#7A5A17",
      "#913030",
      "#3E8F18",
      "#514366",
    ];

    entries.forEach((e) => {
      const parsed = parseWorkLogEntry(e);
      if (parsed.workType === "site") {
        totalSiteLogs++;
      } else {
        totalDeskLogs++;
      }
      const pId = e.project_id || "general";
      counts.set(pId, (counts.get(pId) || 0) + 1);
      total += 1;
    });

    const segments = Array.from(counts.entries())
      .map(([pId, count], idx) => {
        const proj = projectMap.get(pId);
        const name =
          pId === "general" ? "General / Misc" : proj?.name || "Project";
        const pct = Math.round((count / total) * 100);
        const color = COLORS_PALETTE[idx % COLORS_PALETTE.length];
        return { pId, name, count, pct, color };
      })
      .sort((a, b) => b.count - a.count);

    return { segments, totalLogs: total, totalSiteLogs, totalDeskLogs };
  }, [entries, projectMap]);

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

  const adjustSiteHours = (delta) => {
    setIsFullDay(false);
    setSiteHours((prev) => {
      const next = Math.max(0.5, Math.min(12, Math.round((prev + delta) * 2) / 2));
      return next;
    });
  };

  const startEdit = (entry) => {
    const parsed = parseWorkLogEntry(entry);
    setSelectedDate(entry.date);
    setEditingId(entry.id);
    setText(parsed.cleanText);
    setWorkType(parsed.workType);

    if (parsed.workType === "site") {
      if (parsed.duration?.toLowerCase().includes("full")) {
        setIsFullDay(true);
        setSiteHours(officeHours.workDayHours);
      } else {
        setIsFullDay(false);
        const match = parsed.duration?.match(/(\d+(?:\.\d+)?)/);
        setSiteHours(match ? parseFloat(match[1]) : 2);
      }
    } else {
      setIsFullDay(false);
      setSiteHours(2);
    }

    setProjectId(entry.project_id || "");
    setErr("");

    setOpenDates((prev) => {
      const next = new Set(prev);
      next.add(entry.date);
      return next;
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const resetForm = () => {
    setText("");
    setProjectId("");
    setWorkType("desk");
    setSiteHours(2);
    setIsFullDay(false);
    setEditingId(null);
    setErr("");
  };

  const saveEntry = async () => {
    const value = text.trim();
    if (!value) return;

    setSaving(true);
    setErr("");

    try {
      const finalDuration = isFullDay ? "Full Day" : `${siteHours}h`;
      const formattedText = formatWorkLogEntryText(value, workType, finalDuration);
      if (editingId) {
        await updateEntry({
          entryId: editingId,
          text: formattedText,
          projectId: projectId || null,
          workType,
        });
      } else {
        await addEntry({
          text: formattedText,
          date: selectedDate,
          projectId: projectId || null,
          workType,
        });
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
            Record and review your daily accomplishments and project hours.
          </p>
        </div>
      </div>

      {err && (
        <div className="px-3.5 py-2 rounded-xl bg-alert-light text-alert text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle size={14} className="shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* VISUAL PROJECT EFFORT DISTRIBUTION BAR */}
      {projectStats.totalLogs > 0 && (
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-text">
                Project Contribution Breakdown
              </span>
              {projectStats.totalSiteLogs > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#63537E] bg-[#EEEAF2] border border-[#63537E]/20 px-2 py-0.5 rounded-md">
                  <MapPin size={10} /> {projectStats.totalSiteLogs} site visit
                  {projectStats.totalSiteLogs !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <span className="font-mono text-text-muted text-[11px]">
              {projectStats.totalLogs} total entries across{" "}
              {projectStats.segments.length} initiative
              {projectStats.segments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* MULTI-COLOR SEGMENTED BAR */}
          <div className="w-full h-2.5 rounded-full bg-surface-muted overflow-hidden flex shadow-inner">
            {projectStats.segments.map((seg) => (
              <div
                key={seg.pId}
                style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
                className="h-full transition-all duration-500"
                title={`${seg.name}: ${seg.count} logs (${seg.pct}%)`}
              />
            ))}
          </div>

          {/* PROJECT PILLS LEGEND */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {projectStats.segments.map((seg) => (
              <div
                key={seg.pId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-muted/60 border border-border-light text-[11px]"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="font-medium text-text">{seg.name}</span>
                <span className="font-mono font-bold text-text-muted text-[10px]">
                  ({seg.count} · {seg.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROOMY WORK ENTRY BOX */}
      <div
        className={`bg-white border rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3 transition-all ${
          editingId ? "border-primary ring-2 ring-primary/20" : "border-border"
        }`}
      >
        {/* WORK TYPE SELECTOR: DESK WORK VS SITE VISIT */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border-light">
          <div className="flex items-center p-0.5 bg-surface-muted rounded-xl border border-border-light text-xs">
            <button
              type="button"
              onClick={() => setWorkType("desk")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                workType === "desk"
                  ? "bg-white text-text shadow-xs border border-border/50"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Building2 size={13} />
              <span>Desk Work</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkType("site")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                workType === "site"
                  ? "bg-[#63537E] text-white shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <MapPin size={13} />
              <span>Site Visit</span>
            </button>
          </div>

          {/* DURATION INPUT & STEPPER WHEN SITE VISIT IS CHOSEN */}
          {workType === "site" && (
            <div className="flex items-center gap-1.5 flex-wrap animate-fadeIn">
              <span className="text-[11px] font-medium text-text-muted mr-0.5 hidden sm:inline">
                Site Hours:
              </span>

              {/* Number box with Stepper */}
              <div className="flex items-center bg-surface-muted border border-border-light rounded-xl p-0.5 shadow-2xs">
                <button
                  type="button"
                  disabled={isFullDay || siteHours <= 0.5}
                  onClick={() => adjustSiteHours(-0.5)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-text-muted hover:text-text disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Decrease by 30 mins"
                >
                  <Minus size={11} />
                </button>

                <div className="flex items-center px-1 font-mono text-xs">
                  <input
                    type="number"
                    min="0.5"
                    max="12"
                    step="0.5"
                    disabled={isFullDay}
                    value={isFullDay ? officeHours.workDayHours : siteHours}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        setSiteHours(Math.min(12, Math.max(0.5, val)));
                        setIsFullDay(false);
                      }
                    }}
                    className="w-9 text-center font-bold text-text bg-transparent outline-none disabled:text-text-muted"
                  />
                  <span className="text-text-muted text-[10px] font-medium pr-0.5">h</span>
                </div>

                <button
                  type="button"
                  disabled={isFullDay || siteHours >= 12}
                  onClick={() => adjustSiteHours(0.5)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-text-muted hover:text-text disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Increase by 30 mins"
                >
                  <Plus size={11} />
                </button>
              </div>

              {/* Quick presets for common hours */}
              {[1, 2, 3, 4, 5].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setSiteHours(h);
                    setIsFullDay(false);
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    !isFullDay && siteHours === h
                      ? "bg-[#EEEAF2] text-[#63537E] border border-[#63537E]/40 shadow-2xs"
                      : "bg-surface-muted/60 text-text-muted hover:text-text border border-border-light"
                  }`}
                >
                  {h}h
                </button>
              ))}

              {/* Full Day Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (isFullDay) {
                    setIsFullDay(false);
                  } else {
                    setIsFullDay(true);
                    setSiteHours(officeHours.workDayHours);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isFullDay
                    ? "bg-[#63537E] text-white shadow-2xs"
                    : "bg-surface-muted/60 text-text-muted hover:text-text border border-border-light"
                }`}
              >
                Full Day ({officeHours.workDayHours}h)
              </button>
            </div>
          )}
        </div>

        {/* BIGGER TEXT AREA */}
        <div>
          <textarea
            ref={textareaRef}
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
                ? "Update your work description..."
                : workType === "site"
                  ? "What did you work on during this site visit?"
                  : "What did you work on at your desk?"
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
                  type="button"
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
              type="button"
              onClick={saveEntry}
              disabled={!text.trim() || saving}
              className="h-10 flex items-center gap-1.5 px-4 rounded-xl bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-40 shrink-0 cursor-pointer"
            >
              {editingId ? <Check size={13} /> : <Plus size={13} />}
              <span>
                {saving ? "Saving..." : editingId ? "Update Log" : "Add Log"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & ACCORDION CONTROLS (ABOVE HISTORY) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Work History
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
              placeholder="Search work logs..."
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

          {/* PROJECT FILTER */}
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="h-9 w-32 sm:w-44 bg-white border border-border rounded-xl px-2.5 text-xs font-semibold text-text outline-none focus:border-primary shadow-2xs cursor-pointer truncate shrink-0"
          >
            <option value="all">All Projects</option>
            <option value="none">No Project</option>
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DATES LIST */}
      <div className="space-y-3">
        {dates.length === 0 ? (
          <EmptyState
            title="No work logs found"
            description={
              searchQuery || filterProjectId !== "all"
                ? "Try clearing your search or filter."
                : "Select a date above to log your daily work."
            }
          />
        ) : (
          dates.map((date) => {
            const dayEntries = filteredEntries.filter((e) => e.date === date);
            const isOpen = openDates.has(date);
            const attendance = records?.find((r) => r.date === date);
            const isToday = date === todayISO();
            const effOut = getEffectiveClockOut(attendance, todayISO());
            const isAutoClockOut = !attendance?.clock_out && !isToday && !!attendance?.clock_in;
            const worked =
              attendance?.clock_in && effOut
                ? getWorkedMinutes(attendance.clock_in, effOut, attendance?.break_minutes || 0)
                : 0;

            const bs = isoToBS(date);
            const weekday = new Date(`${date}T00:00:00`).getDay();

            return (
              <div
                key={date}
                className="bg-white rounded-2xl border border-border overflow-hidden shadow-2xs transition-all"
              >
                {/* ACCORDION HEADER */}
                <button
                  type="button"
                  onClick={() => toggleDate(date)}
                  className="w-full px-3.5 sm:px-4 py-3 bg-surface-muted/40 hover:bg-surface-muted border-b border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-left transition-colors cursor-pointer"
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
                        · {WEEKDAY_LABELS[weekday]}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono px-1.5 py-0.2 rounded-md bg-surface-muted border border-border-light">
                        {dayEntries.length}{" "}
                        {dayEntries.length === 1 ? "entry" : "entries"}
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
                          : isToday
                            ? "Working"
                            : `${officeHours.endTimeAmPm} (Auto)`}
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
                        <span>No work logged for this day.</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedDate(date);
                            setEditingId(null);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                            setTimeout(() => {
                              textareaRef.current?.focus();
                            }, 100);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                        >
                          + Log for this day
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {dayEntries.map((entry) => {
                          const proj = projectMap.get(entry.project_id);
                          const dotColor = proj?.color || "#4F46E5";
                          const parsed = parseWorkLogEntry(entry);

                          return (
                            <div
                              key={entry.id}
                              className="group flex items-start sm:items-center justify-between gap-2 px-2.5 sm:px-3 py-2 rounded-xl hover:bg-surface-muted/60 transition-colors"
                            >
                              <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
                                {proj && (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0 mt-0.5 sm:mt-0"
                                    style={{ backgroundColor: dotColor }}
                                  >
                                    {proj.name}
                                  </span>
                                )}

                                {parsed.workType === "site" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#63537E] bg-[#EEEAF2] border border-[#63537E]/30 px-2 py-0.5 rounded-md shrink-0">
                                    <MapPin size={10} /> Site Visit
                                    {parsed.duration && ` · ${parsed.duration}`}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-text-muted bg-surface-muted border border-border-light px-1.5 py-0.5 rounded-md shrink-0">
                                    <Building2 size={10} /> Desk
                                  </span>
                                )}

                                <span className="text-xs text-text leading-relaxed break-words min-w-0">
                                  {parsed.cleanText}
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

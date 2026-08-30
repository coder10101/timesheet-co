import { useEffect, useState, useMemo } from "react";
import {
  useAttendance,
  useRoster,
  useWorkLogs,
  useProjects,
} from "../../hooks/useOrgData";
import { EmptyState } from "../../components/EmptyState";
import {
  fmtDate,
  fmtTime,
  formatDuration,
  getWorkedMinutes,
} from "../../utils/workTime";
import {
  getTodayBS,
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
  isoToBS,
  isoToBSLabel,
} from "../../utils/nepaliCalendar";
import {
  User,
  Search,
  FolderKanban,
  Clock,
  Briefcase,
  Layers,
  ChevronRight,
} from "lucide-react";
import { getEmployeeColor } from "../../constants/colors";

const PROJECT_BORDER_COLORS = [
  "#2563EB", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
];

export function AdminWorklogs() {
  const { employees } = useRoster();
  const { projects } = useProjects();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [empSearch, setEmpSearch] = useState("");

  const todayBS = getTodayBS();
  const [selectedBSMonth, setSelectedBSMonth] = useState(todayBS.month);
  const [selectedBSYear, setSelectedBSYear] = useState(todayBS.year);

  useEffect(() => {
    if (!selectedId && employees?.length) {
      setSelectedId(employees[0].id);
    }
  }, [employees, selectedId]);

  const selected = selectedId || employees?.[0]?.id || null;
  const employee = (employees || []).find((e) => e.id === selected);

  const { entries } = useWorkLogs(selected);
  const { records } = useAttendance(selected);

  // Projects map
  const projectMap = useMemo(() => {
    const map = {};
    (projects || []).forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [projects]);

  // Attendance map
  const attendanceByDate = useMemo(() => {
    const map = {};
    (records || []).forEach((r) => {
      map[r.date] = r;
    });
    return map;
  }, [records]);

  // Filtered & grouped entries for selected month
  const filteredEntries = useMemo(() => {
    return (entries || []).filter((item) => {
      const bs = isoToBS(item.date);
      if (bs && (bs.month !== selectedBSMonth || bs.year !== selectedBSYear)) {
        return false;
      }
      if (
        search.trim() &&
        !item.entry_text.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [entries, search, selectedBSMonth, selectedBSYear]);

  const grouped = useMemo(() => {
    return filteredEntries.reduce((acc, e) => {
      (acc[e.date] ||= []).push(e);
      return acc;
    }, {});
  }, [filteredEntries]);

  const filteredEmployees = useMemo(() => {
    return (employees || []).filter((e) => {
      if (!empSearch.trim()) return true;
      const q = empSearch.toLowerCase();
      return (
        e.name?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q) ||
        e.role?.toLowerCase().includes(q)
      );
    });
  }, [employees, empSearch]);

  if (employees === null) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-4 fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Team Work Logs</h1>
          <p className="text-xs text-text-muted">
            Review daily work accomplishments, project allocations, and logged hours.
          </p>
        </div>
      </div>

      {/* 2-COLUMN MASTER-DETAIL SPLIT VIEW (REFERENCE IMAGE 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: EMPLOYEES LIST */}
        <div className="lg:col-span-4 bg-white border border-border rounded-2xl p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Employees
            </span>
            <span className="text-[11px] text-text-muted font-mono font-medium">
              {employees.length} total
            </span>
          </div>

          <div className="h-9 flex items-center gap-1.5 bg-surface-muted border border-border-light rounded-xl px-2.5 text-xs focus-within:border-primary">
            <Search size={13} className="text-text-muted shrink-0" />
            <input
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              placeholder="Search team..."
              className="w-full bg-transparent outline-none text-text text-xs"
            />
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-0.5">
            {filteredEmployees.map((emp) => {
              const isSelected = emp.id === selected;

              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedId(emp.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary-light/60 border-2 border-primary shadow-xs"
                      : "hover:bg-surface-muted/60 border border-transparent"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-xs"
                    style={{ backgroundColor: getEmployeeColor(emp) }}
                  >
                    {emp.name?.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-text truncate">{emp.name}</h4>
                    <p className="text-[10px] text-text-muted truncate capitalize">
                      {emp.department || emp.title || emp.role || "Engineering"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: WORK LOGS TIMELINE */}
        <div className="lg:col-span-8 space-y-3.5">
          {/* EMPLOYEE HEADER & MONTH DROPDOWN */}
          {employee && (
            <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-xs"
                  style={{ backgroundColor: getEmployeeColor(employee) }}
                >
                  {employee.name?.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-bold text-text truncate">{employee.name}</h2>
                  <p className="text-xs text-text-muted truncate">
                    {employee.title || employee.role || "Team member"}
                    {employee.department && ` · ${employee.department}`}
                  </p>
                </div>
              </div>

              {/* MONTH SELECTOR & SEARCH */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-8 flex items-center gap-1.5 bg-surface-muted border border-border-light rounded-xl px-2.5 text-xs">
                  <Search size={12} className="text-text-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search logs..."
                    className="w-24 sm:w-32 bg-transparent outline-none text-text text-xs"
                  />
                </div>

                <select
                  value={selectedBSMonth}
                  onChange={(e) => setSelectedBSMonth(Number(e.target.value))}
                  className="h-8 bg-surface-muted border border-border-light rounded-xl px-2.5 text-xs font-semibold text-text outline-none focus:border-primary cursor-pointer shadow-2xs"
                >
                  {NEPALI_MONTHS.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name} {selectedBSYear}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* VISUAL PROJECT EFFORT DISTRIBUTION BAR */}
          {filteredEntries.length > 0 && (() => {
            const counts = new Map();
            let total = 0;
            const COLORS_PALETTE = ["#63537E", "#497833", "#7A5A17", "#913030", "#3E8F18", "#514366"];

            filteredEntries.forEach((e) => {
              const pId = e.project_id || "general";
              counts.set(pId, (counts.get(pId) || 0) + 1);
              total += 1;
            });

            const segments = Array.from(counts.entries()).map(([pId, count], idx) => {
              const proj = projectMap[pId];
              const name = pId === "general" ? "General / Misc" : proj?.name || "Project";
              const pct = Math.round((count / total) * 100);
              const color = COLORS_PALETTE[idx % COLORS_PALETTE.length];
              return { pId, name, count, pct, color };
            }).sort((a, b) => b.count - a.count);

            return (
              <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-text">Project Allocation Breakdown</span>
                  <span className="font-mono text-text-muted text-[11px]">
                    {total} logged entries ({segments.length} projects)
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden flex shadow-inner">
                  {segments.map((seg) => (
                    <div
                      key={seg.pId}
                      style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
                      className="h-full transition-all duration-500"
                      title={`${seg.name}: ${seg.count} logs (${seg.pct}%)`}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {segments.map((seg) => (
                    <div
                      key={seg.pId}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-muted/60 border border-border-light text-[10px]"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="font-medium text-text">{seg.name}</span>
                      <span className="font-mono font-bold text-text-muted">
                        ({seg.pct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* WORK ENTRIES DAY BLOCKS */}
          {Object.keys(grouped).length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-12 text-center text-xs text-text-muted shadow-2xs">
              <Briefcase size={28} className="mx-auto mb-2 text-text-faint" />
              <p className="font-semibold text-text">No work logs recorded</p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {search
                  ? "No work logs match your search."
                  : `No work entries found for this month.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, items]) => {
                  const attendance = attendanceByDate[date];
                  const worked = attendance?.clock_out
                    ? getWorkedMinutes(attendance.clock_in, attendance.clock_out)
                    : null;
                  const bs = isoToBS(date);
                  const weekday = new Date(`${date}T00:00:00`).getDay();

                  return (
                    <div
                      key={date}
                      className="bg-white border border-border rounded-2xl overflow-hidden shadow-2xs"
                    >
                      {/* DAY HEADER */}
                      <div className="px-4 py-3 bg-surface-muted/50 border-b border-border-light flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text">
                            {bs ? `${bs.day} ${NEPALI_MONTHS[bs.month - 1]}, ${bs.year}` : date}
                          </span>
                          <span className="text-[11px] text-text-muted">
                            · {WEEKDAY_LABELS[weekday]}
                          </span>
                        </div>

                        {worked !== null && worked > 0 && (
                          <span className="font-mono text-xs font-bold text-text bg-white px-2.5 py-0.5 rounded-lg border border-border-light shadow-2xs">
                            {formatDuration(worked)}
                          </span>
                        )}
                      </div>

                      {/* WORK ENTRIES WITH COLORED ACCENT LEFT BORDERS */}
                      <div className="divide-y divide-border-light p-3 sm:p-4 space-y-2.5">
                        {items.map((it, idx) => {
                          const project = projectMap[it.project_id];
                          const borderColor =
                            project?.color ||
                            PROJECT_BORDER_COLORS[idx % PROJECT_BORDER_COLORS.length];

                          return (
                            <div
                              key={it.id}
                              className="pl-3.5 py-1 border-l-3 space-y-1 transition-colors"
                              style={{ borderColor }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-text">
                                  {project ? project.name : "General Work"}
                                </span>
                              </div>

                              <p className="text-xs text-text-muted leading-relaxed">
                                {it.entry_text}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

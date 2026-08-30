import { useEffect, useState, useMemo } from "react";
import {
  useAttendance,
  useRoster,
  useWorkLogs,
  useProjects,
} from "../../hooks/useOrgData";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import {
  fmtDate,
  fmtTime,
  formatDuration,
  getWorkedMinutes,
} from "../../utils/workTime";
import { isoToBSLabel } from "../../utils/nepaliCalendar";
import {
  User,
  Search,
  FolderKanban,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
} from "lucide-react";

export function AdminWorklogs() {
  const { employees } = useRoster();
  const { projects } = useProjects();
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

  const { entries } = useWorkLogs(sel);
  const { records } = useAttendance(sel);

  useEffect(() => {
    if (!sel && employees?.length) {
      setSel(employees[0].id);
    }
  }, [employees, sel]);

  const selected = sel || employees?.[0]?.id || null;
  const employee = (employees || []).find((e) => e.id === selected);

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

  // Filtered & grouped entries
  const filteredEntries = useMemo(() => {
    return (entries || []).filter((item) => {
      if (
        search.trim() &&
        !item.entry_text.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (projectFilter !== "all" && item.project_id !== projectFilter) {
        return false;
      }
      return true;
    });
  }, [entries, search, projectFilter]);

  const grouped = useMemo(() => {
    return filteredEntries.reduce((acc, e) => {
      (acc[e.date] ||= []).push(e);
      return acc;
    }, {});
  }, [filteredEntries]);

  if (employees === null) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-5 fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Team Work Logs</h1>
          <p className="text-xs text-text-muted mt-1">
            Review detailed daily task completions, project allocations, and worked hours.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-border px-3 py-1.5 rounded-xl shadow-xs">
            <User size={13} className="text-primary" />
            <select
              value={selected || ""}
              onChange={(e) => setSel(e.target.value)}
              className="bg-transparent text-xs font-semibold text-text outline-none cursor-pointer"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selected ? (
        <EmptyState text="No employees in roster." />
      ) : (
        <div className="space-y-4">
          {/* SEARCH & PROJECT FILTER BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-border shadow-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search size={14} className="text-text-muted shrink-0" />
              <input
                type="text"
                placeholder={`Search ${employee?.name || "employee"}'s work logs...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs text-text bg-transparent outline-none placeholder:text-text-faint"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="border border-border rounded-xl px-2.5 py-1.5 text-xs text-text bg-surface-muted outline-none cursor-pointer"
              >
                <option value="all">All Projects</option>
                {(projects || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DAY CARDS */}
          {Object.keys(grouped).length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-8 text-center text-xs text-text-muted">
              {search || projectFilter !== "all"
                ? "No work logs match your filter criteria."
                : `No work logged by ${employee?.name || "this employee"} yet.`}
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
                  const diff = worked !== null ? worked - 8 * 60 : null;

                  return (
                    <div
                      key={date}
                      className="bg-white border border-border rounded-2xl overflow-hidden shadow-xs"
                    >
                      {/* DAY HEADER */}
                      <div className="bg-surface-muted/60 px-4 py-3 border-b border-border-light flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs sm:text-sm font-semibold text-text">
                              {isoToBSLabel(date)}
                            </h3>
                            <span className="text-[11px] font-mono text-text-muted">
                              ({fmtDate(date)})
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            {items.length} task completion{items.length !== 1 ? "s" : ""}
                          </p>
                        </div>

                        {/* WORK STATS */}
                        <div className="flex items-center gap-3">
                          {attendance && (
                            <div className="text-[11px] font-mono text-text-muted hidden sm:block">
                              {fmtTime(attendance.clock_in)} –{" "}
                              {attendance.clock_out
                                ? fmtTime(attendance.clock_out)
                                : "Working"}
                            </div>
                          )}

                          {worked !== null && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-border-light text-text">
                                {formatDuration(worked)}
                              </span>

                              {diff > 0 ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-overtime bg-[#E8F5E2] px-2 py-0.5 rounded-md">
                                  <TrendingUp size={10} /> +{formatDuration(diff)} OT
                                </span>
                              ) : diff < 0 ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-alert bg-alert-light px-2 py-0.5 rounded-md">
                                  <TrendingDown size={10} /> -{formatDuration(Math.abs(diff))}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* TASK ENTRIES */}
                      <div className="p-4 divide-y divide-border-light">
                        {items.map((it) => {
                          const project = projectMap[it.project_id];

                          return (
                            <div
                              key={it.id}
                              className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs"
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-text leading-relaxed font-medium">
                                    {it.entry_text}
                                  </p>
                                </div>
                              </div>

                              {project && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0"
                                  style={{
                                    backgroundColor: `${project.color || "#0F3D3E"}15`,
                                    color: project.color || "#0F3D3E",
                                  }}
                                >
                                  <FolderKanban size={10} />
                                  <span>{project.name}</span>
                                </span>
                              )}
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
      )}
    </div>
  );
}

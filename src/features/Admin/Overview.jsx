import { useState, useMemo } from "react";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import {
  useLeaveRequests,
  useRoster,
  useOrgAttendance,
  useProjects,
} from "../../hooks/useOrgData";
import { fmtDate, fmtTime, todayISO } from "../../utils/workTime";
import { isoToBSLabel } from "../../utils/nepaliCalendar";
import { isLateClockIn, isDateWithinLeave, getWeekday } from "../../utils/attendance";
import {
  Users,
  Clock,
  Check,
  X,
  ArrowRight,
  Search,
  CheckCircle2,
  FolderKanban,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { getEmployeeColor } from "../../constants/colors";

export function AdminOverview() {
  const { employees } = useRoster();
  const { requests: allLeave, decide } = useLeaveRequests(null, "org");
  const { records: todayAttendance } = useOrgAttendance(todayISO());
  const { projects } = useProjects();

  const [teamSearch, setTeamSearch] = useState("");
  const [actingId, setActingId] = useState(null);

  const today = todayISO();
  const isWeekend = getWeekday(today) === 6;

  // Compute stats and attendance per employee
  const employeeStatusMap = useMemo(() => {
    if (!employees) return new Map();
    const map = new Map();

    const attendanceMap = new Map();
    (todayAttendance || []).forEach((att) => {
      attendanceMap.set(att.employee_id, att);
    });

    const approvedLeaves = (allLeave || []).filter((l) => l.status === "Approved");

    employees.forEach((emp) => {
      const att = attendanceMap.get(emp.id);
      const onLeave = approvedLeaves.find((l) =>
        l.employee_id === emp.id && isDateWithinLeave(today, l),
      );

      let status = "Absent";
      let time = null;

      if (att?.clock_in) {
        const isLate = isLateClockIn(att.clock_in);
        status = isLate ? "Late" : "Present";
        time = fmtTime(att.clock_in);
      } else if (onLeave) {
        status = "On Leave";
        time = onLeave.type;
      } else if (isWeekend) {
        status = "Holiday";
        time = "Saturday";
      }

      map.set(emp.id, { status, time, record: att, leave: onLeave });
    });

    return map;
  }, [employees, todayAttendance, allLeave, today, isWeekend]);

  if (employees === null || allLeave === null) return null;

  const pendingLeave = allLeave.filter((r) => r.status === "Pending");
  const presentCount = Array.from(employeeStatusMap.values()).filter(
    (s) => s.status === "Present" || s.status === "Late",
  ).length;
  const onLeaveCount = Array.from(employeeStatusMap.values()).filter(
    (s) => s.status === "On Leave",
  ).length;
  const absentCount = isWeekend
    ? 0
    : Array.from(employeeStatusMap.values()).filter((s) => s.status === "Absent").length;

  const attendancePct = employees.length > 0
    ? Math.round((presentCount / employees.length) * 100)
    : 0;

  const filteredEmployees = employees.filter((e) => {
    if (!teamSearch.trim()) return true;
    const q = teamSearch.toLowerCase();
    return (
      e.name?.toLowerCase().includes(q) ||
      e.role?.toLowerCase().includes(q) ||
      e.title?.toLowerCase().includes(q)
    );
  });

  const handleDecide = async (requestId, status) => {
    setActingId(requestId);
    try {
      await decide(requestId, status);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Admin Overview</h1>
          <p className="text-xs text-text-muted">
            Live team attendance, pending leave approvals, and workspace operations.
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-text">{isoToBSLabel(today)}</span>
          <span className="text-[11px] text-text-muted block">
            {new Date().toLocaleDateString("en-US", { weekday: "long" })}
          </span>
        </div>
      </div>

      {/* TOP 4 METRIC CARDS (REFERENCE STYLE) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* TOTAL EMPLOYEES */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-text-muted">Total Employees</span>
            <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-xs" />
          </div>
          <p className="text-2xl font-bold text-text">{employees.length}</p>
          <p className="text-[11px] text-text-muted mt-0.5">Active team members</p>
        </div>

        {/* PRESENT TODAY */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-text-muted">Present Today</span>
            <span className="w-2.5 h-2.5 rounded-full bg-success shadow-xs" />
          </div>
          <p className="text-2xl font-bold text-text">{presentCount}</p>
          <p className="text-[11px] text-success font-medium mt-0.5">
            {attendancePct}% attendance rate
          </p>
        </div>

        {/* ON LEAVE */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-text-muted">On Leave</span>
            <span className="w-2.5 h-2.5 rounded-full bg-warning shadow-xs" />
          </div>
          <p className="text-2xl font-bold text-text">{onLeaveCount}</p>
          <p className="text-[11px] text-warning font-medium mt-0.5">
            {pendingLeave.length} pending approval{pendingLeave.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ABSENT TODAY */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-text-muted">Absent Today</span>
            <span className="w-2.5 h-2.5 rounded-full bg-alert shadow-xs" />
          </div>
          <p className="text-2xl font-bold text-text">{absentCount}</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {absentCount > 0 ? "Unexcused missing" : "Zero unscheduled"}
          </p>
        </div>
      </div>

      {/* TWO COLUMN INTERACTIVE DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: TEAM TODAY (LIVE STATUS BOARD) */}
        <div className="lg:col-span-7 bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border-light">
            <div>
              <h2 className="text-sm font-bold text-text">Team Today</h2>
              <p className="text-[11px] text-text-muted">Live employee check-ins & statuses</p>
            </div>

            <div className="h-8 flex items-center gap-1.5 bg-surface-muted border border-border-light rounded-xl px-2.5 text-xs">
              <Search size={12} className="text-text-muted" />
              <input
                type="text"
                placeholder="Filter team..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="bg-transparent outline-none text-xs text-text placeholder:text-text-faint w-28 sm:w-36"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {filteredEmployees.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                No matching members found.
              </div>
            ) : (
              filteredEmployees.map((emp, i) => {
                const info = employeeStatusMap.get(emp.id) || { status: "Absent" };

                return (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border-light bg-surface-muted/30 hover:bg-surface-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                        style={{ backgroundColor: getEmployeeColor(emp) }}
                      >
                        {emp.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-text truncate">
                          {emp.name}
                        </h4>
                        <p className="text-[11px] text-text-muted truncate">
                          {emp.title || emp.role}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {info.status === "Present" && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-success-light text-success border border-success/30 text-[11px] font-semibold">
                          <span>Present</span>
                          {info.time && <span className="font-mono font-normal">· {info.time}</span>}
                        </div>
                      )}

                      {info.status === "Late" && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-warning-light text-warning border border-warning/30 text-[11px] font-semibold">
                          <span>Late</span>
                          {info.time && <span className="font-mono font-normal">· {info.time}</span>}
                        </div>
                      )}

                      {info.status === "On Leave" && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary-light text-primary border border-primary/30 text-[11px] font-semibold">
                          <span>On Leave</span>
                        </div>
                      )}

                      {info.status === "Absent" && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-alert-light text-alert border border-alert/30 text-[11px] font-semibold">
                          <span>Absent</span>
                        </div>
                      )}

                      {info.status === "Holiday" && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-muted text-text-muted border border-border text-[11px] font-semibold">
                          <span>Weekend</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PENDING LEAVE ACTIONS & PROJECTS */}
        <div className="lg:col-span-5 space-y-4">
          {/* PENDING LEAVE CARD */}
          <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-light">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-text">Pending Leave</h3>
                {pendingLeave.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-warning text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingLeave.length}
                  </span>
                )}
              </div>

              <NavLink
                to="/leave-approvals"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight size={11} />
              </NavLink>
            </div>

            {pendingLeave.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted">
                <CheckCircle2 size={24} className="text-success mx-auto mb-1.5" />
                <p className="font-semibold text-text">All caught up</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  No leave requests awaiting decision.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingLeave.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl bg-surface-muted/40 border border-border-light space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text">{r.employeeName}</span>
                      <span className="text-[10px] font-mono text-text-muted">
                        {r.type} · {r.days}d ({fmtDate(r.start_date)})
                      </span>
                    </div>

                    {r.reason && (
                      <p className="text-[11px] text-text-muted italic truncate">
                        "{r.reason}"
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleDecide(r.id, "Approved")}
                        disabled={actingId === r.id}
                        className="flex-1 py-1.5 rounded-lg bg-success-light hover:bg-success-light/80 text-success border border-success/30 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Check size={12} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleDecide(r.id, "Rejected")}
                        disabled={actingId === r.id}
                        className="flex-1 py-1.5 rounded-lg bg-alert-light hover:bg-alert-light/80 text-alert border border-alert/30 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
                      >
                        <X size={12} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTIVE PROJECTS PROGRESS */}
          <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-light">
              <h3 className="text-sm font-bold text-text">Active Projects</h3>
              <NavLink
                to="/projects"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Manage</span>
                <ArrowRight size={11} />
              </NavLink>
            </div>

            {(!projects || projects.length === 0) ? (
              <p className="text-xs text-text-muted py-3 text-center">No active projects.</p>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 4).map((proj) => (
                  <div key={proj.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-text">{proj.name}</span>
                      <span className="text-[10px] font-mono text-text-muted">
                        {proj.status || "In Progress"}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${proj.progress || 65}%`,
                          backgroundColor: proj.color || "#1E4E5F",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

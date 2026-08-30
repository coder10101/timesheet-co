import { useState, useMemo } from "react";
import {
  useLeaveRequests,
  useRoster,
  useOrgAttendance,
  useHolidays,
} from "../../hooks/useOrgData";
import {
  fmtDate,
  fmtTime,
  todayISO,
  formatDuration,
  getWorkedMinutes,
} from "../../utils/workTime";
import {
  isoToBSLabel,
  getTodayBS,
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
  isoToBS,
} from "../../utils/nepaliCalendar";
import {
  isLateClockIn,
  isDateWithinLeave,
  getWeekday,
} from "../../utils/attendance";
import {
  Users,
  Clock,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock3,
  CalendarDays,
  UserCheck,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { getEmployeeColor, COLORS } from "../../constants/colors";
import { WeeklyTurnoutBarChart } from "../../components/charts/WeeklyTurnoutBarChart";
import { PunctualityRadar } from "../../components/charts/PunctualityRadar";

export function AdminOverview() {
  const { employees } = useRoster();
  const { requests: allLeave } = useLeaveRequests(null, "org");
  const { records: todayAttendance } = useOrgAttendance(todayISO());
  const { records: allOrgAttendance } = useOrgAttendance(null);
  const { holidays } = useHolidays();

  const [leftTab, setLeftTab] = useState("live"); // "live" | "schedule"
  const [teamSearch, setTeamSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "Present" | "Late" | "On Leave" | "Absent"

  const today = todayISO();
  const todayBS = getTodayBS();
  const isWeekend = getWeekday(today) === 6;

  // Trackable staff: exclude admins from absence counting
  const trackableEmployees = useMemo(() => {
    if (!employees) return [];
    const regularStaff = employees.filter(
      (e) =>
        e.role?.toLowerCase() !== "admin" && e.title?.toLowerCase() !== "admin",
    );
    return regularStaff.length > 0 ? regularStaff : employees;
  }, [employees]);

  // 7-day schedule horizon
  const horizonDates = useMemo(() => {
    const dates = [];
    const [y, m, d] = today.split("-").map(Number);
    const cur = new Date(y, m - 1, d);

    for (let i = 0; i < 7; i++) {
      const cy = cur.getFullYear();
      const cm = String(cur.getMonth() + 1).padStart(2, "0");
      const cd = String(cur.getDate()).padStart(2, "0");
      dates.push(`${cy}-${cm}-${cd}`);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [today]);

  // Employee status mapping
  const employeeStatusMap = useMemo(() => {
    if (!employees) return new Map();
    const map = new Map();

    const attendanceMap = new Map();
    (todayAttendance || []).forEach((att) => {
      attendanceMap.set(att.employee_id, att);
    });

    const approvedLeaves = (allLeave || []).filter(
      (l) => l.status === "Approved",
    );

    employees.forEach((emp) => {
      const isAdmin =
        emp.role?.toLowerCase() === "admin" ||
        emp.title?.toLowerCase() === "admin";
      const att = attendanceMap.get(emp.id);
      const onLeave = approvedLeaves.find(
        (l) => l.employee_id === emp.id && isDateWithinLeave(today, l),
      );

      let status = "Absent";
      let time = null;
      let workedMin = 0;

      if (att?.clock_in) {
        const isLate = isLateClockIn(att.clock_in);
        status = isLate ? "Late" : "Present";
        time = fmtTime(att.clock_in);
        workedMin = getWorkedMinutes(
          att.clock_in,
          att.clock_out || new Date().toISOString(),
        );
      } else if (onLeave) {
        status = "On Leave";
        time = onLeave.type;
      } else if (isWeekend) {
        status = "Holiday";
        time = "Saturday";
      } else if (isAdmin) {
        status = "Admin";
        time = "Management";
      }

      map.set(emp.id, {
        status,
        time,
        workedMin,
        record: att,
        leave: onLeave,
        isAdmin,
      });
    });

    return map;
  }, [employees, todayAttendance, allLeave, today, isWeekend]);

  // 7-day schedule forecast
  const scheduleData = useMemo(() => {
    const totalStaff = trackableEmployees.length;
    const holidayMap = new Map();
    (holidays || []).forEach((h) => holidayMap.set(h.date, h.name));

    const approvedLeaves = (allLeave || []).filter(
      (r) => r.status === "Approved",
    );

    return horizonDates.map((date, idx) => {
      const weekday = getWeekday(date);
      const isSat = weekday === 6;
      const holidayName = holidayMap.get(date);
      const isHol = !!holidayName;
      const isToday = date === today;
      const bs = isoToBS(date);

      const onLeaveStaff = approvedLeaves
        .filter((l) => date >= l.start_date && date <= l.end_date)
        .map((l) => {
          const emp = trackableEmployees.find((e) => e.id === l.employee_id);
          return {
            id: l.employee_id,
            name: l.employeeName || emp?.name || "Staff",
            type: l.type,
            color: getEmployeeColor(l.employee_id, l.employeeName),
          };
        });

      const availableCount =
        isSat || isHol ? 0 : Math.max(0, totalStaff - onLeaveStaff.length);
      const capacityPct =
        totalStaff > 0 && !isSat && !isHol
          ? Math.round((availableCount / totalStaff) * 100)
          : 0;

      return {
        date,
        idx,
        isToday,
        weekday,
        isSat,
        isHol,
        holidayName,
        bs,
        totalStaff,
        availableCount,
        capacityPct,
        onLeaveStaff,
      };
    });
  }, [horizonDates, today, trackableEmployees, allLeave, holidays]);

  if (employees === null || allLeave === null) return null;

  const pendingLeave = allLeave.filter((r) => r.status === "Pending");

  // Trackable status counts
  const trackableStatuses = trackableEmployees.map(
    (e) => employeeStatusMap.get(e.id) || { status: "Absent" },
  );
  const onTimeCount = trackableStatuses.filter(
    (s) => s.status === "Present",
  ).length;
  const lateCount = trackableStatuses.filter((s) => s.status === "Late").length;
  const totalPresent = onTimeCount + lateCount;
  const onLeaveCount = trackableStatuses.filter(
    (s) => s.status === "On Leave",
  ).length;
  const absentCount = isWeekend
    ? 0
    : trackableStatuses.filter((s) => s.status === "Absent").length;

  const totalTrackable = trackableEmployees.length || 1;
  const attendancePct = Math.round((totalPresent / totalTrackable) * 100);

  const filteredEmployees = employees.filter((e) => {
    const info = employeeStatusMap.get(e.id);
    const status = info?.status || "Absent";

    if (statusFilter !== "all") {
      if (
        statusFilter === "Present" &&
        status !== "Present" &&
        status !== "Late"
      )
        return false;
      if (statusFilter === "Late" && status !== "Late") return false;
      if (statusFilter === "On Leave" && status !== "On Leave") return false;
      if (statusFilter === "Absent" && (status !== "Absent" || info?.isAdmin))
        return false;
    }

    if (!teamSearch.trim()) return true;
    const q = teamSearch.toLowerCase();
    return (
      e.name?.toLowerCase().includes(q) ||
      e.role?.toLowerCase().includes(q) ||
      e.title?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 fade-in pb-8">
      {/* 1. TOP HEADER & ATTENDANCE STATUS BAR */}
      <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-text">Overview</h1>
            <span className="text-xs font-bold text-primary bg-primary-light px-2.5 py-0.5 rounded-lg border border-primary/20">
              {isoToBSLabel(today)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-text-muted">
              {new Date().toLocaleDateString("en-US", { weekday: "long" })}
            </span>
            {pendingLeave.length > 0 && (
              <NavLink
                to="/leave-approvals"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-warning bg-warning-light px-2.5 py-0.5 rounded-md border border-warning/30 hover:bg-warning/20 transition-colors"
              >
                <span>
                  {pendingLeave.length} pending leave
                  {pendingLeave.length !== 1 ? "s" : ""}
                </span>
                <ArrowRight size={11} />
              </NavLink>
            )}
          </div>
        </div>

        {/* CLEAN STATUS STATS STRIP — now includes Total Staff, absorbing the deleted metric-cards grid */}
        <div className="space-y-2 pt-2 border-t border-border-light">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-medium">
              {/* TOTAL STAFF — moved here from the deleted metric-cards grid */}
              <div className="flex items-center gap-1.5 bg-surface-muted border border-border-light px-2.5 py-1 rounded-lg">
                <Users size={12} className="text-text-muted shrink-0" />
                <span className="font-bold text-text text-xs">
                  {employees.length} Total
                </span>
              </div>

              {/* PRESENT (ON-TIME + LATE) */}
              <div className="flex items-center gap-1.5 bg-success-light/40 border border-success/30 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                <span className="font-bold text-text text-xs">
                  {totalPresent} Present
                </span>
                {lateCount > 0 && (
                  <span className="text-[10px] text-warning font-semibold font-mono">
                    ({lateCount} late)
                  </span>
                )}
              </div>

              {/* ON LEAVE */}
              <div className="flex items-center gap-1.5 bg-primary-light/40 border border-primary/30 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span className="font-bold text-text text-xs">
                  {onLeaveCount} On Leave
                </span>
              </div>

              {/* ABSENT */}
              <div className="flex items-center gap-1.5 bg-alert-light/40 border border-alert/30 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-alert shrink-0" />
                <span className="font-bold text-text text-xs">
                  {absentCount} Absent
                </span>
              </div>
            </div>

            <span className="font-mono font-bold text-text text-xs bg-surface-muted px-2.5 py-1 rounded-lg border border-border-light">
              {attendancePct}% in office ({totalPresent}/{totalTrackable})
            </span>
          </div>

          {/* VISUAL SEGMENTED ATTENDANCE BAR */}
          <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${(onTimeCount / totalTrackable) * 100}%` }}
              className="bg-success h-full transition-all duration-500"
              title={`On Time: ${onTimeCount}`}
            />
            <div
              style={{ width: `${(lateCount / totalTrackable) * 100}%` }}
              className="bg-warning h-full transition-all duration-500"
              title={`Late: ${lateCount}`}
            />
            <div
              style={{ width: `${(onLeaveCount / totalTrackable) * 100}%` }}
              className="bg-primary h-full transition-all duration-500"
              title={`On Leave: ${onLeaveCount}`}
            />
          </div>
        </div>
      </div>

      {/* 2. WEEKLY TURNOUT BAR CHART */}
      <WeeklyTurnoutBarChart
        employees={trackableEmployees}
        allAttendance={allOrgAttendance}
        leaveRequests={allLeave}
        holidays={holidays}
        todayISO={today}
      />

      {/* 3. MAIN DASHBOARD: 2-COLUMN BALANCED VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (7 COLS): TABBED ROSTER & 7-DAY SCHEDULE */}
        <div className="lg:col-span-7 bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-3">
          {/* TAB SWITCHER & SEARCH */}
          <div className="flex items-center justify-between pb-2 border-b border-border-light">
            <div className="flex items-center gap-1 bg-surface-muted p-0.5 rounded-lg border border-border-light">
              <button
                onClick={() => setLeftTab("live")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  leftTab === "live"
                    ? "bg-white text-text shadow-2xs font-bold"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Today's Roster
              </button>
              <button
                onClick={() => setLeftTab("schedule")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  leftTab === "schedule"
                    ? "bg-white text-text shadow-2xs font-bold"
                    : "text-text-muted hover:text-text"
                }`}
              >
                7-Day Schedule
              </button>
            </div>

            {leftTab === "live" && (
              <div className="h-7 flex items-center gap-1.5 bg-surface-muted border border-border-light rounded-lg px-2 text-xs">
                <Search size={11} className="text-text-muted shrink-0" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="bg-transparent outline-none text-[11px] text-text placeholder:text-text-faint w-24 sm:w-28"
                />
              </div>
            )}
          </div>

          {/* TAB 1: LIVE ROSTER */}
          {leftTab === "live" ? (
            <div className="space-y-2.5">
              {/* FILTER PILLS */}
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                {[
                  { id: "all", label: `All (${employees.length})` },
                  { id: "Present", label: `Present (${totalPresent})` },
                  { id: "Late", label: `Late (${lateCount})` },
                  { id: "On Leave", label: `On Leave (${onLeaveCount})` },
                  { id: "Absent", label: `Absent (${absentCount})` },
                ].map((tab) => {
                  const active = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                        active
                          ? "bg-primary text-white"
                          : "bg-surface-muted hover:bg-surface-muted/80 text-text-muted border border-border-light"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ROSTER LIST */}
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredEmployees.length === 0 ? (
                  <div className="py-8 text-center text-xs text-text-muted">
                    No matching members found.
                  </div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const info = employeeStatusMap.get(emp.id) || {
                      status: "Absent",
                    };

                    return (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-border-light bg-surface-muted/30 hover:bg-surface-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                            style={{ backgroundColor: getEmployeeColor(emp) }}
                          >
                            {emp.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-text truncate leading-tight">
                              {emp.name}
                            </h4>
                            <p className="text-[10px] text-text-muted truncate">
                              {emp.title || emp.role} ·{" "}
                              {emp.department || "General"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {info.status === "Present" && (
                            <div className="space-y-0.2">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-success-light text-success border border-success/30 text-[9px] font-semibold">
                                Present
                              </span>
                              <p className="text-[9px] font-mono text-text-muted">
                                In {info.time}{" "}
                                {info.workedMin > 0 &&
                                  `· ${formatDuration(info.workedMin)}`}
                              </p>
                            </div>
                          )}

                          {info.status === "Late" && (
                            <div className="space-y-0.2">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-warning-light text-warning border border-warning/30 text-[9px] font-semibold">
                                Late Arrival
                              </span>
                              <p className="text-[9px] font-mono text-text-muted">
                                In {info.time}{" "}
                                {info.workedMin > 0 &&
                                  `· ${formatDuration(info.workedMin)}`}
                              </p>
                            </div>
                          )}

                          {info.status === "On Leave" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary-light text-primary border border-primary/30 text-[9px] font-semibold">
                              On Leave ({info.time || "Approved"})
                            </span>
                          )}

                          {info.status === "Admin" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-muted text-primary border border-primary/20 text-[9px] font-semibold font-mono">
                              Admin
                            </span>
                          )}

                          {info.status === "Absent" && !info.isAdmin && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-alert-light text-alert border border-alert/30 text-[9px] font-semibold">
                              Absent
                            </span>
                          )}

                          {info.status === "Holiday" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-muted text-text-muted border border-border text-[9px] font-semibold">
                              Saturday Off
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: 7-DAY SCHEDULE */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {scheduleData.map((d) => (
                <div
                  key={d.date}
                  className={`p-2.5 rounded-xl border space-y-1.5 ${
                    d.isToday
                      ? "bg-primary-light/40 border-primary"
                      : d.isSat || d.isHol
                        ? "bg-surface-muted/50 border-border-light"
                        : "bg-surface-muted/20 border-border-light"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-text">
                        {WEEKDAY_LABELS[d.weekday]},{" "}
                        {d.bs
                          ? `${d.bs.day} ${NEPALI_MONTHS[d.bs.month - 1]}`
                          : d.date}
                      </span>
                      {d.isToday && (
                        <span className="ml-1 text-[8px] font-bold text-primary bg-primary-light px-1 py-0.2 rounded font-mono">
                          Today
                        </span>
                      )}
                    </div>

                    {d.isSat ? (
                      <span className="text-[9px] text-text-muted font-medium bg-surface-muted px-1.5 py-0.2 rounded">
                        Saturday Off
                      </span>
                    ) : d.isHol ? (
                      <span className="text-[9px] text-warning font-semibold bg-warning-light px-1.5 py-0.2 rounded">
                        {d.holidayName || "Holiday"}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono font-bold text-text">
                        {d.availableCount}/{d.totalStaff} in ({d.capacityPct}%)
                      </span>
                    )}
                  </div>

                  {d.onLeaveStaff.length > 0 && (
                    <div className="pt-1 border-t border-border-light/70 flex flex-wrap gap-1">
                      {d.onLeaveStaff.map((staff) => (
                        <span
                          key={staff.id}
                          className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.2 rounded bg-white border border-border shadow-2xs"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: staff.color }}
                          />
                          <span>{staff.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5 COLS): PUNCTUALITY LEADERBOARD — now sees ALL employees, not just non-admins */}
        <div className="lg:col-span-5 space-y-4">
          <PunctualityRadar
            employees={employees}
            allAttendance={allOrgAttendance}
            currentBSMonth={todayBS.month}
            currentBSYear={todayBS.year}
          />
        </div>
      </div>
    </div>
  );
}

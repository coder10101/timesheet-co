import { useState, useMemo } from "react";
import {
  useRoster,
  useAttendance,
  useHolidays,
  useLeaveRequests,
  useWorkLogs,
} from "../../hooks/useOrgData";
import {
  fmtDate,
  fmtTime,
  todayISO,
  formatDuration,
  getWorkedMinutes,
  getEffectiveClockOut,
} from "../../utils/workTime";
import { useOfficeHours } from "../../constants/officeHours";
import {
  isoToBS,
  getTodayBS,
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
  getDaysInBSMonth,
  bsDateToISO,
} from "../../utils/nepaliCalendar";
import {
  isLateClockIn,
  isEarlyClockIn,
  isDateWithinLeave,
  getWeekday,
  formatDifference,
} from "../../utils/attendance";
import { isHalfDayLeave } from "../../utils/leaveUtils";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingUp,
  MapPin,
  Settings,
  Coffee,
  Users,
} from "lucide-react";
import { getEmployeeColor, COLORS } from "../../constants/colors";
import { WorkHoursChart } from "../../components/charts/WorkHoursChart";
import { getSiteSummaryForDate } from "../../utils/workType";
import { EditOfficeHoursModal } from "./EditOfficeHoursModal";

export function AdminAttendance() {
  const officeHours = useOfficeHours();
  const { employees, staff, activeStaff } = useRoster();
  const todayStr = todayISO();
  const today = todayStr;
  const todayBS = getTodayBS();

  const [memberStatusFilter, setMemberStatusFilter] = useState("active"); // "active" | "all"

  const allStaffMembers = useMemo(() => {
    if (staff && staff.length > 0) return staff;
    return employees || [];
  }, [staff, employees]);

  const activeStaffMembers = useMemo(() => {
    if (activeStaff && activeStaff.length > 0) return activeStaff;
    return allStaffMembers.filter((e) => e.is_active !== false);
  }, [activeStaff, allStaffMembers]);

  const staffMembers = useMemo(() => {
    if (memberStatusFilter === "all") return allStaffMembers;
    return activeStaffMembers;
  }, [memberStatusFilter, allStaffMembers, activeStaffMembers]);

  const [selected, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [selectedBSMonth, setSelectedBSMonth] = useState(todayBS.month);
  const [selectedBSYear, setSelectedBSYear] = useState(todayBS.year);
  const [showHoursModal, setShowHoursModal] = useState(false);

  const effectiveSelectedId = useMemo(() => {
    if (selected && allStaffMembers.some((e) => e.id === selected)) return selected;
    if (staffMembers && staffMembers.length > 0) return staffMembers[0].id;
    if (allStaffMembers && allStaffMembers.length > 0) return allStaffMembers[0].id;
    return null;
  }, [selected, staffMembers, allStaffMembers]);

  const { records } = useAttendance(effectiveSelectedId);
  const { entries: workLogs } = useWorkLogs(effectiveSelectedId);
  const { requests: leaveRequests } = useLeaveRequests(null, "org");
  const { holidays } = useHolidays();

  const selectedEmployee = useMemo(() => {
    if (!allStaffMembers || !effectiveSelectedId) return null;
    return allStaffMembers.find((e) => e.id === effectiveSelectedId) || null;
  }, [allStaffMembers, effectiveSelectedId]);

  const filteredEmployees = useMemo(() => {
    if (!staffMembers) return [];
    return staffMembers.filter((emp) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        emp.name?.toLowerCase().includes(q) ||
        emp.role?.toLowerCase().includes(q) ||
        emp.title?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q)
      );
    });
  }, [staffMembers, search]);

  const monthDates = useMemo(() => {
    const totalDays = getDaysInBSMonth(selectedBSYear, selectedBSMonth);
    const list = [];
    for (let d = 1; d <= totalDays; d++) {
      list.push({
        bsDay: d,
        isoDate: bsDateToISO(selectedBSYear, selectedBSMonth, d),
      });
    }
    return list;
  }, [selectedBSYear, selectedBSMonth]);

  const siteSummaryByDate = useMemo(() => {
    const map = new Map();
    if (!workLogs || !workLogs.length) return map;
    monthDates.forEach((d) => {
      const summary = getSiteSummaryForDate(
        workLogs,
        d.isoDate,
        officeHours.workDayHours,
      );
      if (summary.hasSiteVisit) {
        map.set(d.isoDate, summary);
      }
    });
    return map;
  }, [monthDates, workLogs, officeHours]);

  const monthRecords = useMemo(() => {
    if (monthDates.length === 0) return [];
    const minISO = monthDates[0].isoDate;
    const maxISO = monthDates[monthDates.length - 1].isoDate;
    const recs = (records || [])
      .filter((r) => r.date >= minISO && r.date <= maxISO)
      .map((r) => ({ ...r }));
    const recDateMap = new Map(recs.map((r) => [r.date, r]));

    // Include days that have site visits even if no office punch exists
    if (workLogs && workLogs.length > 0) {
      monthDates.forEach((d) => {
        if (!recDateMap.has(d.isoDate)) {
          const site = siteSummaryByDate.get(d.isoDate);
          if (site?.hasSiteVisit) {
            recs.push({
              id: `site-${d.isoDate}`,
              date: d.isoDate,
              clock_in: null,
              clock_out: null,
              is_site_only: true,
              site_hours: site.totalHours,
            });
          }
        }
      });
    }

    return recs.sort((a, b) => b.date.localeCompare(a.date));
  }, [records, monthDates, workLogs, siteSummaryByDate]);

  const displayedRecords = useMemo(() => {
    if (filterTab === "site") {
      return monthRecords.filter((r) => {
        const site = siteSummaryByDate.get(r.date);
        return r.is_site_only || !!site?.hasSiteVisit;
      });
    }
    if (filterTab === "office") {
      return monthRecords.filter((r) => {
        const site = siteSummaryByDate.get(r.date);
        return !r.is_site_only && !site?.hasSiteVisit;
      });
    }
    return monthRecords;
  }, [monthRecords, filterTab, siteSummaryByDate]);

  const employeeLeaves = useMemo(() => {
    return (leaveRequests || []).filter(
      (r) => r.employee_id === effectiveSelectedId && r.status === "Approved",
    );
  }, [leaveRequests, effectiveSelectedId]);

  // Aggregate monthly stats
  const monthPresentCount = monthRecords.filter((r) => {
    const leave = employeeLeaves.find((l) => isDateWithinLeave(r.date, l));
    return (
      r.is_site_only ||
      (r.clock_in && !isLateClockIn(r.clock_in, leave, officeHours))
    );
  }).length;

  const monthLateCount = monthRecords.filter((r) => {
    const leave = employeeLeaves.find((l) => isDateWithinLeave(r.date, l));
    return r.clock_in && isLateClockIn(r.clock_in, leave, officeHours);
  }).length;

  const totalWorkedMinutes = monthRecords.reduce((acc, r) => {
    if (r.is_site_only) {
      return acc + Math.round((r.site_hours || officeHours.workDayHours) * 60);
    }
    const effOut = getEffectiveClockOut(r, todayStr, officeHours.endTime);
    if (r.clock_in && effOut) {
      return acc + getWorkedMinutes(r.clock_in, effOut, r.break_minutes || 0);
    }
    return acc;
  }, 0);

  const netOvertimeMinutes = monthRecords.reduce((acc, r) => {
    if (r.is_site_only) {
      const worked = Math.round(
        (r.site_hours || officeHours.workDayHours) * 60,
      );
      return acc + (worked - officeHours.workDayMinutes);
    }
    const effOut = getEffectiveClockOut(r, todayStr, officeHours.endTime);
    if (r.clock_in && effOut) {
      const worked = getWorkedMinutes(r.clock_in, effOut, r.break_minutes || 0);
      return acc + (worked - officeHours.workDayMinutes);
    }
    return acc;
  }, 0);

  const handlePrevMonth = () => {
    if (selectedBSMonth === 1) {
      setSelectedBSMonth(12);
      setSelectedBSYear((y) => y - 1);
    } else {
      setSelectedBSMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedBSMonth === 12) {
      setSelectedBSMonth(1);
      setSelectedBSYear((y) => y + 1);
    } else {
      setSelectedBSMonth((m) => m + 1);
    }
  };

  const isStaffLoading = employees === null;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 fade-in pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Attendance Monitor</h1>
          <p className="text-xs text-text-muted">
            Track daily work hours, check-ins, departures, and monthly records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowHoursModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-surface-muted text-xs font-semibold text-text transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
          title="Configure Organization Shift Hours"
        >
          <Clock size={13} className="text-primary" />
          <span>
            {officeHours.workDayHours}h Shift ({officeHours.startTimeAmPm} –{" "}
            {officeHours.endTimeAmPm})
          </span>
          <Settings size={12} className="text-text-muted ml-0.5" />
        </button>
      </div>

      {/* 2-COLUMN MASTER-DETAIL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: EMPLOYEES */}
        <div className="lg:col-span-4 bg-white border border-border rounded-2xl p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between px-1 gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Team Members
            </span>
            <div className="flex items-center gap-1 bg-surface-muted p-0.5 rounded-lg border border-border-light text-[10px]">
              <button
                type="button"
                onClick={() => setMemberStatusFilter("active")}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                  memberStatusFilter === "active"
                    ? "bg-primary text-white shadow-2xs"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Active ({activeStaffMembers.length})
              </button>
              <button
                type="button"
                onClick={() => setMemberStatusFilter("all")}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                  memberStatusFilter === "all"
                    ? "bg-primary text-white shadow-2xs"
                    : "text-text-muted hover:text-text"
                }`}
              >
                All ({allStaffMembers.length})
              </button>
            </div>
          </div>

          <div className="h-9 flex items-center gap-1.5 bg-surface-muted border border-border-light rounded-xl px-2.5 text-xs focus-within:border-primary">
            <Search size={13} className="text-text-muted shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team..."
              className="w-full bg-transparent outline-none text-text text-xs"
            />
          </div>

          <div className="space-y-1 max-h-[580px] overflow-y-auto pr-0.5">
            {isStaffLoading ? (
              <div className="space-y-2 p-1">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-border-light bg-surface-muted/30 animate-pulse"
                  >
                    <div className="w-8 h-8 rounded-xl bg-surface-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 bg-surface-muted rounded" />
                      <div className="h-2.5 w-20 bg-surface-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = emp.id === effectiveSelectedId;

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
                      <h4 className="text-xs font-bold text-text truncate flex items-center gap-1.5">
                        <span className="truncate">{emp.name}</span>
                        {emp.is_active === false && (
                          <span className="text-[8px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-1 py-0.2 shrink-0">
                            Inactive
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-text-muted truncate">
                        {emp.title || emp.role || "Staff"} ·{" "}
                        {emp.department || "General"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ATTENDANCE LOG & DETAIL */}
        <div className="lg:col-span-8 space-y-3.5">
          {isStaffLoading ? (
            <div className="space-y-3.5 animate-pulse">
              {/* Profile card skeleton */}
              <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-surface-muted" />
                  <div className="space-y-2">
                    <div className="h-4 w-36 bg-surface-muted rounded" />
                    <div className="h-3 w-24 bg-surface-muted rounded" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-16 h-12 rounded-xl bg-surface-muted" />
                  <div className="w-16 h-12 rounded-xl bg-surface-muted" />
                  <div className="w-20 h-12 rounded-xl bg-surface-muted" />
                </div>
              </div>
              {/* Chart skeleton */}
              <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs h-64 flex flex-col justify-between">
                <div className="h-4 w-40 bg-surface-muted rounded" />
                <div className="h-44 w-full bg-surface-muted/50 rounded-xl" />
              </div>
              {/* Table skeleton */}
              <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="h-4 w-32 bg-surface-muted rounded" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-full bg-surface-muted/40 rounded-lg"
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : !selectedEmployee ? (
            <div className="bg-white border border-border rounded-2xl p-12 text-center text-xs text-text-muted shadow-2xs">
              <Users size={32} className="mx-auto mb-2 text-text-faint" />
              <p className="font-semibold text-text">No team member selected</p>
              <p className="text-[11px] text-text-muted mt-0.5">
                Select an employee from the left panel to inspect their attendance
                history.
              </p>
            </div>
          ) : (
            <>
              {/* PROFILE HEADER & STATS CARD */}
              <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-xs"
                  style={{
                    backgroundColor: getEmployeeColor(selectedEmployee),
                  }}
                >
                  {selectedEmployee.name?.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-bold text-text truncate flex items-center gap-2">
                    <span className="truncate">{selectedEmployee.name}</span>
                    {selectedEmployee.is_active === false && (
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-0.5 shrink-0">
                        Inactive / Former Member
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-text-muted truncate">
                    {selectedEmployee.title || selectedEmployee.role}
                    {selectedEmployee.department &&
                      ` · ${selectedEmployee.department}`}
                  </p>
                </div>
              </div>

              {/* MONTHLY SUMMARY METRICS */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <div className="bg-success-light border border-success/30 rounded-xl px-2.5 py-1.5 text-center min-w-[65px]">
                  <span className="text-success text-sm font-mono font-bold block leading-none">
                    {monthPresentCount}
                  </span>
                  <span className="text-[9px] text-success font-semibold uppercase tracking-wider">
                    On-Time
                  </span>
                </div>

                <div className="bg-warning-light border border-warning/30 rounded-xl px-2.5 py-1.5 text-center min-w-[65px]">
                  <span className="text-warning text-sm font-mono font-bold block leading-none">
                    {monthLateCount}
                  </span>
                  <span className="text-[9px] text-warning font-semibold uppercase tracking-wider">
                    Late
                  </span>
                </div>

                <div
                  className={`border rounded-xl px-2.5 py-1.5 text-center min-w-[75px] ${
                    netOvertimeMinutes > 0
                      ? "bg-success-light border-success/30 text-success"
                      : netOvertimeMinutes < 0
                        ? "bg-alert-light border-alert/30 text-alert"
                        : "bg-surface-muted border-border text-text-muted"
                  }`}
                >
                  <span className="text-sm font-mono font-bold block leading-none">
                    {netOvertimeMinutes > 0
                      ? `+${formatDifference(netOvertimeMinutes)}`
                      : netOvertimeMinutes < 0
                        ? `-${formatDifference(Math.abs(netOvertimeMinutes))}`
                        : "0m"}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider block mt-0.5">
                    {netOvertimeMinutes >= 0 ? "Overtime" : "Short"}
                  </span>
                </div>
              </div>
            </div>

          {/* DAILY WORK HOURS & OVERTIME VARIANCE BAR CHART */}
          <WorkHoursChart
            monthDates={monthDates}
            records={monthRecords}
            employeeName={selectedEmployee?.name}
          />

          {/* ATTENDANCE LOG TABLE CARD */}
          <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-2xs">
            {/* LOG HEADER & MONTH SELECTOR */}
            <div className="px-4 py-3.5 border-b border-border-light flex items-center justify-between gap-3 bg-surface-muted/30">
              <div>
                <h3 className="text-xs font-bold text-text">Monthly Logs</h3>
                <p className="text-[10px] text-text-muted">
                  {monthRecords.length} record
                  {monthRecords.length !== 1 ? "s" : ""} in{" "}
                  {NEPALI_MONTHS[selectedBSMonth - 1]} {selectedBSYear}
                </p>
              </div>

              {/* MONTH SWITCHER */}
              <div className="flex items-center gap-1.5 bg-white border border-border rounded-xl p-1 shadow-2xs">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-surface-muted text-text-muted hover:text-text transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft size={14} />
                </button>

                <select
                  value={selectedBSMonth}
                  onChange={(e) => setSelectedBSMonth(Number(e.target.value))}
                  className="h-7 bg-transparent border-0 px-2 text-xs font-bold text-text outline-none cursor-pointer"
                >
                  {NEPALI_MONTHS.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name} {selectedBSYear}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg hover:bg-surface-muted text-text-muted hover:text-text transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* FILTER TABS: ALL RECORDS vs OFFICE ONLY vs SITE DUTY */}
            <div className="px-4 py-2 bg-surface-muted/20 border-b border-border-light flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-0.5 bg-surface-muted rounded-xl border border-border-light text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    filterTab === "all"
                      ? "bg-white text-text shadow-xs border border-border/50"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  All Days ({monthRecords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("office")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    filterTab === "office"
                      ? "bg-white text-text shadow-xs border border-border/50"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Office Only
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("site")}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    filterTab === "site"
                      ? "bg-[#63537E] text-white shadow-xs"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <MapPin size={12} />
                  <span>Site Duty</span>
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      filterTab === "site"
                        ? "bg-white/20 text-white"
                        : "bg-[#EEEAF2] text-[#63537E]"
                    }`}
                  >
                    {
                      monthRecords.filter(
                        (r) =>
                          r.is_site_only ||
                          siteSummaryByDate.get(r.date)?.hasSiteVisit,
                      ).length
                    }
                  </span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-text-muted">
                Showing {displayedRecords.length} of {monthRecords.length}
              </span>
            </div>

            {/* TABLE */}
            {records === null ? (
              <div className="py-8 text-center text-xs text-text-muted">
                Loading logs...
              </div>
            ) : displayedRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">
                {filterTab === "site"
                  ? "No site visits logged for this month."
                  : `No attendance records for ${NEPALI_MONTHS[selectedBSMonth - 1]} ${selectedBSYear}.`}
              </div>
            ) : (
              <div className="overflow-x-auto w-full max-w-full touch-pan-x">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="bg-surface-muted/60 text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border-light">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Clock In</th>
                      <th className="px-3 py-2.5">Clock Out</th>
                      <th className="px-3 py-2.5">Duration</th>
                      <th className="px-3 py-2.5">Shift Variance</th>
                      <th className="px-4 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {displayedRecords.map((r) => {
                      const siteInfo = siteSummaryByDate.get(r.date);
                      const hasSite = !!siteInfo?.hasSiteVisit;
                      const isToday = r.date === todayStr;
                      const isOnBreak = isToday && !!r.break_start && !r.clock_out;
                      const activeBreakMinutes = isOnBreak
                        ? Math.max(
                            0,
                            Math.round(
                              (new Date().getTime() -
                                new Date(r.break_start).getTime()) /
                                60000,
                            ),
                          )
                        : 0;
                      const totalBreaks = (r.break_minutes || 0) + activeBreakMinutes;
                      const effOut = getEffectiveClockOut(
                        r,
                        todayStr,
                        officeHours.endTime,
                      );
                      const isAutoClockOut =
                        !r.clock_out && !isToday && !!r.clock_in;
                      const leave = employeeLeaves.find((l) =>
                        isDateWithinLeave(r.date, l),
                      );
                      const isHalf = isHalfDayLeave(leave);
                      const targetMins = isHalf
                        ? officeHours.halfDayMinutes
                        : officeHours.workDayMinutes;
                      const workedMinutes = r.is_site_only
                        ? Math.round(
                            (r.site_hours || officeHours.workDayHours) * 60,
                          )
                        : r.clock_in && effOut
                          ? getWorkedMinutes(
                              r.clock_in,
                              effOut,
                              totalBreaks,
                            )
                          : null;
                      const isLate =
                        r.clock_in &&
                        isLateClockIn(r.clock_in, leave, officeHours);
                      const bs = isoToBS(r.date);
                      const weekday = getWeekday(r.date);
                      const diffMinutes =
                        workedMinutes !== null ? workedMinutes - targetMins : 0;

                      return (
                        <tr
                          key={r.id || r.date}
                          className="hover:bg-surface-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-bold text-text">
                              {bs
                                ? `${bs.day} ${NEPALI_MONTHS[bs.month - 1]}`
                                : r.date}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              {WEEKDAY_LABELS[weekday]}
                            </div>
                          </td>

                          <td className="px-3 py-3 font-mono text-xs text-text font-medium">
                            {r.is_site_only ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#63537E] bg-[#EEEAF2] border border-[#63537E]/30 px-1.5 py-0.5 rounded">
                                <MapPin size={9} /> Site Duty
                              </span>
                            ) : (
                              <>
                                {r.clock_in ? fmtTime(r.clock_in) : "—"}
                                {isHalf && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.2 rounded ml-1">
                                    ½d Leave
                                  </span>
                                )}
                                {hasSite && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#63537E] bg-[#EEEAF2] px-1.5 py-0.2 rounded ml-1">
                                    <MapPin size={8} /> Site
                                  </span>
                                )}
                              </>
                            )}
                          </td>

                          <td className="px-3 py-3 font-mono text-xs text-text font-medium">
                            {r.is_site_only ? (
                              <span className="text-[11px] text-text-muted">
                                Field Visit
                              </span>
                            ) : r.clock_out ? (
                              fmtTime(r.clock_out)
                            ) : isToday && r.clock_in ? (
                              isOnBreak ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                                  <Coffee size={10} className="text-amber-600 animate-pulse" />
                                  On Break
                                </span>
                              ) : (
                                <span className="text-primary italic font-sans text-[11px]">
                                  Working
                                </span>
                              )
                            ) : isAutoClockOut ? (
                              <div className="flex items-center gap-1">
                                <span>{officeHours.endTimeAmPm}</span>
                                <span
                                  className="text-[9px] font-semibold text-text-muted bg-surface-muted border border-border-light px-1 py-0.2 rounded"
                                  title={`Auto-closed at standard ${officeHours.endTimeAmPm}`}
                                >
                                  Auto
                                </span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-3 py-3 font-mono text-xs font-semibold text-text">
                            {workedMinutes !== null && workedMinutes > 0 ? (
                              <div>
                                <div>{formatDuration(workedMinutes)}</div>
                                {totalBreaks > 0 && (
                                  <div className="text-[10px] text-amber-600 font-sans font-medium">
                                    ☕ {totalBreaks}m break
                                    {isOnBreak && ` (${activeBreakMinutes}m active)`}
                                  </div>
                                )}
                              </div>
                            ) : isToday && r.clock_in && !r.clock_out ? (
                              <div>
                                <span className="text-xs font-normal text-text-muted italic">
                                  In progress
                                </span>
                                {isOnBreak ? (
                                  <div className="text-[10px] text-amber-600 font-sans font-medium">
                                    ☕ {totalBreaks}m break ({activeBreakMinutes}m active)
                                  </div>
                                ) : totalBreaks > 0 ? (
                                  <div className="text-[10px] text-amber-600 font-sans font-medium">
                                    ☕ {totalBreaks}m break
                                  </div>
                                ) : null}
                              </div>
                            ) : totalBreaks > 0 ? (
                              <div>
                                <div>—</div>
                                <div className="text-[10px] text-amber-600 font-sans font-medium">
                                  ☕ {totalBreaks}m break
                                </div>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-3 py-3 font-mono text-[11px]">
                            {workedMinutes !== null && workedMinutes > 0 ? (
                              diffMinutes > 0 ? (
                                <span className="text-success font-bold">
                                  +{formatDifference(diffMinutes)}
                                </span>
                              ) : diffMinutes < 0 ? (
                                <span className="text-alert font-bold">
                                  -{formatDifference(Math.abs(diffMinutes))}
                                </span>
                              ) : (
                                <span className="text-text-muted">
                                  {isHalf
                                    ? `${officeHours.halfDayMinutes / 60}h standard`
                                    : `${officeHours.workDayHours}h standard`}
                                </span>
                              )
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {r.is_site_only ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEEAF2] text-[#63537E] border border-[#63537E]/30 text-[10px] font-semibold">
                                <MapPin size={9} /> Site Visit
                              </span>
                            ) : isOnBreak ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 border border-amber-500/30 text-[10px] font-bold">
                                <Coffee size={10} className="text-amber-600 animate-pulse" />
                                On Break
                              </span>
                            ) : isLate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning-light text-warning border border-warning/30 text-[10px] font-semibold">
                                Late {isHalf && "· ½d"}
                                {hasSite && "· Site"}
                              </span>
                            ) : r.clock_in ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success-light text-success border border-success/30 text-[10px] font-semibold">
                                On-Time {isHalf && "· ½d"}
                                {hasSite && "· Site"}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-surface-muted text-text-muted border border-border text-[10px] font-semibold">
                                No entry
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>

      <EditOfficeHoursModal
        isOpen={showHoursModal}
        onClose={() => setShowHoursModal(false)}
        orgId={officeHours.orgId}
      />
    </div>
  );
}

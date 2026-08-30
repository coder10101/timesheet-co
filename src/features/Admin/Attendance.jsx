import { useState, useMemo } from "react";
import {
  useRoster,
  useAttendance,
  useHolidays,
  useLeaveRequests,
} from "../../hooks/useOrgData";
import {
  fmtDate,
  fmtTime,
  todayISO,
  formatDuration,
  getWorkedMinutes,
  WORK_DAY_MINUTES,
} from "../../utils/workTime";
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
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { getEmployeeColor, COLORS } from "../../constants/colors";
import { WorkHoursChart } from "../../components/charts/WorkHoursChart";

export function AdminAttendance() {
  const { employees } = useRoster();
  const today = todayISO();
  const todayBS = getTodayBS();

  const [selected, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [selectedBSMonth, setSelectedBSMonth] = useState(todayBS.month);
  const [selectedBSYear, setSelectedBSYear] = useState(todayBS.year);

  const effectiveSelectedId = useMemo(() => {
    if (selected) return selected;
    if (employees && employees.length > 0) return employees[0].id;
    return null;
  }, [selected, employees]);

  const { records } = useAttendance(effectiveSelectedId);
  const { requests: leaveRequests } = useLeaveRequests(null, "org");
  const { holidays } = useHolidays();

  const selectedEmployee = useMemo(() => {
    if (!employees || !effectiveSelectedId) return null;
    return employees.find((e) => e.id === effectiveSelectedId) || null;
  }, [employees, effectiveSelectedId]);

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        emp.name?.toLowerCase().includes(q) ||
        emp.role?.toLowerCase().includes(q) ||
        emp.title?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q)
      );
    });
  }, [employees, search]);

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

  const monthRecords = useMemo(() => {
    if (!records || monthDates.length === 0) return [];
    const minISO = monthDates[0].isoDate;
    const maxISO = monthDates[monthDates.length - 1].isoDate;
    return records
      .filter((r) => r.date >= minISO && r.date <= maxISO)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, monthDates]);

  // Aggregate monthly stats
  const monthPresentCount = monthRecords.filter(
    (r) => r.clock_in && !isLateClockIn(r.clock_in),
  ).length;
  const monthLateCount = monthRecords.filter(
    (r) => r.clock_in && isLateClockIn(r.clock_in),
  ).length;
  const totalWorkedMinutes = monthRecords.reduce((acc, r) => {
    if (r.clock_in && r.clock_out) {
      return acc + getWorkedMinutes(r.clock_in, r.clock_out);
    }
    return acc;
  }, 0);
  const netOvertimeMinutes = monthRecords.reduce((acc, r) => {
    if (r.clock_in && r.clock_out) {
      const worked = getWorkedMinutes(r.clock_in, r.clock_out);
      return acc + (worked - WORK_DAY_MINUTES);
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

  if (employees === null) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-4 fade-in pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Attendance Monitor</h1>
          <p className="text-xs text-text-muted">
            Track daily work hours, check-ins, departures, and monthly records.
          </p>
        </div>
      </div>

      {/* 2-COLUMN MASTER-DETAIL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: EMPLOYEES */}
        <div className="lg:col-span-4 bg-white border border-border rounded-2xl p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Team Members
            </span>
            <span className="text-xs font-mono font-medium text-text-muted">
              {employees.length} total
            </span>
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
            {filteredEmployees.map((emp) => {
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
                    <h4 className="text-xs font-bold text-text truncate">
                      {emp.name}
                    </h4>
                    <p className="text-[10px] text-text-muted truncate">
                      {emp.title || emp.role || "Staff"} ·{" "}
                      {emp.department || "General"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: ATTENDANCE LOG & DETAIL */}
        <div className="lg:col-span-8 space-y-3.5">
          {/* PROFILE HEADER & STATS CARD */}
          {selectedEmployee && (
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
                  <h2 className="text-base font-bold text-text truncate">
                    {selectedEmployee.name}
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

                <div className="bg-primary-light border border-primary/30 rounded-xl px-2.5 py-1.5 text-center min-w-[75px]">
                  <span className="text-primary text-sm font-mono font-bold block leading-none">
                    {formatDuration(totalWorkedMinutes)}
                  </span>
                  <span className="text-[9px] text-primary font-semibold uppercase tracking-wider">
                    Monthly
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
          )}

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

            {/* TABLE */}
            {records === null ? (
              <div className="py-8 text-center text-xs text-text-muted">
                Loading logs...
              </div>
            ) : monthRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">
                No attendance records for {NEPALI_MONTHS[selectedBSMonth - 1]}{" "}
                {selectedBSYear}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
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
                    {monthRecords.map((r) => {
                      const workedMinutes =
                        r.clock_in && r.clock_out
                          ? getWorkedMinutes(r.clock_in, r.clock_out)
                          : null;
                      const isLate = isLateClockIn(r.clock_in);
                      const bs = isoToBS(r.date);
                      const weekday = getWeekday(r.date);
                      const diffMinutes =
                        workedMinutes !== null
                          ? workedMinutes - WORK_DAY_MINUTES
                          : 0;

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
                            {r.clock_in ? fmtTime(r.clock_in) : "—"}
                          </td>

                          <td className="px-3 py-3 font-mono text-xs text-text font-medium">
                            {r.clock_out ? (
                              fmtTime(r.clock_out)
                            ) : r.clock_in ? (
                              <span className="text-primary italic font-sans text-[11px]">
                                Working
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-3 py-3 font-mono text-xs font-semibold text-text">
                            {workedMinutes !== null && workedMinutes > 0
                              ? formatDuration(workedMinutes)
                              : "—"}
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
                                  8h standard
                                </span>
                              )
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {isLate ? (
                              <span className="px-2 py-0.5 rounded-md bg-warning-light text-warning border border-warning/30 text-[10px] font-semibold">
                                Late
                              </span>
                            ) : r.clock_in ? (
                              <span className="px-2 py-0.5 rounded-md bg-success-light text-success border border-success/30 text-[10px] font-semibold">
                                On-Time
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
        </div>
      </div>
    </div>
  );
}

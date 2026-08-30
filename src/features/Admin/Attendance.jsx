import { useEffect, useState, useMemo } from "react";
import {
  useRoster,
  useAttendance,
  useOrgAttendance,
  useLeaveRequests,
} from "../../hooks/useOrgData";
import {
  fmtDate,
  fmtTime,
  formatDuration,
  getWorkedMinutes,
  todayISO,
} from "../../utils/workTime";
import {
  getTodayBS,
  NEPALI_MONTHS,
  isoToBS,
  isoToBSLabel,
} from "../../utils/nepaliCalendar";
import { isLateClockIn, isDateWithinLeave, getWeekday, isEarlyClockIn } from "../../utils/attendance";
import { getEmployeeColor } from "../../constants/colors";
import { Search } from "lucide-react";

export function AdminAttendance() {
  const { employees } = useRoster();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const today = todayISO();
  const todayBS = getTodayBS();

  const [selectedBSMonth, setSelectedBSMonth] = useState(todayBS.month);
  const [selectedBSYear, setSelectedBSYear] = useState(todayBS.year);

  const { records: allTodayAttendance } = useOrgAttendance(today);
  const { requests: allLeave } = useLeaveRequests(null, "org");

  useEffect(() => {
    if (!selectedId && employees?.length) {
      setSelectedId(employees[0].id);
    }
  }, [employees, selectedId]);

  const selected = selectedId || employees?.[0]?.id || null;
  const { records, updateAttendance } = useAttendance(selected);

  const selectedEmployee = useMemo(() => {
    return (employees || []).find((e) => e.id === selected) || employees?.[0];
  }, [employees, selected]);

  // Today status per employee
  const employeeTodayStatus = useMemo(() => {
    if (!employees) return new Map();
    const map = new Map();

    const attMap = new Map();
    (allTodayAttendance || []).forEach((att) => {
      attMap.set(att.employee_id, att);
    });

    const approvedLeaves = (allLeave || []).filter((l) => l.status === "Approved");
    const isSat = getWeekday(today) === 6;

    employees.forEach((emp) => {
      const att = attMap.get(emp.id);
      const onLeave = approvedLeaves.find(
        (l) => l.employee_id === emp.id && isDateWithinLeave(today, l),
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
      } else if (isSat) {
        status = "Holiday";
        time = "Saturday";
      }

      map.set(emp.id, { status, time, record: att });
    });

    return map;
  }, [employees, allTodayAttendance, allLeave, today]);

  // Monthly stats for selected employee
  const monthRecords = useMemo(() => {
    if (!records) return [];
    return records.filter((r) => {
      const bs = isoToBS(r.date);
      if (!bs) return true;
      return bs.month === selectedBSMonth && bs.year === selectedBSYear;
    });
  }, [records, selectedBSMonth, selectedBSYear]);

  const monthPresentCount = monthRecords.filter(
    (r) => r.clock_in && !isLateClockIn(r.clock_in),
  ).length;
  const monthLateCount = monthRecords.filter(
    (r) => r.clock_in && isLateClockIn(r.clock_in),
  ).length;
  const monthAbsentCount = monthRecords.filter(
    (r) => !r.clock_in && getWeekday(r.date) !== 6,
  ).length;

  const filteredEmployees = useMemo(() => {
    return (employees || []).filter((e) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        e.name?.toLowerCase().includes(q) ||
        e.role?.toLowerCase().includes(q) ||
        e.title?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q)
      );
    });
  }, [employees, search]);

  if (employees === null) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-4 fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Attendance Monitor</h1>
          <p className="text-xs text-text-muted">
            Track and review daily employee check-ins, departures, and time logs.
          </p>
        </div>
      </div>

      {/* 2-COLUMN MASTER-DETAIL VIEW (MATCHING REFERENCE IMAGE 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: EMPLOYEE DIRECTORY & SEARCH */}
        <div className="lg:col-span-4 bg-white border border-border rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
          {/* SEARCH INPUT */}
          <div className="h-9 flex items-center gap-1.5 bg-surface-muted border border-border-light rounded-xl px-2.5 text-xs focus-within:border-primary">
            <Search size={13} className="text-text-muted shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="w-full bg-transparent outline-none text-text text-xs"
            />
          </div>

          {/* EMPLOYEE LIST */}
          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-0.5">
            {filteredEmployees.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                No employees matching "{search}"
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = emp.id === selected;
                const statusInfo = employeeTodayStatus.get(emp.id) || {
                  status: "Absent",
                };

                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedId(emp.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-2 border-primary shadow-xs"
                        : "hover:bg-surface-muted/60 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-xs"
                        style={{ backgroundColor: getEmployeeColor(emp) }}
                      >
                        {emp.name?.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-text truncate">
                          {emp.name}
                        </h4>
                        <p className="text-[10px] text-text-muted truncate capitalize">
                          {emp.department || emp.title || emp.role || "Team member"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {statusInfo.status === "Present" && (
                        <span className="px-2 py-0.5 rounded-md bg-success-light text-success border border-success/30 text-[10px] font-semibold">
                          Present
                        </span>
                      )}
                      {statusInfo.status === "Late" && (
                        <span className="px-2 py-0.5 rounded-md bg-warning-light text-warning border border-warning/30 text-[10px] font-semibold">
                          Late
                        </span>
                      )}
                      {statusInfo.status === "On Leave" && (
                        <span className="px-2 py-0.5 rounded-md bg-primary-light text-primary border border-primary/30 text-[10px] font-semibold">
                          On Leave
                        </span>
                      )}
                      {statusInfo.status === "Absent" && (
                        <span className="px-2 py-0.5 rounded-md bg-alert-light text-alert border border-alert/30 text-[10px] font-semibold">
                          Absent
                        </span>
                      )}
                      {statusInfo.status === "Holiday" && (
                        <span className="px-2 py-0.5 rounded-md bg-surface-muted text-text-muted border border-border text-[10px] font-semibold">
                          Weekend
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ATTENDANCE LOG & DETAIL */}
        <div className="lg:col-span-8 space-y-3.5">
          {/* PROFILE HEADER & STATS CARD */}
          {selectedEmployee && (
            <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-bold shrink-0 shadow-xs"
                  style={{ backgroundColor: getEmployeeColor(selectedEmployee) }}
                >
                  {selectedEmployee.name?.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-bold text-text truncate">
                    {selectedEmployee.name}
                  </h2>
                  <p className="text-xs text-text-muted truncate">
                    {selectedEmployee.title || selectedEmployee.role}
                    {selectedEmployee.department && ` · ${selectedEmployee.department}`}
                  </p>
                </div>
              </div>

              {/* MONTHLY SUMMARY METRICS */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-success-light border border-success/30 rounded-xl px-3 py-1.5 text-center min-w-[65px]">
                  <span className="text-success text-base font-mono font-bold block leading-none">
                    {monthPresentCount}
                  </span>
                  <span className="text-[10px] text-success font-semibold uppercase tracking-wider">
                    Present
                  </span>
                </div>

                <div className="bg-warning-light border border-warning/30 rounded-xl px-3 py-1.5 text-center min-w-[65px]">
                  <span className="text-warning text-base font-mono font-bold block leading-none">
                    {monthLateCount}
                  </span>
                  <span className="text-[10px] text-warning font-semibold uppercase tracking-wider">
                    Late
                  </span>
                </div>

                <div className="bg-alert-light border border-alert/30 rounded-xl px-3 py-1.5 text-center min-w-[65px]">
                  <span className="text-alert text-base font-mono font-bold block leading-none">
                    {monthAbsentCount}
                  </span>
                  <span className="text-[10px] text-alert font-semibold uppercase tracking-wider">
                    Absent
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ATTENDANCE LOG TABLE CARD */}
          <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-2xs">
            {/* LOG HEADER & MONTH SELECTOR */}
            <div className="px-4 py-3.5 border-b border-border-light flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Attendance Log
              </h3>

              <div className="flex items-center gap-2">
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

            {/* TABLE */}
            {records === null ? (
              <div className="py-8 text-center text-xs text-text-muted">Loading logs...</div>
            ) : monthRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">
                No attendance records for this month.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted/60 text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-border-light">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Clock In</th>
                      <th className="px-3 py-2.5">Clock Out</th>
                      <th className="px-3 py-2.5">Hours</th>
                      <th className="px-4 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {monthRecords.map((r) => {
                      const workedMinutes = r.clock_in && r.clock_out
                        ? getWorkedMinutes(r.clock_in, r.clock_out)
                        : null;
                      const isLate = isLateClockIn(r.clock_in);
                      const isEarly = isEarlyClockIn(r.clock_in);
                      const bs = isoToBS(r.date);

                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-surface-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-bold text-text">
                              {bs ? `${bs.day} ${NEPALI_MONTHS[bs.month - 1]}` : r.date}
                            </div>
                            <div className="text-[10px] font-mono text-text-muted">
                              {fmtDate(r.date)}
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
                            {workedMinutes !== null
                              ? formatDuration(workedMinutes)
                              : "—"}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {isLate ? (
                              <span className="px-2 py-0.5 rounded-md bg-warning-light text-warning border border-warning/30 text-[10px] font-semibold">
                                Late
                              </span>
                            ) : r.clock_in ? (
                              <span className="px-2 py-0.5 rounded-md bg-success-light text-success border border-success/30 text-[10px] font-semibold">
                                Present
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-alert-light text-alert border border-alert/30 text-[10px] font-semibold">
                                Absent
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

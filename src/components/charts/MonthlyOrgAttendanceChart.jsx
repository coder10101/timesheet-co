import { useMemo, useState } from "react";
import {
  getDaysInBSMonth,
  bsDateToISO,
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
  isoToBS,
} from "../../utils/nepaliCalendar";
import { getWeekday, isDateWithinLeave } from "../../utils/attendance";
import { COLORS } from "../../constants/colors";
import { TrendingUp, Users, Calendar, Award } from "lucide-react";

export function MonthlyOrgAttendanceChart({
  allAttendance,
  employees,
  leaveRequests,
  holidays,
  currentBSMonth,
  currentBSYear,
  todayISO,
}) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const monthStats = useMemo(() => {
    const totalDays = getDaysInBSMonth(currentBSYear, currentBSMonth);
    const totalStaff = (employees || []).filter(
      (e) => e.role?.toLowerCase() !== "admin" && e.title?.toLowerCase() !== "admin"
    ).length || (employees?.length || 1);

    const holidayMap = new Map();
    (holidays || []).forEach((h) => holidayMap.set(h.date, h.name));

    const approvedLeaves = (leaveRequests || []).filter((r) => r.status === "Approved");

    // Group attendance by date
    const attendanceByDate = new Map();
    (allAttendance || []).forEach((rec) => {
      if (!rec.clock_in) return;
      if (!attendanceByDate.has(rec.date)) {
        attendanceByDate.set(rec.date, new Set());
      }
      attendanceByDate.get(rec.date).add(rec.employee_id);
    });

    const days = [];
    let totalPresentDaysCount = 0;
    let workingDaysCount = 0;
    let maxPresentCount = 0;

    for (let d = 1; d <= totalDays; d++) {
      const isoDate = bsDateToISO(currentBSYear, currentBSMonth, d);
      if (!isoDate) continue;

      const weekday = getWeekday(isoDate);
      const isSat = weekday === 6;
      const holidayName = holidayMap.get(isoDate);
      const isHol = !!holidayName;
      const isFuture = isoDate > todayISO;
      const isToday = isoDate === todayISO;

      const checkedInSet = attendanceByDate.get(isoDate) || new Set();
      const presentCount = checkedInSet.size;

      const onLeaveCount = approvedLeaves.filter((l) =>
        isDateWithinLeave(isoDate, l)
      ).length;

      const isWorkingDay = !isSat && !isHol && !isFuture;
      if (isWorkingDay) {
        workingDaysCount += 1;
        totalPresentDaysCount += presentCount;
        if (presentCount > maxPresentCount) maxPresentCount = presentCount;
      }

      const rate = totalStaff > 0 && isWorkingDay
        ? Math.round((presentCount / totalStaff) * 100)
        : 0;

      days.push({
        day: d,
        isoDate,
        weekday,
        isSat,
        isHol,
        holidayName,
        isFuture,
        isToday,
        presentCount,
        onLeaveCount,
        rate,
        totalStaff,
      });
    }

    const avgRate = workingDaysCount > 0
      ? Math.round((totalPresentDaysCount / (workingDaysCount * totalStaff)) * 100)
      : 0;

    return {
      days,
      totalStaff,
      workingDaysCount,
      avgRate,
      maxPresentCount,
      monthName: NEPALI_MONTHS[currentBSMonth - 1] || "Month",
    };
  }, [
    allAttendance,
    employees,
    leaveRequests,
    holidays,
    currentBSMonth,
    currentBSYear,
    todayISO,
  ]);

  const maxBarHeight = 70; // px

  return (
    <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-3">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-primary" />
            <h3 className="text-xs sm:text-sm font-bold text-text">
              Monthly Attendance Trend ({monthStats.monthName} {currentBSYear})
            </h3>
          </div>
          <p className="text-[11px] text-text-muted">
            Daily staff turnout and attendance rate across the entire month
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-success bg-success-light px-2.5 py-0.5 rounded-lg border border-success/30 font-mono">
            {monthStats.avgRate}% Monthly Average
          </span>
        </div>
      </div>

      {/* MONTHLY DAY-BY-DAY BAR CHART */}
      <div className="relative pt-2">
        <div className="flex items-end gap-1 sm:gap-1.5 h-[90px] w-full overflow-x-auto pb-5 pt-1 px-1">
          {monthStats.days.map((d) => {
            const heightPct = d.totalStaff > 0 ? (d.presentCount / d.totalStaff) * 100 : 0;
            const barPx = Math.max(4, Math.round((heightPct / 100) * maxBarHeight));
            const isHigh = d.rate >= 80;

            return (
              <div
                key={d.day}
                onMouseEnter={() => setHoveredDay(d)}
                onMouseLeave={() => setHoveredDay(null)}
                className="flex-1 min-w-[8px] sm:min-w-[12px] flex flex-col items-center justify-end h-full group relative cursor-pointer"
              >
                {/* BAR COLUMN */}
                {d.isSat ? (
                  <div
                    style={{ height: "6px" }}
                    className="w-full rounded-sm bg-surface-muted border border-border"
                    title={`Day ${d.day}: Saturday Off`}
                  />
                ) : d.isHol ? (
                  <div
                    style={{ height: "10px" }}
                    className="w-full rounded-sm bg-warning/30 border border-warning/40"
                    title={`Day ${d.day}: ${d.holidayName}`}
                  />
                ) : d.isFuture ? (
                  <div
                    style={{ height: "4px" }}
                    className="w-full rounded-sm bg-surface-muted/40"
                  />
                ) : (
                  <div
                    style={{ height: `${barPx}px` }}
                    className={`w-full rounded-t-sm transition-all group-hover:opacity-80 ${
                      d.isToday
                        ? "bg-primary ring-1 ring-primary"
                        : isHigh
                          ? "bg-success"
                          : d.presentCount > 0
                            ? "bg-warning"
                            : "bg-alert/40"
                    }`}
                  />
                )}

                {/* DAY NUMBER LABEL */}
                <span
                  className={`absolute -bottom-4 text-[9px] font-mono select-none ${
                    d.isToday
                      ? "font-bold text-primary"
                      : d.isSat
                        ? "text-alert font-semibold"
                        : "text-text-muted"
                  }`}
                >
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>

        {/* FLOATING HOVER TOOLTIP */}
        {hoveredDay && (
          <div className="absolute top-0 right-2 bg-text text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg z-10 space-y-0.5 pointer-events-none">
            <p className="font-bold">
              {hoveredDay.day} {monthStats.monthName} ({WEEKDAY_LABELS[hoveredDay.weekday]})
            </p>
            {hoveredDay.isSat ? (
              <p className="text-text-faint">Weekend Off</p>
            ) : hoveredDay.isHol ? (
              <p className="text-warning-light">{hoveredDay.holidayName || "Public Holiday"}</p>
            ) : hoveredDay.isFuture ? (
              <p className="text-text-faint">Upcoming</p>
            ) : (
              <p className="font-mono">
                {hoveredDay.presentCount}/{hoveredDay.totalStaff} present ({hoveredDay.rate}%)
                {hoveredDay.onLeaveCount > 0 && ` · ${hoveredDay.onLeaveCount} on leave`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* FOOTER LEGEND */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-light text-[10px] text-text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span>High Attendance (≥80%)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span>Partial</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Today</span>
          </span>
        </div>

        <span className="font-mono">{monthStats.workingDaysCount} working days this month</span>
      </div>
    </div>
  );
}

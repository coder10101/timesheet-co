import { useState, useMemo } from "react";
import {
  isLateClockIn,
  isDateWithinLeave,
  getWeekday,
} from "../../utils/attendance";
import {
  isoToBS,
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
} from "../../utils/nepaliCalendar";
import { getWeekDates } from "../../utils/workTime";
import { Users, Clock, CheckCircle2, TrendingUp } from "lucide-react";

export function WeeklyTurnoutBarChart({
  employees,
  allAttendance,
  leaveRequests,
  holidays,
  todayISO,
}) {
  const [hoveredDate, setHoveredDate] = useState(null);

  const weekDates = useMemo(() => {
    return getWeekDates(todayISO);
  }, [todayISO]);

  const dailyTurnout = useMemo(() => {
    const totalStaff =
      (employees || []).filter(
        (e) =>
          e.role?.toLowerCase() !== "admin" &&
          e.title?.toLowerCase() !== "admin",
      ).length ||
      employees?.length ||
      1;

    const holidayMap = new Map();
    (holidays || []).forEach((h) => holidayMap.set(h.date, h.name));

    const approvedLeaves = (leaveRequests || []).filter(
      (l) => l.status === "Approved",
    );

    return weekDates.map((date) => {
      const weekday = getWeekday(date);
      const isSat = weekday === 6;
      const holidayName = holidayMap.get(date);
      const isHol = !!holidayName;
      const isToday = date === todayISO;
      const isFuture = date > todayISO;
      const bs = isoToBS(date);

      // Attendance records for this date
      const dateRecords = (allAttendance || []).filter(
        (r) => r.date === date && r.clock_in,
      );

      let onTimeCount = 0;
      let lateCount = 0;

      dateRecords.forEach((r) => {
        if (isLateClockIn(r.clock_in)) {
          lateCount++;
        } else {
          onTimeCount++;
        }
      });

      const totalPresent = onTimeCount + lateCount;

      const onLeaveCount = approvedLeaves.filter((l) =>
        isDateWithinLeave(date, l),
      ).length;

      const turnoutPct =
        totalStaff > 0 && !isSat && !isHol && !isFuture
          ? Math.round((totalPresent / totalStaff) * 100)
          : 0;

      return {
        date,
        bs,
        weekday,
        isSat,
        isHol,
        holidayName,
        isToday,
        isFuture,
        totalStaff,
        onTimeCount,
        lateCount,
        totalPresent,
        onLeaveCount,
        turnoutPct,
      };
    });
  }, [weekDates, employees, allAttendance, leaveRequests, holidays, todayISO]);

  // Weekly stats
  const activeDays = dailyTurnout.filter(
    (d) => !d.isFuture && !d.isSat && !d.isHol,
  );
  const totalWeeklyPresent = activeDays.reduce(
    (acc, d) => acc + d.totalPresent,
    0,
  );
  const totalWeeklyLate = activeDays.reduce((acc, d) => acc + d.lateCount, 0);
  const totalExpected = activeDays.reduce((acc, d) => acc + d.totalStaff, 0);
  const avgTurnoutPct =
    totalExpected > 0
      ? Math.round((totalWeeklyPresent / totalExpected) * 100)
      : 0;

  const maxDaily = Math.max(...dailyTurnout.map((d) => d.totalStaff), 5);

  return (
    <div className="w-full bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-4">
      {/* HEADER & WEEKLY TURNOUT SUMMARY — renamed to avoid overlapping "Punctuality" with the leaderboard below */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-light">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-text">This week</h3>
          <p className="text-[11px] text-text-muted">
            Daily attendance turnout across the last 7 days
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-success bg-success-light border border-success/30 px-2.5 py-1 rounded-lg">
            {avgTurnoutPct}% Avg Attendance
          </span>
          {totalWeeklyLate > 0 && (
            <span className="text-[11px] font-mono font-bold text-warning bg-warning-light border border-warning/30 px-2.5 py-1 rounded-lg">
              {totalWeeklyLate} Late This Week
            </span>
          )}
        </div>
      </div>

      {/* 7-DAY BAR GRAPH */}
      <div className="relative pt-4 pb-1">
        <div className="grid grid-cols-7 gap-2 sm:gap-3 h-36 items-end">
          {dailyTurnout.map((d) => {
            const isHovered = hoveredDate === d.date;
            const onTimeHeight = (d.onTimeCount / maxDaily) * 100;
            const lateHeight = (d.lateCount / maxDaily) * 100;
            const leaveHeight = (d.onLeaveCount / maxDaily) * 100;

            return (
              <div
                key={d.date}
                onMouseEnter={() => setHoveredDate(d.date)}
                onMouseLeave={() => setHoveredDate(null)}
                className="relative flex flex-col items-center h-full justify-end group cursor-pointer"
              >
                {/* FLOATING HOVER TOOLTIP */}
                {isHovered && (
                  <div className="absolute -top-24 z-30 bg-text text-white p-2.5 rounded-xl shadow-xl text-[10px] space-y-1 w-36 pointer-events-none transform -translate-x-1/2 left-1/2 fade-in">
                    <p className="font-bold border-b border-white/15 pb-0.5">
                      {WEEKDAY_LABELS[d.weekday]},{" "}
                      {d.bs
                        ? `${d.bs.day} ${NEPALI_MONTHS[d.bs.month - 1]}`
                        : d.date}
                    </p>
                    {d.isSat ? (
                      <p className="text-white/70">Saturday Off</p>
                    ) : d.isHol ? (
                      <p className="text-warning font-semibold">
                        {d.holidayName || "Public Holiday"}
                      </p>
                    ) : d.isFuture ? (
                      <p className="text-white/70">Upcoming Work Day</p>
                    ) : (
                      <div className="space-y-0.5 font-mono">
                        <p className="flex justify-between text-[#A9C5AC]">
                          <span>On-Time:</span>
                          <span className="font-bold">
                            {d.onTimeCount} staff
                          </span>
                        </p>
                        {d.lateCount > 0 && (
                          <p className="flex justify-between text-[#FAD074]">
                            <span>Late:</span>
                            <span className="font-bold">
                              {d.lateCount} staff
                            </span>
                          </p>
                        )}
                        {d.onLeaveCount > 0 && (
                          <p className="flex justify-between text-[#D8B4FE]">
                            <span>On Leave:</span>
                            <span className="font-bold">
                              {d.onLeaveCount} staff
                            </span>
                          </p>
                        )}
                        <p className="flex justify-between border-t border-white/10 pt-0.5 font-bold">
                          <span>Total In:</span>
                          <span>
                            {d.totalPresent}/{d.totalStaff} ({d.turnoutPct}%)
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* STACKED BAR */}
                <div
                  className={`w-full max-w-[32px] rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-200 ${
                    d.isToday ? "ring-2 ring-primary ring-offset-1" : ""
                  } ${
                    d.isSat || d.isHol
                      ? "bg-surface-muted/60 border border-dashed border-border h-6"
                      : d.isFuture
                        ? "bg-surface-muted/30 border border-border-light h-4"
                        : "bg-surface-muted"
                  }`}
                  style={{
                    height:
                      !d.isSat && !d.isHol && !d.isFuture
                        ? `${Math.max(10, ((d.totalPresent + d.onLeaveCount) / maxDaily) * 100)}%`
                        : undefined,
                  }}
                >
                  {/* ON-TIME LAYER (GREEN) */}
                  {d.onTimeCount > 0 && (
                    <div
                      style={{
                        height: `${(d.onTimeCount / (d.totalPresent + d.onLeaveCount || 1)) * 100}%`,
                      }}
                      className="bg-success w-full"
                    />
                  )}

                  {/* LATE LAYER (AMBER) */}
                  {d.lateCount > 0 && (
                    <div
                      style={{
                        height: `${(d.lateCount / (d.totalPresent + d.onLeaveCount || 1)) * 100}%`,
                      }}
                      className="bg-warning w-full"
                    />
                  )}

                  {/* LEAVE LAYER (PLUM) */}
                  {d.onLeaveCount > 0 && (
                    <div
                      style={{
                        height: `${(d.onLeaveCount / (d.totalPresent + d.onLeaveCount || 1)) * 100}%`,
                      }}
                      className="bg-primary w-full"
                    />
                  )}
                </div>

                {/* DAY LABEL */}
                <div className="text-center mt-1.5">
                  <span
                    className={`text-[10px] font-bold block ${d.isToday ? "text-primary font-extrabold" : d.isSat ? "text-alert" : "text-text"}`}
                  >
                    {WEEKDAY_LABELS[d.weekday]}
                  </span>
                  <span className="text-[9px] font-mono text-text-muted">
                    {d.bs ? d.bs.day : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CLEAN LEGEND */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-light text-[10px] text-text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-success" />
            <span>On-Time</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-warning" />
            <span>Late Check-in</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
            <span>On Leave</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-surface-muted border border-dashed border-border" />
            <span>Saturday Off</span>
          </span>
        </div>

        <span className="font-mono">7-day view</span>
      </div>
    </div>
  );
}

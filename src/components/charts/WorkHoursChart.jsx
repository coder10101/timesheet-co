import { useState, useMemo } from "react";
import {
  formatDuration,
  getWorkedMinutes,
  WORK_DAY_MINUTES,
  fmtTime,
} from "../../utils/workTime";
import {
  isoToBS,
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
} from "../../utils/nepaliCalendar";
import {
  getWeekday,
  formatDifference,
  isLateClockIn,
} from "../../utils/attendance";
import { Clock, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";

export function WorkHoursChart({ monthDates, records, employeeName }) {
  const [hoveredDate, setHoveredDate] = useState(null);

  const dailyLogs = useMemo(() => {
    const recMap = new Map();
    (records || []).forEach((r) => recMap.set(r.date, r));

    return (monthDates || []).map((d) => {
      const rec = recMap.get(d.isoDate);
      const bs = isoToBS(d.isoDate);
      const weekday = getWeekday(d.isoDate);
      const isSat = weekday === 6;

      const workedMinutes =
        rec?.clock_in && rec?.clock_out
          ? getWorkedMinutes(rec.clock_in, rec.clock_out)
          : rec?.clock_in
            ? getWorkedMinutes(rec.clock_in, new Date().toISOString())
            : 0;

      const workedHours = +(workedMinutes / 60).toFixed(1);
      const diffMinutes =
        workedMinutes > 0 ? workedMinutes - WORK_DAY_MINUTES : 0;
      const isOvertime = diffMinutes > 0;
      const isUndertime = rec?.clock_out && diffMinutes < 0;
      const isLate = rec?.clock_in ? isLateClockIn(rec.clock_in) : false;

      return {
        isoDate: d.isoDate,
        bsDay: d.bsDay,
        bs,
        weekday,
        isSat,
        record: rec,
        workedMinutes,
        workedHours,
        diffMinutes,
        isOvertime,
        isUndertime,
        isLate,
        clockInTime: rec?.clock_in ? fmtTime(rec.clock_in) : null,
        clockOutTime: rec?.clock_out ? fmtTime(rec.clock_out) : null,
        inProgress: rec?.clock_in && !rec?.clock_out,
      };
    });
  }, [monthDates, records]);

  // Aggregate monthly stats
  const totalWorkedMinutes = dailyLogs.reduce(
    (acc, d) => acc + d.workedMinutes,
    0,
  );
  const totalOvertimeMinutes = dailyLogs.reduce(
    (acc, d) => (d.diffMinutes > 0 ? acc + d.diffMinutes : acc),
    0,
  );
  const totalUndertimeMinutes = dailyLogs.reduce(
    (acc, d) => (d.isUndertime ? acc + Math.abs(d.diffMinutes) : acc),
    0,
  );
  const loggedDays = dailyLogs.filter((d) => d.workedMinutes > 0);
  const loggedDaysCount = loggedDays.length;
  const avgDailyMinutes =
    loggedDaysCount > 0 ? Math.round(totalWorkedMinutes / loggedDaysCount) : 0;

  const onTimeDays = loggedDays.filter((d) => !d.isLate).length;
  const onTimeRate =
    loggedDaysCount > 0
      ? Math.round((onTimeDays / loggedDaysCount) * 100)
      : 100;

  const maxHours = Math.max(...dailyLogs.map((d) => d.workedHours), 12);

  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-2xs space-y-6">
      {/* 1. CLEAN, AIRY HEADER WITH PROMINENT TYPOGRAPHY METRICS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-light">
        <div>
          <h3 className="text-base font-bold text-text">Daily Shift Hours</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Worked hours compared against standard 8.0h shift
          </p>
        </div>

        {/* CLEAN TYPOGRAPHY NUMBERS INSTEAD OF CHUNKY BOXES */}
        <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
          <div>
            <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
              Punctuality
            </span>
            <span className="text-lg font-mono font-bold text-text block mt-0.5">
              {onTimeRate}%
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
              Daily Avg
            </span>
            <span className="text-lg font-mono font-bold text-text block mt-0.5">
              {formatDuration(avgDailyMinutes)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. ROOMY BAR CHART CANVAS WITH 8.0h TARGET LINE */}
      <div className="relative pt-6 pb-2">
        {/* 8-HOUR TARGET BASELINE */}
        <div
          className="absolute left-0 right-0 border-b border-dashed border-primary/40 z-10 pointer-events-none flex items-center justify-end pr-2"
          style={{ bottom: `${(8 / maxHours) * 140 + 26}px` }}
        >
          <span className="text-[10px] font-bold font-mono text-primary bg-white px-2 py-0.5 rounded-full border border-primary/20 shadow-2xs">
            8.0h Standard Target
          </span>
        </div>

        {/* BARS STRIP WITH GENEROUS SPACING */}
        <div className="flex items-end gap-1.5 sm:gap-2 h-40 overflow-x-auto pb-1 px-1">
          {dailyLogs.map((d) => {
            const barHeightPct = Math.min(
              100,
              (d.workedHours / maxHours) * 100,
            );
            const isHovered = hoveredDate === d.isoDate;

            let barColor = "bg-surface-muted border border-border-light";
            if (d.inProgress) {
              barColor = "bg-primary/80 animate-pulse";
            } else if (d.isOvertime) {
              barColor = "bg-success";
            } else if (d.isUndertime) {
              barColor = "bg-warning";
            } else if (d.workedHours > 0) {
              barColor = "bg-primary";
            } else if (d.isSat) {
              barColor =
                "bg-surface-muted/40 border border-dashed border-border";
            }

            return (
              <div
                key={d.isoDate}
                onMouseEnter={() => setHoveredDate(d.isoDate)}
                onMouseLeave={() => setHoveredDate(null)}
                className="relative flex-1 min-w-[14px] max-w-[28px] flex flex-col items-center h-full justify-end group cursor-pointer"
              >
                {/* HOVER TOOLTIP */}
                {isHovered && (
                  <div className="absolute -top-24 z-30 bg-text text-white p-2.5 rounded-xl shadow-xl text-[10px] space-y-1 w-32 pointer-events-none transform -translate-x-1/2 left-1/2 fade-in">
                    <p className="font-bold border-b border-white/15 pb-0.5">
                      {d.bsDay} {d.bs ? NEPALI_MONTHS[d.bs.month - 1] : ""} (
                      {WEEKDAY_LABELS[d.weekday]})
                    </p>
                    {d.clockInTime && (
                      <p className="text-white/80 font-mono text-[9px]">
                        {d.clockInTime} → {d.clockOutTime || "Working"}
                      </p>
                    )}
                    <p className="flex justify-between">
                      <span className="text-white/70">Shift:</span>
                      <span className="font-mono font-bold">
                        {d.workedHours > 0 ? `${d.workedHours}h` : "0h"}
                      </span>
                    </p>
                    {d.isOvertime && (
                      <p className="flex justify-between text-[#A9C5AC]">
                        <span>OT:</span>
                        <span className="font-mono font-bold">
                          +{formatDifference(d.diffMinutes)}
                        </span>
                      </p>
                    )}
                    {d.isUndertime && (
                      <p className="flex justify-between text-[#F2A89A]">
                        <span>Short:</span>
                        <span className="font-mono font-bold">
                          -{formatDifference(Math.abs(d.diffMinutes))}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* BAR COLUMN */}
                <div
                  className={`w-full rounded-t-md transition-all duration-200 ${barColor} ${
                    isHovered
                      ? "ring-2 ring-primary ring-offset-1 scale-y-[1.04]"
                      : ""
                  }`}
                  style={{
                    height:
                      d.workedHours > 0
                        ? `${Math.max(8, barHeightPct)}%`
                        : d.isSat
                          ? "6%"
                          : "4%",
                  }}
                />

                {/* DAY NUMBER */}
                <span
                  className={`text-[10px] font-mono mt-1.5 ${d.isSat ? "text-alert font-bold" : "text-text-muted"}`}
                >
                  {d.bsDay}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. CLEAN MINIMALIST LEGEND STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-light text-xs text-text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            <span>Overtime Shift</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>Standard Shift (8h)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-warning" />
            <span>Short Shift</span>
          </span>
        </div>

        <span className="font-mono text-[11px] font-medium">
          {loggedDaysCount} working days recorded
        </span>
      </div>
    </div>
  );
}

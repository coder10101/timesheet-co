import { useState, useMemo } from "react";
import {
  formatDuration,
  getWorkedMinutes,
  getEffectiveClockOut,
  todayISO,
  WORK_DAY_MINUTES,
  fmtTime,
  LUNCH_MINUTES,
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
  isEarlyClockIn,
} from "../../utils/attendance";
import {
  Clock,
  Clock9,
  Clock10,
  Clock12,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Coffee,
} from "lucide-react";

export function WorkHoursChart({ monthDates, records, employeeName }) {
  const [hoveredDate, setHoveredDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const dailyLogs = useMemo(() => {
    const recMap = new Map();
    (records || []).forEach((r) => recMap.set(r.date, r));

    return (monthDates || []).map((d) => {
      const rec = recMap.get(d.isoDate);
      const bs = isoToBS(d.isoDate);
      const weekday = getWeekday(d.isoDate);
      const isSat = weekday === 6;

      const isToday = d.isoDate === todayISO();
      const effOut = getEffectiveClockOut(rec);
      const isAutoClockOut = !rec?.clock_out && !isToday && !!rec?.clock_in;

      const workedMinutes =
        rec?.clock_in && effOut
          ? getWorkedMinutes(rec.clock_in, effOut, rec?.break_minutes || 0)
          : rec?.clock_in && isToday
            ? getWorkedMinutes(rec.clock_in, new Date().toISOString(), rec?.break_minutes || 0)
            : 0;

      const workedHours = +(workedMinutes / 60).toFixed(1);
      const diffMinutes =
        workedMinutes > 0 ? workedMinutes - WORK_DAY_MINUTES : 0;

      // Tolerance of +- 15 mins for standard shift
      const isOvertime = diffMinutes > 15;
      const hasCheckout = !!effOut;
      const isUndertime = hasCheckout && diffMinutes < -15;
      const isStandard =
        workedMinutes > 0 && Math.abs(diffMinutes) <= 15 && hasCheckout;

      const isLate = rec?.clock_in ? isLateClockIn(rec.clock_in) : false;
      const isEarly = rec?.clock_in ? isEarlyClockIn(rec.clock_in) : false;

      // Elapsed gross minutes before lunch/break deduction
      const elapsedMinutes =
        rec?.clock_in && effOut
          ? Math.round(
              (new Date(effOut).getTime() -
                new Date(rec.clock_in).getTime()) /
                60000,
            )
          : workedMinutes > 0
            ? workedMinutes + LUNCH_MINUTES
            : 0;

      return {
        isoDate: d.isoDate,
        bsDay: d.bsDay || bs?.day || d.day,
        bsMonth: bs?.month || d.month,
        bsYear: bs?.year || d.year,
        bs,
        weekday,
        isSat,
        record: rec,
        workedMinutes,
        workedHours,
        elapsedMinutes,
        diffMinutes,
        isOvertime,
        isUndertime,
        isStandard,
        isLate,
        isEarly,
        clockInTime: rec?.clock_in ? fmtTime(rec.clock_in) : null,
        clockOutTime: rec?.clock_out
          ? fmtTime(rec.clock_out)
          : isAutoClockOut
            ? "06:00 PM (Auto)"
            : null,
        inProgress: rec?.clock_in && !rec?.clock_out && isToday,
      };
    });
  }, [monthDates, records]);

  // Determine active day to display in detail panel (hovered > clicked > latest worked day > today)
  const activeDay = useMemo(() => {
    if (hoveredDate) {
      return dailyLogs.find((d) => d.isoDate === hoveredDate) || null;
    }
    if (selectedDate) {
      return dailyLogs.find((d) => d.isoDate === selectedDate) || null;
    }
    // Default to the most recent worked day or first logged day
    const worked = [...dailyLogs].filter((d) => d.workedMinutes > 0).reverse();
    return worked[0] || dailyLogs[0] || null;
  }, [hoveredDate, selectedDate, dailyLogs]);

  // Aggregate monthly stats
  const totalWorkedMinutes = dailyLogs.reduce(
    (acc, d) => acc + d.workedMinutes,
    0,
  );
  const totalOvertimeMinutes = dailyLogs.reduce(
    (acc, d) => (d.diffMinutes > 15 ? acc + d.diffMinutes : acc),
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

  const maxHours = Math.max(
    12,
    Math.ceil(Math.max(...dailyLogs.map((d) => d.workedHours), 8) + 1),
  );

  return (
    <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-5">
      {/* 1. HEADER WITH SUMMARY METRICS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-light">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-text">Daily Shift Hours</h3>
            <span className="text-[11px] font-mono text-text-muted bg-surface-muted px-2 py-0.5 rounded border border-border-light">
              Standard Shift: 8.0h
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Standard shift: 8 hours (including lunch). Click or hover on any day to inspect detailed shift hours.
          </p>
        </div>

        {/* METRICS READOUT */}
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

          <div>
            <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
              Days Logged
            </span>
            <span className="text-lg font-mono font-bold text-text block mt-0.5">
              {loggedDaysCount}
            </span>
          </div>
        </div>
      </div>

      {/* 2. BAR CHART CANVAS WITH Y-AXIS SCALE & REFERENCE GRIDLINES */}
      <div className="relative pt-2 pb-1">
        {/* Y-AXIS GRID LINES & LABELS */}
        <div className="relative h-44 border-b border-border-light pl-9 sm:pl-11 pr-1">
          {/* 12h Line */}
          <div
            className="absolute left-0 right-0 border-b border-dashed border-border-light pointer-events-none flex items-center"
            style={{ bottom: `${(12 / maxHours) * 100}%` }}
          >
            <span className="text-[10px] font-mono text-text-muted w-8 sm:w-10 text-right pr-2">
              12h
            </span>
          </div>

          {/* 8h Target Standard Shift Line */}
          <div
            className="absolute left-0 right-0 border-b-2 border-dashed border-primary/50 pointer-events-none flex items-center justify-between z-10"
            style={{ bottom: `${(8 / maxHours) * 100}%` }}
          >
            <span className="text-[10px] font-mono font-bold text-primary w-8 sm:w-10 text-right pr-2 bg-white">
              8h
            </span>
            <span className="text-[10px] font-semibold font-mono text-primary bg-primary-light/80 px-2 py-0.5 rounded-full border border-primary/30 mr-2 shadow-2xs">
              8.0h Shift Target
            </span>
          </div>

          {/* 4h Line */}
          <div
            className="absolute left-0 right-0 border-b border-dashed border-border-light pointer-events-none flex items-center"
            style={{ bottom: `${(4 / maxHours) * 100}%` }}
          >
            <span className="text-[10px] font-mono text-text-muted w-8 sm:w-10 text-right pr-2">
              4h
            </span>
          </div>

          {/* 0h Base Line */}
          <div className="absolute left-0 bottom-0 pointer-events-none flex items-center">
            <span className="text-[10px] font-mono text-text-muted w-8 sm:w-10 text-right pr-2">
              0h
            </span>
          </div>

          {/* BARS STRIP */}
          <div className="flex items-end gap-1 sm:gap-1.5 h-full overflow-x-auto overflow-y-hidden pb-1 z-0 relative">
            {dailyLogs.map((d) => {
              const barHeightPct = Math.min(
                100,
                (d.workedHours / maxHours) * 100,
              );
              const isSelected =
                selectedDate === d.isoDate ||
                (!selectedDate && activeDay?.isoDate === d.isoDate);
              const isHovered = hoveredDate === d.isoDate;

              let barColor = "bg-surface-muted border border-border-light";
              if (d.inProgress) {
                barColor = "bg-primary animate-pulse";
              } else if (d.isOvertime) {
                barColor = "bg-success";
              } else if (d.isUndertime) {
                barColor = "bg-warning";
              } else if (d.workedHours > 0) {
                barColor = "bg-primary";
              } else if (d.isSat) {
                barColor =
                  "bg-surface-muted/60 border border-dashed border-border";
              }

              return (
                <div
                  key={d.isoDate}
                  onClick={() => setSelectedDate(d.isoDate)}
                  onMouseEnter={() => setHoveredDate(d.isoDate)}
                  onMouseLeave={() => setHoveredDate(null)}
                  className="relative flex-1 min-w-[15px] max-w-[32px] flex flex-col items-center h-full justify-end cursor-pointer group select-none"
                >
                  {/* DIRECT VALUE BADGE (visible for worked days on hover or selection) */}
                  {d.workedHours > 0 && (
                    <span
                      className={`text-[9px] font-mono font-bold leading-none mb-1 transition-all ${
                        isHovered || isSelected
                          ? "opacity-100 scale-110 text-text font-extrabold"
                          : "opacity-75 text-text-muted hidden sm:inline"
                      }`}
                    >
                      {d.workedHours}h
                    </span>
                  )}

                  {/* BAR COLUMN */}
                  <div
                    className={`w-full rounded-t-md transition-all duration-200 ${barColor} ${
                      isSelected || isHovered
                        ? "ring-2 ring-primary ring-offset-2 scale-y-[1.03] shadow-xs"
                        : "hover:opacity-90"
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
                    className={`text-[10px] font-mono mt-1 transition-colors ${
                      isSelected
                        ? "font-bold text-primary underline"
                        : d.isSat
                          ? "text-alert font-bold"
                          : "text-text-muted"
                    }`}
                  >
                    {d.bsDay}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. SELECTED DAY SHIFT DETAIL CARD (MAKES SHIFT HOURS INTUITIVE & EFFORTLESS TO READ) */}
      {activeDay && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface-muted/70 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text flex items-center gap-1.5">
                <Calendar size={13} className="text-primary" />
                {activeDay.bsDay}{" "}
                {NEPALI_MONTHS[(activeDay.bsMonth || 1) - 1]}{" "}
                {activeDay.bsYear}
              </span>
              <span className="text-[11px] text-text-muted">
                ({WEEKDAY_LABELS[activeDay.weekday]} · {activeDay.isoDate})
              </span>
              {activeDay.isSat && (
                <span className="text-[10px] font-semibold text-alert bg-alert-light px-1.5 py-0.5 rounded">
                  Saturday
                </span>
              )}
            </div>

            {/* TIMINGS & LUNCH READOUT */}
            <div className="text-xs text-text-muted mt-1 flex flex-wrap items-center gap-3">
              {activeDay.clockInTime ? (
                <>
                  <span className="font-mono text-text font-semibold">
                    {activeDay.clockInTime} →{" "}
                    {activeDay.clockOutTime || "Working"}
                  </span>

                  {activeDay.elapsedMinutes > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                      <Coffee size={11} className="text-text-faint" />
                      Duration: {formatDuration(activeDay.elapsedMinutes)} (incl. lunch)
                    </span>
                  )}
                </>
              ) : (
                <span className="italic text-text-faint">
                  {activeDay.isSat ? "Weekend off" : "No clock-in record"}
                </span>
              )}
            </div>
          </div>

          {/* NET WORKED & STATUS BADGES */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {activeDay.clockInTime && (
              <>
                {activeDay.isLate ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning bg-warning-light px-2 py-1 rounded-md">
                    <Clock12 size={12} /> Late check-in
                  </span>
                ) : activeDay.isEarly ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary-light px-2 py-1 rounded-md">
                    <Clock9 size={12} /> Early check-in
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success-light px-2 py-1 rounded-md">
                    <Clock10 size={12} /> On time
                  </span>
                )}
              </>
            )}

            {/* NET HOURS BADGE */}
            <div className="px-3 py-1 rounded-lg bg-white border border-border shadow-2xs text-right">
              <span className="text-[10px] text-text-muted block leading-tight">
                Net Worked
              </span>
              <span className="font-mono font-bold text-sm text-text">
                {activeDay.workedHours > 0
                  ? formatDuration(activeDay.workedMinutes)
                  : "0h 00m"}
              </span>
            </div>

            {/* VARIANCE PILL */}
            {activeDay.isOvertime && (
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-overtime bg-[#E8F5E2] px-2.5 py-1.5 rounded-lg border border-overtime/20">
                <TrendingUp size={13} />
                +{formatDifference(activeDay.diffMinutes)} OT
              </span>
            )}
            {activeDay.isUndertime && (
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-alert bg-alert-light px-2.5 py-1.5 rounded-lg border border-alert/20">
                <TrendingDown size={13} />-
                {formatDifference(Math.abs(activeDay.diffMinutes))} Under
              </span>
            )}
            {activeDay.isStandard && (
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary bg-primary-light px-2.5 py-1.5 rounded-lg border border-primary/20">
                <CheckCircle2 size={13} />
                Standard 8h
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. CLEAN LEGEND STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-text-muted border-t border-border-light">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            <span>Overtime Shift (&gt;8h)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>Standard Shift (~8h)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-warning" />
            <span>Short Shift (&lt;8h)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-surface-muted border border-border" />
            <span>Weekend / Day Off</span>
          </span>
        </div>

        <span className="font-mono text-[11px] font-medium text-text-muted">
          Showing 32 BS days
        </span>
      </div>
    </div>
  );
}


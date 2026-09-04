import { useMemo } from "react";
import {
  Clock,
  Clock9,
  Clock10,
  Clock12,
  Sparkles,
  Flame,
  CalendarCheck,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { COLORS } from "../../constants/colors";
import { toNepalTimeString } from "../../utils/timezone";
import { getWeekday } from "../../utils/attendance";
import { WEEKDAY_LABELS } from "../../utils/nepaliCalendar";
import { getEffectiveClockOut } from "../../utils/workTime";
import { useOfficeHours } from "../../constants/officeHours";

export function PunctualityRhythmChart({ records, monthDates, siteSummaryByDate }) {
  const officeHours = useOfficeHours();
  const stats = useMemo(() => {
    let earlyCount = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let totalInMinutes = 0;
    let totalOutMinutes = 0;
    let clockedOutCount = 0;

    const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayOnTime = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    const validRecords = (records || [])
      .filter((r) => r.clock_in)
      .sort((a, b) => a.date.localeCompare(b.date));

    validRecords.forEach((r) => {
      const timeStr = toNepalTimeString(r.clock_in);
      if (!timeStr) return;

      const [h, m] = timeStr.split(":").map(Number);
      const inMins = h * 60 + m;
      totalInMinutes += inMins;

      const wd = getWeekday(r.date);
      dayCounts[wd] = (dayCounts[wd] || 0) + 1;

      if (inMins < officeHours.startTimeMinutes) {
        earlyCount += 1;
        dayOnTime[wd] = (dayOnTime[wd] || 0) + 1;
      } else if (inMins <= officeHours.graceCutoffMinutes) {
        onTimeCount += 1;
        dayOnTime[wd] = (dayOnTime[wd] || 0) + 1;
      } else {
        lateCount += 1;
      }

      const effOut = getEffectiveClockOut(r, undefined, officeHours.endTime);
      if (effOut) {
        const outStr = toNepalTimeString(effOut);
        if (outStr) {
          const [outH, outM] = outStr.split(":").map(Number);
          totalOutMinutes += outH * 60 + outM;
          clockedOutCount += 1;
        }
      }
    });

    const totalDays = earlyCount + onTimeCount + lateCount;
    const punctualDays = earlyCount + onTimeCount;
    const punctualityRate =
      totalDays > 0 ? Math.round((punctualDays / totalDays) * 100) : 100;

    // Averages
    const avgInMins =
      totalDays > 0
        ? Math.round(totalInMinutes / totalDays)
        : officeHours.startTimeMinutes;
    const avgInH = Math.floor(avgInMins / 60);
    const avgInM = avgInMins % 60;
    const avgInStr = `${avgInH % 12 || 12}:${String(avgInM).padStart(2, "0")} ${avgInH >= 12 ? "PM" : "AM"}`;

    const avgOutMins =
      clockedOutCount > 0
        ? Math.round(totalOutMinutes / clockedOutCount)
        : officeHours.endTimeMinutes;
    const avgOutH = Math.floor(avgOutMins / 60);
    const avgOutM = avgOutMins % 60;
    const avgOutStr =
      clockedOutCount > 0
        ? `${avgOutH % 12 || 12}:${String(avgOutM).padStart(2, "0")} ${avgOutH >= 12 ? "PM" : "AM"}`
        : "—";

    // Best day of week
    let bestDayIndex = 1;
    let bestDayScore = -1;
    for (let d = 0; d < 7; d++) {
      if (d === 6) continue; // Skip Saturday
      if (dayCounts[d] > 0) {
        const score = dayOnTime[d] / dayCounts[d];
        if (score > bestDayScore) {
          bestDayScore = score;
          bestDayIndex = d;
        }
      }
    }
    const bestDayLabel =
      bestDayScore >= 0
        ? `${WEEKDAY_LABELS[bestDayIndex]} (${Math.round(bestDayScore * 100)}% on time)`
        : "No data yet";

    // Current on-time streak
    let streak = 0;
    for (let i = validRecords.length - 1; i >= 0; i--) {
      const timeStr = toNepalTimeString(validRecords[i].clock_in);
      if (!timeStr) break;
      const [h, m] = timeStr.split(":").map(Number);
      const mins = h * 60 + m;
      if (mins <= officeHours.graceCutoffMinutes) {
        streak += 1;
      } else {
        break;
      }
    }

    // Donut Segments
    const rawSegments = [
      {
        label: `On Time (${officeHours.startTimeAmPm} – ${officeHours.graceCutoffAmPm})`,
        count: onTimeCount,
        color: COLORS.primary,
        bgClass: "bg-primary",
        icon: Clock10,
      },
      {
        label: `Early (< ${officeHours.startTimeAmPm})`,
        count: earlyCount,
        color: "#2E6B56",
        bgClass: "bg-[#2E6B56]",
        icon: Clock9,
      },
      {
        label: `Late (> ${officeHours.graceCutoffAmPm})`,
        count: lateCount,
        color: COLORS.warning,
        bgClass: "bg-warning",
        icon: Clock12,
      },
    ];

    const circumference = 2 * Math.PI * 36;
    let accumulated = 0;

    const segments = rawSegments.map((seg) => {
      const pct = totalDays > 0 ? seg.count / totalDays : 0;
      const strokeLength = pct * circumference;
      const strokeDashoffset = -accumulated;
      accumulated += strokeLength;

      return {
        ...seg,
        pct: Math.round(pct * 100),
        strokeLength,
        strokeDashoffset,
        circumference,
      };
    });

    return {
      totalDays,
      punctualityRate,
      avgInStr,
      avgOutStr,
      bestDayLabel,
      streak,
      segments,
      circumference,
    };
  }, [records, siteSummaryByDate, officeHours]);

  return (
    <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-light">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-text">Punctuality & Check-In Rhythm</h3>
            <span className="text-[11px] font-mono text-primary bg-primary-light px-2 py-0.5 rounded font-semibold border border-primary/20">
              Shift: {officeHours.shiftLabel}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Arrival consistency, check-in distribution, and timing habits for this month.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
            Punctuality Score:
          </span>
          <span className="text-lg font-mono font-bold text-text bg-surface-muted px-2.5 py-0.5 rounded-lg border border-border-light">
            {stats.punctualityRate}%
          </span>
        </div>
      </div>

      {/* CONTENT GRID: DONUT ON LEFT, HABIT STATS ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* LEFT: DONUT & SEGMENT BREAKDOWN (5 cols) */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row items-center gap-5 p-3 rounded-xl bg-surface-muted/40 border border-border-light">
          {/* SVG DONUT */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke="#EEEAE0"
                strokeWidth="11"
              />
              {stats.totalDays > 0 &&
                stats.segments.map((seg) => (
                  <circle
                    key={seg.label}
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="11"
                    strokeDasharray={`${seg.strokeLength} ${seg.circumference}`}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                ))}
            </svg>

            {/* CENTER LABEL */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
              <span className="text-base font-bold text-text font-mono leading-none">
                {stats.totalDays > 0 ? `${stats.punctualityRate}%` : "—"}
              </span>
              <span className="text-[9px] text-text-muted font-semibold mt-0.5">
                On Time
              </span>
            </div>
          </div>

          {/* CHIPS */}
          <div className="flex-1 w-full space-y-1.5 min-w-0">
            {stats.segments.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between text-xs p-1.5 px-2 rounded-lg bg-white border border-border-light shadow-2xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.bgClass}`} />
                  <span className="text-[11px] text-text-muted truncate">{s.label}</span>
                </div>
                <div className="flex items-center gap-1 font-mono shrink-0">
                  <span className="font-bold text-text text-xs">{s.count}d</span>
                  <span className="text-[10px] text-text-muted">({s.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: HABITS & INSIGHT TILES (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* AVG CLOCK IN */}
          <div className="p-3 rounded-xl bg-white border border-border shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[10px] uppercase font-bold tracking-wider">Avg Check-In</span>
              <Clock size={12} className="text-primary" />
            </div>
            <p className="text-base font-bold font-mono text-text">
              {stats.totalDays > 0 ? stats.avgInStr : "—"}
            </p>
            <p className="text-[10px] text-text-muted">Standard: {officeHours.startTimeAmPm}</p>
          </div>

          {/* AVG CLOCK OUT */}
          <div className="p-3 rounded-xl bg-white border border-border shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[10px] uppercase font-bold tracking-wider">Avg Check-Out</span>
              <Clock size={12} className="text-primary" />
            </div>
            <p className="text-base font-bold font-mono text-text">
              {stats.avgOutStr}
            </p>
            <p className="text-[10px] text-text-muted">Standard: {officeHours.endTimeAmPm}</p>
          </div>

          {/* BEST DAY */}
          <div className="p-3 rounded-xl bg-white border border-border shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[10px] uppercase font-bold tracking-wider">Best Day</span>
              <CalendarCheck size={12} className="text-[#2E6B56]" />
            </div>
            <p className="text-xs font-bold text-text truncate">
              {stats.bestDayLabel}
            </p>
            <p className="text-[10px] text-text-muted">Highest punctuality</p>
          </div>

          {/* ON TIME STREAK */}
          <div className="p-3 rounded-xl bg-white border border-border shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[10px] uppercase font-bold tracking-wider">Current Streak</span>
              <Flame size={12} className="text-warning fill-warning/20" />
            </div>
            <p className="text-base font-bold font-mono text-text flex items-center gap-1">
              <span>{stats.streak}</span>
              <span className="text-[11px] font-sans font-normal text-text-muted">
                {stats.streak === 1 ? "day" : "days"}
              </span>
            </p>
            <p className="text-[10px] text-text-muted">On-time streak</p>
          </div>
        </div>
      </div>
    </div>
  );
}

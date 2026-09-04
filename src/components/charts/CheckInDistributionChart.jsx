import { useMemo } from "react";
import { Clock, CheckCircle2, AlertTriangle, Sunrise } from "lucide-react";
import { COLORS } from "../../constants/colors";
import { useOfficeHours } from "../../constants/officeHours";
import { toNepalTimeString } from "../../utils/timezone";

function minutesToAmPm(mins) {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

export function CheckInDistributionChart({ todayAttendance }) {
  const officeHours = useOfficeHours();

  const { segments, totalPunches, onTimeRate } = useMemo(() => {
    let early = 0;
    let onTime = 0;
    let grace = 0;
    let late = 0;

    const earlyWindow = Math.min(30, officeHours.graceMinutes || 30);
    const earlyLimit = officeHours.startTimeMinutes - earlyWindow;
    const earlyLimitLabel = minutesToAmPm(earlyLimit);

    (todayAttendance || []).forEach((att) => {
      if (!att.clock_in) return;
      const timeStr = toNepalTimeString(att.clock_in);
      if (!timeStr) return;
      const [hours, minutes] = timeStr.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes;

      if (totalMinutes < earlyLimit) early += 1;
      else if (totalMinutes <= officeHours.startTimeMinutes) onTime += 1;
      else if (totalMinutes <= officeHours.graceCutoffMinutes) grace += 1;
      else late += 1;
    });

    const total = early + onTime + grace + late || 0;
    const punctualCount = early + onTime + grace;
    const rate = total > 0 ? Math.round((punctualCount / total) * 100) : 100;

    const rawSegments = [
      {
        label: `Early (< ${earlyLimitLabel})`,
        count: early,
        color: COLORS.success,
        dotColor: "bg-success",
      },
      {
        label: `Standard (${earlyLimitLabel} - ${officeHours.startTimeAmPm})`,
        count: onTime,
        color: COLORS.primary,
        dotColor: "bg-primary",
      },
      {
        label: `Grace (${officeHours.startTimeAmPm} - ${officeHours.graceCutoffAmPm})`,
        count: grace,
        color: COLORS.warning,
        dotColor: "bg-warning",
      },
      {
        label: `Late (> ${officeHours.graceCutoffAmPm})`,
        count: late,
        color: COLORS.alert,
        dotColor: "bg-alert",
      },
    ];

    // Compute SVG stroke-dasharray & stroke-dashoffset for donut radius 36 (circumference ~ 226.19)
    const circumference = 2 * Math.PI * 36;
    let accumulated = 0;

    const computed = rawSegments.map((s) => {
      const pct = total > 0 ? s.count / total : 0;
      const strokeLength = pct * circumference;
      const strokeDashoffset = -accumulated;
      accumulated += strokeLength;

      return {
        ...s,
        pct: Math.round(pct * 100),
        strokeLength,
        strokeDashoffset,
        circumference,
      };
    });

    return {
      segments: computed,
      totalPunches: total,
      onTimeRate: rate,
    };
  }, [todayAttendance, officeHours]);

  return (
    <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border-light">
        <div>
          <h3 className="text-sm font-bold text-text">Punctuality Spread</h3>
          <p className="text-[11px] text-text-muted">Today's check-in time distribution</p>
        </div>
        <span className="text-xs font-mono font-bold text-text bg-surface-muted px-2 py-0.5 rounded-lg border border-border-light">
          {totalPunches} clocked in
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
        {/* SVG DONUT RING */}
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
            {/* Background Ring */}
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke="#EEEAE0"
              strokeWidth="11"
            />
            {/* Segment Arcs */}
            {totalPunches > 0 &&
              segments.map((seg) => (
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
                  className="transition-all duration-500"
                />
              ))}
          </svg>

          {/* Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-bold text-text font-mono leading-none">
              {totalPunches > 0 ? `${onTimeRate}%` : "—"}
            </span>
            <span className="text-[9px] text-text-muted font-semibold mt-0.5">
              On-Time
            </span>
          </div>
        </div>

        {/* LEGEND CHIPS */}
        <div className="flex-1 w-full space-y-1.5">
          {segments.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-surface-muted/30 border border-border-light/60"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.dotColor}`} />
                <span className="text-[11px] text-text-muted truncate">{s.label}</span>
              </div>
              <div className="flex items-center gap-1 font-mono shrink-0">
                <span className="font-bold text-text text-xs">{s.count}</span>
                <span className="text-[10px] text-text-muted">({s.pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

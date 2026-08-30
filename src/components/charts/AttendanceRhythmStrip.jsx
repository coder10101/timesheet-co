import { useState, useMemo } from "react";
import { formatDuration, getWorkedMinutes, WORK_DAY_MINUTES, fmtTime } from "../../utils/workTime";
import { isoToBS, NEPALI_MONTHS, WEEKDAY_LABELS } from "../../utils/nepaliCalendar";
import { isLateClockIn, isDateWithinLeave, getWeekday, formatDifference } from "../../utils/attendance";
import { Clock, TrendingUp, CheckCircle2, Calendar, ShieldCheck } from "lucide-react";
import { COLORS } from "../../constants/colors";

export function AttendanceRhythmStrip({
  monthDates,
  records,
  leaveRequests,
  holidays,
  employeeId,
  employeeName,
  selectedBSMonth,
  selectedBSYear,
  todayISO,
}) {
  const [hoveredDay, setHoveredDay] = useState(null);

  const parsedDays = useMemo(() => {
    const recMap = new Map();
    (records || []).forEach((r) => recMap.set(r.date, r));

    const holidayMap = new Map();
    (holidays || []).forEach((h) => holidayMap.set(h.date, h.name));

    const approvedLeaves = (leaveRequests || []).filter(
      (l) => l.employee_id === employeeId && l.status === "Approved"
    );

    return (monthDates || []).map((d) => {
      const rec = recMap.get(d.isoDate);
      const bs = isoToBS(d.isoDate);
      const weekday = getWeekday(d.isoDate);
      const isSat = weekday === 6;
      const holidayName = holidayMap.get(d.isoDate);
      const isHol = !!holidayName;
      const isFuture = d.isoDate > todayISO;
      const isToday = d.isoDate === todayISO;

      const onLeave = approvedLeaves.find((l) =>
        isDateWithinLeave(d.isoDate, l)
      );

      let status = "none";
      let label = "No record";
      let workedMin = 0;
      let diffMin = 0;

      if (rec?.clock_in) {
        workedMin = rec.clock_out
          ? getWorkedMinutes(rec.clock_in, rec.clock_out)
          : getWorkedMinutes(rec.clock_in, new Date().toISOString());
        diffMin = workedMin - WORK_DAY_MINUTES;

        const isLate = isLateClockIn(rec.clock_in);
        status = isLate ? "late" : "present";
        label = isLate ? "Late Arrival" : "On-Time";
      } else if (onLeave) {
        status = "leave";
        label = `${onLeave.type} Leave`;
      } else if (isSat) {
        status = "weekend";
        label = "Saturday Off";
      } else if (isHol) {
        status = "holiday";
        label = holidayName || "Holiday";
      } else if (!isFuture) {
        status = "absent";
        label = "Absent / Missed";
      } else {
        status = "future";
        label = "Upcoming";
      }

      return {
        isoDate: d.isoDate,
        bsDay: d.bsDay,
        bs,
        weekday,
        isSat,
        isHol,
        holidayName,
        isToday,
        isFuture,
        status,
        label,
        record: rec,
        workedMin,
        diffMin,
        clockInTime: rec?.clock_in ? fmtTime(rec.clock_in) : null,
        clockOutTime: rec?.clock_out ? fmtTime(rec.clock_out) : null,
      };
    });
  }, [monthDates, records, leaveRequests, holidays, employeeId, todayISO]);

  // Aggregate monthly performance
  const workedDays = parsedDays.filter((d) => d.status === "present" || d.status === "late");
  const onTimeCount = parsedDays.filter((d) => d.status === "present").length;
  const lateCount = parsedDays.filter((d) => d.status === "late").length;
  const leaveCount = parsedDays.filter((d) => d.status === "leave").length;
  const totalWorkedMin = workedDays.reduce((acc, d) => acc + d.workedMin, 0);
  const netVarianceMin = workedDays.reduce((acc, d) => acc + d.diffMin, 0);

  const punctualityScore = workedDays.length > 0
    ? Math.round((onTimeCount / workedDays.length) * 100)
    : 100;

  const avgDailyMin = workedDays.length > 0
    ? Math.round(totalWorkedMin / workedDays.length)
    : 0;

  return (
    <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-3.5">
      {/* HEADER & INSIGHT HIGHLIGHTS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border-light">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-text">
            Monthly Shift Rhythm ({NEPALI_MONTHS[selectedBSMonth - 1]} {selectedBSYear})
          </h3>
          <p className="text-[11px] text-text-muted">
            At-a-glance monthly check-in timeline and attendance pattern
          </p>
        </div>

        {/* 3 COMPACT INSIGHT PILLS */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-success-light text-success border border-success/30 font-semibold font-mono text-[11px]">
            <CheckCircle2 size={12} />
            <span>{punctualityScore}% Punctual</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-muted text-text border border-border-light font-semibold font-mono text-[11px]">
            <Clock size={12} className="text-text-muted" />
            <span>{formatDuration(avgDailyMin)}/day avg</span>
          </span>

          {netVarianceMin !== 0 && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold font-mono text-[11px] ${
                netVarianceMin > 0
                  ? "bg-success-light text-success border border-success/30"
                  : "bg-alert-light text-alert border border-alert/30"
              }`}
            >
              <TrendingUp size={12} />
              <span>{netVarianceMin > 0 ? `+${formatDifference(netVarianceMin)} OT` : `-${formatDifference(Math.abs(netVarianceMin))} Deficit`}</span>
            </span>
          )}
        </div>
      </div>

      {/* MONTHLY CALENDAR RHYTHM STRIP */}
      <div className="relative pt-1">
        <div className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-16 lg:grid-cols-31 gap-1 sm:gap-1.5">
          {parsedDays.map((d) => {
            const isHovered = hoveredDay?.bsDay === d.bsDay;

            let blockStyle = "bg-surface-muted border-border-light text-text-muted";
            if (d.status === "present") {
              blockStyle = "bg-success text-white hover:brightness-110";
            } else if (d.status === "late") {
              blockStyle = "bg-warning text-white hover:brightness-110";
            } else if (d.status === "leave") {
              blockStyle = "bg-primary text-white hover:brightness-110";
            } else if (d.status === "absent") {
              blockStyle = "bg-alert-light border border-alert/40 text-alert hover:bg-alert-light/80";
            } else if (d.status === "weekend") {
              blockStyle = "bg-surface-muted/60 border border-dashed border-border text-text-faint";
            } else if (d.status === "holiday") {
              blockStyle = "bg-warning/20 border border-warning/40 text-warning";
            } else if (d.status === "future") {
              blockStyle = "bg-surface-muted/30 border border-border-light text-text-faint opacity-50";
            }

            return (
              <div
                key={d.bsDay}
                onMouseEnter={() => setHoveredDay(d)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`h-9 rounded-xl flex flex-col items-center justify-center font-mono text-[10px] font-bold cursor-pointer transition-all ${blockStyle} ${
                  d.isToday ? "ring-2 ring-primary ring-offset-1 shadow-xs" : ""
                }`}
                title={`Day ${d.bsDay}: ${d.label}`}
              >
                <span>{d.bsDay}</span>
              </div>
            );
          })}
        </div>

        {/* FLOATING HOVER CARD */}
        {hoveredDay && (
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-text text-white p-2.5 rounded-xl shadow-xl z-20 text-[11px] space-y-1 w-44 pointer-events-none fade-in">
            <div className="flex items-center justify-between border-b border-white/20 pb-1">
              <span className="font-bold">
                {hoveredDay.bsDay} {NEPALI_MONTHS[selectedBSMonth - 1]}
              </span>
              <span className="text-[10px] text-white/70">
                {WEEKDAY_LABELS[hoveredDay.weekday]}
              </span>
            </div>

            <p className="font-semibold text-white/90">
              {hoveredDay.label}
            </p>

            {hoveredDay.clockInTime && (
              <div className="text-[10px] font-mono space-y-0.5 pt-0.5 text-white/80">
                <p>In: {hoveredDay.clockInTime} {hoveredDay.clockOutTime ? `→ Out: ${hoveredDay.clockOutTime}` : "(On shift)"}</p>
                <p>Worked: {formatDuration(hoveredDay.workedMin)}</p>
                {hoveredDay.diffMin > 0 && (
                  <p className="text-[#A9C5AC] font-bold">+{formatDifference(hoveredDay.diffMin)} Overtime</p>
                )}
                {hoveredDay.diffMin < 0 && hoveredDay.clockOutTime && (
                  <p className="text-[#F2A89A] font-bold">-{formatDifference(Math.abs(hoveredDay.diffMin))} Short</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RHYTHM LEGEND */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-light text-[10px] text-text-muted">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-success" />
            <span>On-Time ({onTimeCount}d)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-warning" />
            <span>Late Arrival ({lateCount}d)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
            <span>On Leave ({leaveCount}d)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-surface-muted border border-dashed border-border" />
            <span>Weekend Off</span>
          </span>
        </div>

        <span className="font-mono">{workedDays.length} active shifts this month</span>
      </div>
    </div>
  );
}

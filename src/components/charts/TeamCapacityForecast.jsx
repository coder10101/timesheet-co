import { useMemo } from "react";
import { getWeekday } from "../../utils/attendance";
import { isoToBS, NEPALI_MONTHS, WEEKDAY_LABELS } from "../../utils/nepaliCalendar";
import { Users, CalendarCheck } from "lucide-react";
import { getEmployeeColor } from "../../constants/colors";

export function TeamCapacityForecast({ today, employees, leaveRequests, holidays }) {
  // Generate 7-day horizon: today + next 6 days
  const horizonDates = useMemo(() => {
    const dates = [];
    const [y, m, d] = today.split("-").map(Number);
    const cur = new Date(y, m - 1, d);

    for (let i = 0; i < 7; i++) {
      const cy = cur.getFullYear();
      const cm = String(cur.getMonth() + 1).padStart(2, "0");
      const cd = String(cur.getDate()).padStart(2, "0");
      dates.push(`${cy}-${cm}-${cd}`);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [today]);

  const forecastData = useMemo(() => {
    const totalStaff = employees?.length || 0;
    const holidayMap = new Map();
    (holidays || []).forEach((h) => holidayMap.set(h.date, h.name));

    const approvedLeaves = (leaveRequests || []).filter((r) => r.status === "Approved");

    return horizonDates.map((date, idx) => {
      const weekday = getWeekday(date);
      const isSat = weekday === 6;
      const holidayName = holidayMap.get(date);
      const isHol = !!holidayName;
      const isToday = date === today;
      const bs = isoToBS(date);

      // Find staff on leave on this date
      const onLeaveStaff = approvedLeaves
        .filter((l) => date >= l.start_date && date <= l.end_date)
        .map((l) => {
          const emp = (employees || []).find((e) => e.id === l.employee_id);
          return {
            id: l.employee_id,
            name: l.employeeName || emp?.name || "Staff",
            type: l.type,
            reason: l.reason,
            color: getEmployeeColor(l.employee_id, l.employeeName),
          };
        });

      const availableCount = isSat || isHol ? 0 : Math.max(0, totalStaff - onLeaveStaff.length);
      const capacityPct = totalStaff > 0 && !isSat && !isHol
        ? Math.round((availableCount / totalStaff) * 100)
        : 0;

      return {
        date,
        idx,
        isToday,
        weekday,
        isSat,
        isHol,
        holidayName,
        bs,
        totalStaff,
        availableCount,
        capacityPct,
        onLeaveStaff,
      };
    });
  }, [horizonDates, today, employees, leaveRequests, holidays]);

  return (
    <div className="w-full bg-white border border-border rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3 overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck size={15} className="text-primary shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-text">Team Schedule (Next 7 Days)</h3>
          </div>
          <p className="text-[11px] text-text-muted">
            Expected in-office staff and approved leaves
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-[10px] font-medium text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span>Everyone In</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span>On Leave</span>
          </span>
        </div>
      </div>

      {/* 7-DAY SCHEDULE CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {forecastData.map((d) => {
          const isFull = d.capacityPct === 100;
          const isPartial = d.capacityPct > 0 && d.capacityPct < 100;

          return (
            <div
              key={d.date}
              className={`rounded-xl p-2.5 border transition-all space-y-1.5 flex flex-col justify-between min-w-0 ${
                d.isToday
                  ? "bg-primary-light/40 border-primary ring-1 ring-primary/20 shadow-xs"
                  : d.isSat || d.isHol
                    ? "bg-surface-muted/50 border-border-light"
                    : isPartial
                      ? "bg-warning-light/20 border-warning/30"
                      : "bg-surface-muted/20 border-border-light hover:bg-surface-muted/40"
              }`}
            >
              {/* DAY HEADER */}
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold truncate ${
                      d.isToday
                        ? "text-primary"
                        : d.isSat
                          ? "text-alert"
                          : "text-text-muted"
                    }`}
                  >
                    {WEEKDAY_LABELS[d.weekday]}
                  </span>
                  {d.isToday && (
                    <span className="text-[8px] font-bold text-primary bg-primary-light px-1 py-0.2 rounded font-mono shrink-0">
                      Today
                    </span>
                  )}
                </div>

                <p className="text-[11px] font-bold text-text truncate mt-0.5">
                  {d.bs ? `${d.bs.day} ${NEPALI_MONTHS[d.bs.month - 1]}` : d.date}
                </p>
              </div>

              {/* STATUS CONTENT */}
              <div className="space-y-1">
                {d.isSat ? (
                  <div className="py-1 text-center">
                    <span className="text-[9px] font-medium text-text-muted bg-surface-muted px-1.5 py-0.5 rounded border border-border block truncate">
                      Saturday Off
                    </span>
                  </div>
                ) : d.isHol ? (
                  <div className="py-1 text-center">
                    <span className="text-[9px] font-semibold text-warning bg-warning-light px-1.5 py-0.5 rounded border border-warning/20 truncate block" title={d.holidayName}>
                      {d.holidayName || "Holiday"}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="font-mono font-bold text-text">
                        {d.availableCount}/{d.totalStaff}
                      </span>
                      <span
                        className={`text-[9px] font-bold font-mono ${
                          isFull ? "text-success" : "text-warning"
                        }`}
                      >
                        {d.capacityPct}%
                      </span>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="w-full h-1 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFull ? "bg-success" : "bg-warning"
                        }`}
                        style={{ width: `${d.capacityPct}%` }}
                      />
                    </div>

                    {/* LEAVE NAMES */}
                    {d.onLeaveStaff.length > 0 && (
                      <div className="pt-1 border-t border-border-light/60">
                        <div className="flex flex-wrap gap-1">
                          {d.onLeaveStaff.map((staff) => (
                            <span
                              key={staff.id}
                              className="inline-flex items-center gap-1 text-[8px] font-semibold px-1 py-0.2 rounded bg-white border border-border shadow-2xs truncate max-w-full"
                              title={`${staff.name} (${staff.type})`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: staff.color }}
                              />
                              <span className="truncate">{staff.name.split(" ")[0]}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

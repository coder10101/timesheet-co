import { useMemo } from "react";
import { isLateClockIn } from "../../utils/attendance";
import { isoToBS } from "../../utils/nepaliCalendar";
import { getEmployeeColor } from "../../constants/colors";
import { Award, Clock, Star, CheckCircle2 } from "lucide-react";
import { useOfficeHours } from "../../constants/officeHours";

export function PunctualityRadar({
  employees,
  allAttendance,
  currentBSMonth,
  currentBSYear,
}) {
  const officeHours = useOfficeHours();
  const punctualityStats = useMemo(() => {
    if (!employees || !allAttendance) return { stars: [], repeatLate: [] };

    const empMap = new Map();
    employees.forEach((emp) => {
      empMap.set(emp.id, {
        employee: emp,
        loggedDays: 0,
        onTimeDays: 0,
        lateDays: 0,
        totalClockInMinutes: 0,
      });
    });

    allAttendance.forEach((rec) => {
      if (!rec.clock_in) return;
      const stat = empMap.get(rec.employee_id);
      if (!stat) return;

      const bs = isoToBS(rec.date);
      if (!bs || bs.month !== currentBSMonth || bs.year !== currentBSYear)
        return;

      stat.loggedDays += 1;
      const isLate = isLateClockIn(rec.clock_in, null, officeHours);
      if (isLate) {
        stat.lateDays += 1;
      } else {
        stat.onTimeDays += 1;
      }

      const d = new Date(rec.clock_in);
      stat.totalClockInMinutes += d.getHours() * 60 + d.getMinutes();
    });

    const list = Array.from(empMap.values()).map((s) => {
      const punctualityPct =
        s.loggedDays > 0
          ? Math.round((s.onTimeDays / s.loggedDays) * 100)
          : 100;
      const avgMinutes =
        s.loggedDays > 0 ? Math.round(s.totalClockInMinutes / s.loggedDays) : 0;
      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = avgMinutes % 60;
      const avgTimeStr = `${avgHours % 12 || 12}:${String(avgMins).padStart(2, "0")} ${avgHours >= 12 ? "PM" : "AM"}`;

      return {
        ...s,
        punctualityPct,
        avgTimeStr,
      };
    });

    // 100% Punctual Stars with at least 1 day logged
    const stars = list
      .filter((s) => s.loggedDays > 0 && s.lateDays === 0)
      .sort((a, b) => b.onTimeDays - a.onTimeDays)
      .slice(0, 3);

    // Repeat late check-ins
    const repeatLate = list
      .filter((s) => s.lateDays > 0)
      .sort((a, b) => b.lateDays - a.lateDays)
      .slice(0, 3);

    return { stars, repeatLate };
  }, [employees, allAttendance, currentBSMonth, currentBSYear, officeHours]);

  return (
    <div className="w-full bg-white border border-border rounded-2xl p-3 sm:px-3.5 sm:py-2.5 shadow-2xs space-y-2 overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between pb-1.5 border-b border-border-light">
        <div className="flex items-center gap-1.5">
          <Award size={14} className="text-primary shrink-0" />
          <h3 className="text-xs font-bold text-text">
            Punctuality leaderboard
          </h3>
        </div>

        <span className="text-[9px] font-semibold text-primary bg-primary-light px-2 py-0.5 rounded-md border border-primary/30 shrink-0">
          This Month
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
        {/* ALWAYS ON TIME */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-bold text-text mb-1">
            <Star size={11} className="text-success fill-success shrink-0" />
            <span>Always On Time</span>
          </div>

          {punctualityStats.stars.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg bg-surface-muted/30 border border-border-light text-center text-[10px] text-text-muted">
              <span>No records yet this month</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-start space-y-1">
              {punctualityStats.stars.map((item) => (
                <div
                  key={item.employee.id}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-success-light/20 border border-success/30 min-w-0 gap-1.5"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{
                        backgroundColor: getEmployeeColor(item.employee),
                      }}
                    >
                      {item.employee.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text truncate leading-tight">
                        {item.employee.name}
                      </p>
                      <p className="text-[9px] text-text-muted whitespace-nowrap">
                        Avg: {item.avgTimeStr}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] font-bold text-success bg-white px-1.5 py-0.5 rounded border border-success/30 shrink-0">
                    {item.onTimeDays}d In
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LATE ARRIVALS */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-bold text-text mb-1">
            <Clock size={11} className="text-warning shrink-0" />
            <span>Late Arrivals</span>
          </div>

          {punctualityStats.repeatLate.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg bg-surface-muted/30 border border-border-light text-center text-[10px] text-text-muted">
              <CheckCircle2 size={12} className="text-success mb-0.5" />
              <span>Zero late check-ins!</span>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-start space-y-1">
              {punctualityStats.repeatLate.map((item) => (
                <div
                  key={item.employee.id}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-warning-light/20 border border-warning/30 min-w-0 gap-1.5"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{
                        backgroundColor: getEmployeeColor(item.employee),
                      }}
                    >
                      {item.employee.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text truncate leading-tight">
                        {item.employee.name}
                      </p>
                      <p className="text-[9px] text-text-muted whitespace-nowrap">
                        Avg: {item.avgTimeStr}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] font-bold text-warning bg-white px-1.5 py-0.5 rounded border border-warning/30 shrink-0">
                    {item.lateDays} Late
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

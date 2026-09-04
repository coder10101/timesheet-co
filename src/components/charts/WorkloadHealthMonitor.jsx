import { useMemo } from "react";
import {
  getWorkedMinutes,
  getEffectiveClockOut,
  formatDuration,
  WORK_DAY_MINUTES,
} from "../../utils/workTime";
import { isoToBS } from "../../utils/nepaliCalendar";
import { getEmployeeColor } from "../../constants/colors";
import { Clock, AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";

export function WorkloadHealthMonitor({ employees, allAttendance, currentBSMonth, currentBSYear }) {
  const workloadStats = useMemo(() => {
    if (!employees || !allAttendance) return { overtimeLeaders: [], deficitMembers: [], balancedCount: 0 };

    const empMap = new Map();
    employees.forEach((emp) => {
      empMap.set(emp.id, {
        employee: emp,
        totalWorkedMinutes: 0,
        loggedDays: 0,
        overtimeMinutes: 0,
        undertimeMinutes: 0,
      });
    });

    allAttendance.forEach((rec) => {
      const effOut = getEffectiveClockOut(rec);
      if (!rec.clock_in || !effOut) return;
      const stat = empMap.get(rec.employee_id);
      if (!stat) return;

      const bs = isoToBS(rec.date);
      if (!bs || bs.month !== currentBSMonth || bs.year !== currentBSYear) return;

      const worked = getWorkedMinutes(rec.clock_in, effOut, rec.break_minutes || 0);
      stat.totalWorkedMinutes += worked;
      stat.loggedDays += 1;

      const diff = worked - WORK_DAY_MINUTES;
      if (diff > 0) stat.overtimeMinutes += diff;
      else if (diff < 0) stat.undertimeMinutes += Math.abs(diff);
    });

    const list = Array.from(empMap.values()).map((s) => {
      const netMinutes = s.overtimeMinutes - s.undertimeMinutes;
      const avgMinutes = s.loggedDays > 0 ? Math.round(s.totalWorkedMinutes / s.loggedDays) : 0;
      return {
        ...s,
        netMinutes,
        avgMinutes,
        netHours: +(netMinutes / 60).toFixed(1),
      };
    });

    const overtimeLeaders = list
      .filter((s) => s.netMinutes > 60)
      .sort((a, b) => b.netMinutes - a.netMinutes)
      .slice(0, 3);

    const deficitMembers = list
      .filter((s) => s.netMinutes < -60)
      .sort((a, b) => a.netMinutes - b.netMinutes)
      .slice(0, 3);

    const balancedCount = list.length - overtimeLeaders.length - deficitMembers.length;

    return { overtimeLeaders, deficitMembers, balancedCount };
  }, [employees, allAttendance, currentBSMonth, currentBSYear]);

  return (
    <div className="w-full bg-white border border-border rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3 overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between pb-2 border-b border-border-light">
        <div>
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-primary shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-text">Work Hours Overview</h3>
          </div>
          <p className="text-[11px] text-text-muted">
            Staff with extra overtime or short working hours this month
          </p>
        </div>

        <span className="text-[10px] font-semibold text-success bg-success-light px-2 py-0.5 rounded-md border border-success/30 shrink-0">
          {workloadStats.balancedCount} On Track
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* OVERTIME */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-1 text-[11px] font-bold text-text">
            <TrendingUp size={12} className="text-success shrink-0" />
            <span>Highest Overtime</span>
          </div>

          {workloadStats.overtimeLeaders.length === 0 ? (
            <div className="p-3 rounded-xl bg-surface-muted/30 border border-border-light text-center text-[11px] text-text-muted">
              <ShieldCheck size={14} className="text-success mx-auto mb-0.5" />
              <span>No overtime logged</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {workloadStats.overtimeLeaders.map((item) => (
                <div
                  key={item.employee.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-success-light/20 border border-success/30 min-w-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: getEmployeeColor(item.employee) }}
                    >
                      {item.employee.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text truncate">
                        {item.employee.name}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        Daily Avg: {formatDuration(item.avgMinutes)}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-success bg-white px-2 py-0.5 rounded-md border border-success/30 shrink-0">
                    +{item.netHours}h
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DEFICIT / UNDERTIME */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-1 text-[11px] font-bold text-text">
            <AlertTriangle size={12} className="text-alert shrink-0" />
            <span>Short Hours (Below 8h)</span>
          </div>

          {workloadStats.deficitMembers.length === 0 ? (
            <div className="p-3 rounded-xl bg-surface-muted/30 border border-border-light text-center text-[11px] text-text-muted">
              <ShieldCheck size={14} className="text-success mx-auto mb-0.5" />
              <span>All staff meeting daily hours</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {workloadStats.deficitMembers.map((item) => (
                <div
                  key={item.employee.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-alert-light/20 border border-alert/30 min-w-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: getEmployeeColor(item.employee) }}
                    >
                      {item.employee.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text truncate">
                        {item.employee.name}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        Daily Avg: {formatDuration(item.avgMinutes)}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-alert bg-white px-2 py-0.5 rounded-md border border-alert/30 shrink-0">
                    {item.netHours}h
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

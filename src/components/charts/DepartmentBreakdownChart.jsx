import { useMemo } from "react";
import { Building2, Users, CheckCircle2 } from "lucide-react";
import { COLORS } from "../../constants/colors";

export function DepartmentBreakdownChart({ employees, employeeStatusMap }) {
  const deptStats = useMemo(() => {
    const map = new Map();

    (employees || []).forEach((emp) => {
      const dept = emp.department || "General";
      if (!map.has(dept)) {
        map.set(dept, { total: 0, present: 0, late: 0, onLeave: 0, absent: 0 });
      }

      const stat = map.get(dept);
      stat.total += 1;

      const info = employeeStatusMap.get(emp.id);
      if (info?.status === "Present") stat.present += 1;
      else if (info?.status === "Late") stat.late += 1;
      else if (info?.status === "On Leave") stat.onLeave += 1;
      else stat.absent += 1;
    });

    return Array.from(map.entries())
      .map(([name, data]) => {
        const checkedIn = data.present + data.late;
        const rate = data.total > 0 ? Math.round((checkedIn / data.total) * 100) : 0;
        const punctuality = checkedIn > 0 ? Math.round((data.present / checkedIn) * 100) : 100;
        return { name, ...data, checkedIn, rate, punctuality };
      })
      .sort((a, b) => b.rate - a.rate || b.total - a.total);
  }, [employees, employeeStatusMap]);

  if (deptStats.length === 0) return null;

  return (
    <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border-light">
        <div>
          <h3 className="text-sm font-bold text-text">Department Turnout</h3>
          <p className="text-[11px] text-text-muted">Attendance rates across organizational units</p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-text-muted">
          <Building2 size={13} className="text-primary" />
          <span className="font-semibold">{deptStats.length} Teams</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {deptStats.map((dept) => {
          const isHigh = dept.rate >= 80;
          const isMid = dept.rate >= 50 && dept.rate < 80;

          return (
            <div
              key={dept.name}
              className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/40 border border-border-light hover:bg-surface-muted transition-colors"
            >
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-text truncate">{dept.name}</h4>
                <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-0.5">
                  <span className="font-mono">{dept.checkedIn}/{dept.total} present</span>
                  {dept.late > 0 && (
                    <span className="text-warning font-semibold font-mono">
                      · {dept.late} late
                    </span>
                  )}
                </div>
              </div>

              {/* MINI CIRCULAR GAUGE BADGE */}
              <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#EEEAE0"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={isHigh ? COLORS.success : isMid ? COLORS.warning : COLORS.alert}
                    strokeWidth="3.5"
                    strokeDasharray={`${dept.rate}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold font-mono text-text">
                  {dept.rate}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  Users,
  CalendarDays,
  ArrowRight,
  Sun,
  HeartPulse,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card } from "../../../components/Card";
import { getInitials } from "../../../constants/projectPresets";
import { getEmployeeColor } from "../../../constants/colors";
import { isoToBS, NEPALI_MONTHS } from "../../../utils/nepaliCalendar";
import { todayISO } from "../../../utils/workTime";
import { isHalfDayLeave, getHalfDaySession } from "../../../utils/leaveUtils";

export function TeammatesOnLeaveCard({ teamLeaves = [], me, today = todayISO() }) {
  // Filter approved leaves for other teammates (exclude self), sorted chronologically
  const activeTeammateLeaves = useMemo(() => {
    return (teamLeaves || [])
      .filter((l) => l.employee_id !== me?.id && l.status === "Approved" && l.end_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [teamLeaves, me?.id, today]);

  // Who is on leave today
  const onLeaveToday = useMemo(() => {
    return activeTeammateLeaves.filter(
      (l) => l.start_date <= today && l.end_date >= today,
    );
  }, [activeTeammateLeaves, today]);

  // Upcoming leaves (starting after today, limited to next 3)
  const upcomingLeaves = useMemo(() => {
    return activeTeammateLeaves.filter((l) => l.start_date > today).slice(0, 3);
  }, [activeTeammateLeaves, today]);

  const formatLeaveDates = (start, end) => {
    const bsStart = isoToBS(start);
    const bsEnd = isoToBS(end);
    if (!bsStart || !bsEnd) return `${start} - ${end}`;
    if (start === end) {
      return `${bsStart.day} ${NEPALI_MONTHS[bsStart.month - 1]}`;
    }
    if (bsStart.month === bsEnd.month) {
      return `${bsStart.day} - ${bsEnd.day} ${NEPALI_MONTHS[bsStart.month - 1]}`;
    }
    return `${bsStart.day} ${NEPALI_MONTHS[bsStart.month - 1]} - ${bsEnd.day} ${NEPALI_MONTHS[bsEnd.month - 1]}`;
  };

  const getRelativeDays = (date) => {
    const [ey, em, ed] = date.split("-").map(Number);
    const [ty, tm, td] = today.split("-").map(Number);
    const target = new Date(ey, em - 1, ed);
    const current = new Date(ty, tm - 1, td);
    const diff = Math.round((target.getTime() - current.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff <= 7) return `In ${diff} days`;
    return null;
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users size={13} />
          </div>
          <h3 className="text-sm font-semibold text-text">Teammates on Leave</h3>
        </div>

        <NavLink
          to="/calendar"
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition shrink-0"
        >
          <span>Team calendar</span>
          <ArrowRight size={12} />
        </NavLink>
      </div>

      {activeTeammateLeaves.length === 0 ? (
        <div className="py-4 px-3 rounded-xl bg-slate-50/60 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-1">
          <span className="text-base">🎉</span>
          <p className="text-xs font-semibold text-slate-700">
            Everyone is present
          </p>
          <p className="text-[11px] text-slate-400">
            No teammates are currently on leave or scheduled this week.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* TODAY SECTION */}
          {onLeaveToday.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Out of Office Today ({onLeaveToday.length})
                </span>
              </div>

              <div className="space-y-1.5">
                {onLeaveToday.map((leave) => {
                  const empColor = getEmployeeColor(leave.employeeName || "User");
                  const isHalf = isHalfDayLeave(leave);
                  const session = getHalfDaySession(leave);

                  return (
                    <div
                      key={leave.id}
                      className="p-2 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-2xs"
                          style={{ backgroundColor: empColor }}
                        >
                          {getInitials(leave.employeeName || "Team")}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {leave.employeeName || "Teammate"}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {leave.employeeTitle || leave.employeeRole || "Colleague"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            leave.type === "Sick"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {leave.type}
                          {isHalf && ` • ${session === "first" ? "1st Half" : "2nd Half"}`}
                        </span>
                        {leave.start_date !== leave.end_date && (
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            Until {formatLeaveDates(leave.start_date, leave.end_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* UPCOMING SECTION */}
          {upcomingLeaves.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Upcoming Leaves
                </span>
              </div>

              <div className="space-y-1.5">
                {upcomingLeaves.map((leave) => {
                  const empColor = getEmployeeColor(leave.employeeName || "User");
                  const relDays = getRelativeDays(leave.start_date);
                  const isHalf = isHalfDayLeave(leave);

                  return (
                    <div
                      key={leave.id}
                      className="px-2.5 py-2 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] text-white shrink-0"
                          style={{ backgroundColor: empColor }}
                        >
                          {getInitials(leave.employeeName || "Team")}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-800 text-xs truncate block">
                            {leave.employeeName}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {formatLeaveDates(leave.start_date, leave.end_date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {relDays && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200/80 text-slate-700">
                            {relDays}
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                            leave.type === "Sick"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {leave.type}
                          {isHalf ? " (0.5d)" : ` (${leave.days}d)`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

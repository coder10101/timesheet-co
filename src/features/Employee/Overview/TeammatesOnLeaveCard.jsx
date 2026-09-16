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

export function TeammatesOnLeaveCard({
  teamLeaves = [],
  me,
  today = todayISO(),
  embedded = false,
}) {
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

  if (embedded) {
    return (
      <div className="mt-3.5 pt-3 border-t border-white/10 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-md bg-white/10 text-amber-300 flex items-center justify-center shrink-0">
              <Users size={12} />
            </div>
            <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/70 truncate">
              Teammates on Leave
            </h4>
            {onLeaveToday.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0 animate-pulse">
                {onLeaveToday.length} today
              </span>
            )}
          </div>

          <NavLink
            to="/calendar"
            className="flex items-center gap-1 text-[11px] font-semibold text-white/50 hover:text-white transition shrink-0"
          >
            <span>Calendar</span>
            <ArrowRight size={11} />
          </NavLink>
        </div>

        {activeTeammateLeaves.length === 0 ? (
          <div className="py-2 px-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-xs text-white/70">
            <span className="text-sm">🎉</span>
            <span className="font-medium text-white/80">
              No one is on leave today
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {/* TODAY SECTION */}
            {onLeaveToday.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-0.5">
                {onLeaveToday.map((leave) => {
                  const empColor = getEmployeeColor(leave.employeeName || "User");
                  const isHalf = isHalfDayLeave(leave);
                  const session = getHalfDaySession(leave);

                  return (
                    <div
                      key={leave.id}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] text-white shrink-0 shadow-2xs"
                          style={{ backgroundColor: empColor }}
                        >
                          {getInitials(leave.employeeName || "Team")}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate leading-tight">
                            {leave.employeeName}
                          </p>
                          <p className="text-[10px] text-white/40 truncate leading-tight">
                            {leave.employeeTitle || leave.employeeRole || "Colleague"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                            leave.type === "Sick"
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                              : "bg-sky-500/20 text-sky-300 border-sky-500/30"
                          }`}
                        >
                          {leave.type}
                          {isHalf && ` • ${session === "first" ? "1st" : "2nd"}`}
                        </span>
                        {leave.start_date !== leave.end_date && (
                          <span className="text-[9px] text-white/40 font-mono">
                            (until {formatLeaveDates(leave.start_date, leave.end_date)})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-2 px-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-xs text-white/70">
                <span className="text-sm">🎉</span>
                <span className="font-medium text-white/80">
                  No one is on leave today
                </span>
              </div>
            )}

            {/* UPCOMING SECTION PREVIEW */}
            {upcomingLeaves.length > 0 && (
              <div className="pt-1.5 flex items-center gap-1.5 text-[10px] text-white/50 overflow-x-auto">
                <span className="font-bold uppercase tracking-wider text-white/40 shrink-0 text-[9px]">
                  Upcoming:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {upcomingLeaves.slice(0, 3).map((l) => (
                    <span
                      key={l.id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/80 text-[10px] font-medium"
                      title={`${l.employeeName} - ${formatLeaveDates(l.start_date, l.end_date)}`}
                    >
                      <span className="font-semibold text-white">
                        {l.employeeName?.split(" ")[0]}
                      </span>
                      <span className="text-white/40">· {l.type}</span>
                      <span className="text-[9px] text-amber-300 font-mono">
                        ({getRelativeDays(l.start_date)})
                      </span>
                    </span>
                  ))}
                  {upcomingLeaves.length > 3 && (
                    <span className="text-[10px] text-white/40 font-medium">
                      +{upcomingLeaves.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users size={12} />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text truncate">
            Teammates on Leave
          </h3>
          {onLeaveToday.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0 animate-pulse">
              {onLeaveToday.length} today
            </span>
          )}
        </div>

        <NavLink
          to="/calendar"
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-dark transition shrink-0"
        >
          <span>Calendar</span>
          <ArrowRight size={11} />
        </NavLink>
      </div>

      {activeTeammateLeaves.length === 0 ? (
        <div className="py-2 px-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center gap-1.5 text-xs text-slate-600">
          <span>🎉</span>
          <span className="font-medium text-slate-700">No one is on leave today</span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* TODAY SECTION */}
          {onLeaveToday.length > 0 ? (
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-0.5">
              {onLeaveToday.map((leave) => {
                const empColor = getEmployeeColor(leave.employeeName || "User");
                const isHalf = isHalfDayLeave(leave);
                const session = getHalfDaySession(leave);

                return (
                  <div
                    key={leave.id}
                    className="px-2 py-1.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: empColor }}
                      >
                        {getInitials(leave.employeeName || "Team")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                          {leave.employeeName}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate leading-tight">
                          {leave.employeeTitle || leave.employeeRole || "Colleague"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                          leave.type === "Sick"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {leave.type}
                        {isHalf && ` • ${session === "first" ? "1st" : "2nd"}`}
                      </span>
                      {leave.start_date !== leave.end_date && (
                        <span className="text-[9px] text-slate-400 font-mono">
                          (until {formatLeaveDates(leave.start_date, leave.end_date)})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-2 px-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center gap-1.5 text-xs text-slate-600">
              <span>🎉</span>
              <span className="font-medium text-slate-700">No one is on leave today</span>
            </div>
          )}

          {/* UPCOMING SECTION PREVIEW */}
          {upcomingLeaves.length > 0 && (
            <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-500 overflow-x-auto">
              <span className="font-bold uppercase tracking-wider text-slate-400 shrink-0">
                Upcoming:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {upcomingLeaves.slice(0, 3).map((l) => (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                    title={`${l.employeeName} - ${formatLeaveDates(l.start_date, l.end_date)}`}
                  >
                    <span className="font-semibold text-slate-800">{l.employeeName?.split(" ")[0]}</span>
                    <span className="text-slate-400">· {l.type}</span>
                    <span className="text-[9px] text-slate-500 font-mono">({getRelativeDays(l.start_date)})</span>
                  </span>
                ))}
                {upcomingLeaves.length > 3 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    +{upcomingLeaves.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

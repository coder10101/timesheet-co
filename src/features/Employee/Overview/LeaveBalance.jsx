import { NavLink } from "react-router-dom";
import { Sun, HeartPulse, Umbrella, CalendarDays, ArrowRight } from "lucide-react";
import { Card } from "../../../components/Card";
import { COLORS } from "../../../constants/colors";
import { formatLeaveBalance, calculateEmployeeLeaveStats } from "../../../utils/leaveUtils";
import { isoToBS, NEPALI_MONTHS } from "../../../utils/nepaliCalendar";
import { todayISO } from "../../../utils/workTime";

const LEAVE_VISUAL = {
  Annual: {
    icon: Sun,
    color: COLORS.primary,
    max: 24,
  },
  Sick: {
    icon: HeartPulse,
    color: COLORS.alert,
    max: 6,
  },
};

export function LeaveBalance({ myLeave = [], me, today = todayISO() }) {
  const pendingRequests = (myLeave || []).filter(
    (leave) => leave.status === "Pending",
  );
  const pendingLeave = pendingRequests.length;

  // Active leave today for this employee
  const activeLeaveToday = (myLeave || []).find(
    (l) => l.status === "Approved" && l.start_date <= today && l.end_date >= today,
  );

  // Upcoming approved leave for this employee
  const upcomingLeave = (myLeave || [])
    .filter((l) => l.status === "Approved" && l.start_date > today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

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

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Sun size={12} />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text truncate">
            My Leaves & Balance
          </h3>
        </div>

        <NavLink
          to="/leave"
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-dark transition shrink-0"
        >
          <span>Request / View</span>
          <ArrowRight size={11} />
        </NavLink>
      </div>

      {/* TICKET STUBS */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(LEAVE_VISUAL).map(
          ([type, { icon: Icon, color, max }]) => {
            const stats = calculateEmployeeLeaveStats(myLeave, me?.id, type, max);
            const value = stats.remaining;
            const used = stats.used;
            const isOut = value <= 0;
            const stubColor = isOut ? "#B5563A" : color;

            return (
              <div
                key={type}
                className="flex rounded-lg overflow-hidden border border-border-light bg-white"
              >
                {/* stub */}
                <div
                  className="w-11 shrink-0 flex flex-col items-center justify-center py-1.5 text-white"
                  style={{ backgroundColor: stubColor }}
                >
                  <span className="font-mono text-sm font-bold leading-none">
                    {formatLeaveBalance(value)}
                  </span>
                  <span className="text-[7px] uppercase tracking-wide text-white/75 mt-0.5">
                    left
                  </span>
                </div>

                {/* perforation */}
                <div className="relative w-px shrink-0">
                  <div
                    className="absolute inset-y-1 left-0 w-px"
                    style={{
                      backgroundImage: `linear-gradient(${stubColor} 50%, transparent 0%)`,
                      backgroundSize: "1px 6px",
                      backgroundRepeat: "repeat-y",
                      opacity: 0.35,
                    }}
                  />
                  <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-surface-muted" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-surface-muted" />
                </div>

                {/* details */}
                <div className="flex-1 min-w-0 px-2 py-1 flex flex-col justify-center">
                  <div className="flex items-center gap-1">
                    <Icon
                      size={10}
                      style={{ color: stubColor }}
                      className="shrink-0"
                    />
                    <span className="text-xs font-semibold text-text truncate">
                      {type}
                    </span>
                  </div>
                  <span className="text-[9px] text-text-muted">
                    {formatLeaveBalance(used)}/{max} used
                  </span>
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* ACTIVE LEAVE TODAY BANNER */}
      {activeLeaveToday && (
        <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0 animate-pulse" />
            <span className="font-bold text-purple-900 truncate">
              On {activeLeaveToday.type} Leave Today
            </span>
          </div>
          <span className="text-[10px] text-purple-700 font-mono shrink-0">
            {formatLeaveDates(activeLeaveToday.start_date, activeLeaveToday.end_date)}
          </span>
        </div>
      )}

      {/* UPCOMING APPROVED LEAVE NOTE */}
      {!activeLeaveToday && upcomingLeave && (
        <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-surface-muted/60 border border-border-light flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <CalendarDays size={12} className="text-primary shrink-0" />
            <span className="font-semibold text-text truncate">
              Upcoming: {upcomingLeave.type} Leave ({upcomingLeave.days}d)
            </span>
          </div>
          <span className="text-[10px] text-text-muted font-mono shrink-0">
            {formatLeaveDates(upcomingLeave.start_date, upcomingLeave.end_date)}
          </span>
        </div>
      )}

      {/* PENDING REQUESTS ALERT */}
      {pendingLeave > 0 && (
        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-warning-light border border-warning/20 text-warning text-[11px] flex items-center gap-1.5">
          <Umbrella size={12} className="shrink-0" />
          <span>
            {pendingLeave} request{pendingLeave > 1 ? "s" : ""} waiting for approval.
          </span>
        </div>
      )}
    </Card>
  );
}

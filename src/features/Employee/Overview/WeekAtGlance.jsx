import { useMemo } from "react";
import { Card } from "../../../components/Card";
import { isoToBS, WEEKDAY_LABELS } from "../../../utils/nepaliCalendar";
import { Check, PartyPopper } from "lucide-react";
import { getWeekDates } from "../../../utils/workTime";

export function WeekAtGlance({
  records,
  leaveRequests,
  holidays,
  today,
  onLogAttendance,
}) {
  const weekDates = useMemo(() => {
    return getWeekDates(today);
  }, [today]);

  const loggedDates = useMemo(() => {
    return new Set(
      (records || [])
        .filter((record) => record.clock_in)
        .map((record) => record.date),
    );
  }, [records]);

  const holidayMap = useMemo(() => {
    const map = new Map();
    (holidays || []).forEach((h) => {
      map.set(h.date, h.name);
    });
    return map;
  }, [holidays]);

  const leaveDates = useMemo(() => {
    const dates = new Set();

    (leaveRequests || [])
      .filter((request) => request.status === "Approved")
      .forEach((request) => {
        const [sy, sm, sd] = request.start_date.split("-").map(Number);
        const [ey, em, ed] = request.end_date.split("-").map(Number);
        const start = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);

        const current = new Date(start);

        while (current <= end) {
          const y = current.getFullYear();
          const m = String(current.getMonth() + 1).padStart(2, "0");
          const d = String(current.getDate()).padStart(2, "0");
          dates.add(`${y}-${m}-${d}`);
          current.setDate(current.getDate() + 1);
        }
      });

    return dates;
  }, [leaveRequests]);

  // Expected working days up to today (excludes Saturdays and Holidays unless they were logged)
  const pastWorkingDates = useMemo(() => {
    return weekDates.filter((date) => {
      if (date > today) return false;
      const [y, m, dt] = date.split("-").map(Number);
      const isSat = new Date(y, m - 1, dt).getDay() === 6;
      const isHol = holidayMap.has(date);
      if (isSat || isHol) {
        // Only count if the employee worked on the holiday/Saturday
        return loggedDates.has(date);
      }
      return true;
    });
  }, [weekDates, today, holidayMap, loggedDates]);

  const loggedCount = pastWorkingDates.filter((date) => loggedDates.has(date)).length;

  return (
    <Card
      title="Your Attendance at a Glance"
      subtitle={`${loggedCount} of ${pastWorkingDates.length} working day${
        pastWorkingDates.length !== 1 ? "s" : ""
      } logged this week`}
      cardStyle={{ marginBottom: 0 }}
    >
      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((date, index) => {
          const isToday = date === today;
          const isFuture = date > today;
          const isLogged = loggedDates.has(date);
          const isLeave = leaveDates.has(date);
          const holidayName = holidayMap.get(date);
          const isHoliday = !!holidayName;
          const [y, m, dt] = date.split("-").map(Number);
          const isSaturday = new Date(y, m - 1, dt).getDay() === 6;

          const bs = isoToBS(date);

          let status = "future";

          if (isLeave) {
            status = "leave";
          } else if (isLogged) {
            status = "logged";
          } else if (isHoliday) {
            status = "holiday";
          } else if (isSaturday) {
            status = "weekend";
          } else if (isFuture) {
            status = "future";
          } else if (isToday) {
            status = "today";
          } else {
            status = "missing";
          }

          const isMissing = !isToday && status === "missing";

          return (
            <div
              key={date}
              onClick={isMissing && onLogAttendance ? () => onLogAttendance(date) : undefined}
              title={isMissing ? "Missing attendance — click to log" : undefined}
              className={`
                min-w-0 rounded-xl p-2 text-center border transition-all
                ${
                  isToday
                    ? "border-primary bg-primary-light/40 ring-1 ring-primary/20 shadow-xs"
                    : isSaturday || isHoliday
                      ? "border-border-light bg-surface-muted/40"
                      : isMissing
                        ? "border-alert/30 bg-alert-light/15 hover:bg-alert-light/35 hover:border-alert cursor-pointer shadow-2xs group"
                        : "border-border bg-white"
                }
              `}
            >
              {/* Gregorian weekday */}
              <div
                className={`text-[9px] uppercase tracking-wide font-semibold ${
                  isToday
                    ? "text-primary"
                    : isSaturday
                      ? "text-alert"
                      : "text-text-muted"
                }`}
              >
                {WEEKDAY_LABELS[index]}
              </div>

              {/* Nepali BS date day */}
              <div
                className={`mt-1 text-sm font-mono font-bold ${
                  isToday
                    ? "text-primary"
                    : isSaturday
                      ? "text-alert"
                      : "text-text"
                }`}
              >
                {bs?.day}
              </div>

              {/* Status indicator */}
              <div className="mt-1.5 min-h-[22px] flex items-center justify-center">
                {status === "logged" && (
                  <div
                    className="mx-auto w-5 h-5 rounded-full bg-success-light text-success flex items-center justify-center shadow-xs"
                    title="Attendance logged"
                  >
                    <Check size={11} strokeWidth={3} />
                  </div>
                )}

                {status === "leave" && (
                  <div
                    className="text-[9px] font-semibold text-primary px-1.5 py-0.5 rounded bg-primary-light border border-primary/20 truncate"
                    title="Approved leave"
                  >
                    Leave
                  </div>
                )}

                {status === "holiday" && (
                  <div
                    className="text-[9px] font-semibold text-warning px-1.5 py-0.5 rounded bg-warning-light border border-warning/20 truncate"
                    title={holidayName || "Public Holiday"}
                  >
                    Holiday
                  </div>
                )}

                {status === "weekend" && (
                  <div className="text-[9px] font-medium text-text-muted">
                    Off
                  </div>
                )}

                {status === "missing" && (
                  <div
                    className="mx-auto w-5 h-5 rounded-full bg-alert-light text-alert flex items-center justify-center text-[10px] font-bold shadow-xs"
                    title="Missing attendance"
                  >
                    !
                  </div>
                )}

                {status === "today" && (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}

                {status === "future" && (
                  <div className="text-text-faint text-xs font-mono">—</div>
                )}
              </div>

              {/* Bottom label */}
              {isToday && (
                <div className="mt-1 text-[8px] uppercase tracking-wider text-primary font-bold">
                  Today
                </div>
              )}

              {!isToday && status === "missing" && (
                <div className="mt-1 text-[8px] font-semibold text-alert">
                  Missing
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border-light text-[10px] text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span>Logged</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-alert" />
          <span>Missing</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>Leave</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-warning" />
          <span>Holiday / Off</span>
        </div>
      </div>
    </Card>
  );
}

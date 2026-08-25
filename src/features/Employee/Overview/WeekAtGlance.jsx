import { useMemo } from "react";
import { Card } from "../../../components/Card";
import { isoToBS, WEEKDAY_LABELS } from "../../../utils/nepaliCalendar";
import { Check } from "lucide-react";
import { getWeekDates } from "../../../utils/workTime";

export function WeekAtGlance({ records, leaveRequests, today }) {
  const weekDates = useMemo(() => {
    return getWeekDates(today);
  }, [today]);

  const loggedDates = useMemo(() => {
    return new Set(
      records.filter((record) => record.clock_in).map((record) => record.date),
    );
  }, [records]);

  const leaveDates = useMemo(() => {
    const dates = new Set();

    leaveRequests
      .filter((request) => request.status === "Approved")
      .forEach((request) => {
        const start = new Date(`${request.start_date}T00:00:00`);
        const end = new Date(`${request.end_date}T00:00:00`);

        const current = new Date(start);

        while (current <= end) {
          dates.add(current.toISOString().slice(0, 10));
          current.setDate(current.getDate() + 1);
        }
      });

    return dates;
  }, [leaveRequests]);

  const pastDates = weekDates.filter((date) => date <= today);

  const loggedCount = pastDates.filter((date) => loggedDates.has(date)).length;

  return (
    <Card
      title="Your attendance at a glance"
      subtitle={`${loggedCount} of ${pastDates.length} days logged`}
      cardStyle={{ marginBottom: 0 }}
    >
      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((date, index) => {
          const isToday = date === today;
          const isFuture = date > today;
          const isLogged = loggedDates.has(date);
          const isLeave = leaveDates.has(date);

          const bs = isoToBS(date);

          let status = "future";

          if (isLeave) {
            status = "leave";
          } else if (isLogged) {
            status = "logged";
          } else if (!isFuture) {
            status = "missing";
          }

          return (
            <div
              key={date}
              className={`
                  min-w-0 rounded-xl p-2 text-center border
                  ${
                    isToday
                      ? "border-primary bg-primary-light"
                      : "border-[#EEEAE0] bg-[#FAF9F6]"
                  }
                `}
            >
              {/* Gregorian weekday */}
              <div
                className={`text-[9px] uppercase tracking-wide font-medium ${
                  isToday ? "text-primary" : "text-text-subtle"
                }`}
              >
                {WEEKDAY_LABELS[index]}
              </div>

              {/* Nepali date */}
              <div
                className={`mt-1 text-sm font-mono font-semibold ${
                  isToday ? "text-primary" : "text-text"
                }`}
              >
                {bs?.day}
              </div>

              {/* Status */}
              <div className="mt-1.5">
                {status === "logged" && (
                  <div
                    className="mx-auto w-5 h-5 rounded-full bg-success-light text-[#5D8065]
                      flex items-center justify-center"
                  >
                    <Check size={11} strokeWidth={2.5} />
                  </div>
                )}

                {status === "leave" && (
                  <div
                    className="text-[8px] font-medium text-primary
                      truncate"
                  >
                    Leave
                  </div>
                )}

                {status === "missing" && (
                  <div
                    className="mx-auto w-5 h-5 rounded-full bg-alert-light text-alert
                      flex items-center justify-center text-[9px]"
                  >
                    !
                  </div>
                )}

                {status === "future" && (
                  <div className="text-text-faint text-xs">—</div>
                )}
              </div>

              {/* Today label */}
              {isToday && (
                <div className="mt-1 text-[7px] uppercase tracking-wide text-primary font-semibold">
                  Today
                </div>
              )}

              {!isToday && status === "missing" && (
                <div className="mt-1 text-[7px] text-alert">Missing</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-[#EEEAE0]">
        <div className="flex items-center gap-1.5 text-[9px] text-text-muted">
          <span className="w-2 h-2 rounded-full bg-success" />
          Logged
        </div>

        <div className="flex items-center gap-1.5 text-[9px] text-text-muted">
          <span className="w-2 h-2 rounded-full bg-alert" />
          Missing
        </div>

        <div className="flex items-center gap-1.5 text-[9px] text-text-muted">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Leave
        </div>
      </div>
    </Card>
  );
}

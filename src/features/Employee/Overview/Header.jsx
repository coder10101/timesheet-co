import { getDailyMessage } from "../../../utils/dailyMessage";
import { isoToBSLabel } from "../../../utils/nepaliCalendar";
import { fmtDate } from "../../../utils/workTime";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function Header({ holidays, records, me, today }) {
  const [year, month, day] = today.split("-").map(Number);
  const dayName = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  const presentDay = isoToBSLabel(today);
  const todayHoliday = (holidays || []).find((holiday) => holiday.date === today);
  const dailyMessage = getDailyMessage(today, todayHoliday?.name);

  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl">{dailyMessage.emoji}</span>

          <h1
            className="text-xl sm:text-2xl font-bold tracking-tight text-text"
            style={{
              fontWeight: 800,
              color: dailyMessage.color,
            }}
          >
            {dailyMessage.text} {me.name?.split(" ")[0]}.
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2 text-right">
        <div className="hidden sm:block">
          <p className="font-mono text-sm font-medium text-text">
            {new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <div className="flex items-center justify-end gap-1.5 text-xs text-text-muted">
            <span className="font-semibold text-text">{dayName}</span>
            <span>·</span>
            <span>{presentDay}</span>
          </div>
        </div>
      </div>
    </header>
  );
}


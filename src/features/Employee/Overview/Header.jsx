import { getDailyMessage } from "../../../utils/dailyMessage";
import { isoToBSLabel } from "../../../utils/nepaliCalendar";

export function Header({ holidays, records, me, today }) {
  const presentDay = isoToBSLabel(today);
  const todayHoliday = holidays.find((holiday) => holiday.date === today);
  const dailyMessage = getDailyMessage(today, todayHoliday?.name);

  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl">{dailyMessage.emoji}</span>

          <h1
            className="text-xl sm:text-2xl font-bold tracking-tight text-[#292722]"
            style={{
              fontWeight: 800,
            }}
          >
            {dailyMessage.text} {me.name.split(" ")[0]}.
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2 text-right">
        <div className="hidden sm:block">
          <p className="font-mono text-sm font-medium text-[#292722]">
            {new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          <div className="flex items-center gap-1.5 text-xs text-[#7A7362]">
            {presentDay}
          </div>
        </div>
      </div>
    </header>
  );
}

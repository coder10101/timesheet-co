import { CalendarDays } from "lucide-react";
import { todayISO } from "../../../utils/workTime";
import { getDailyMessage } from "../../../utils/dailyMessage";
import { getCurrentBSMonthInfo } from "../../../utils/nepaliCalendar";

const formatDateISO = (date) => {
  return date.toISOString().slice(0, 10);
};

export function Header({ holidays, records, me, today }) {
  const todayHoliday = holidays.find((holiday) => holiday.date === today);

  const dailyMessage = getDailyMessage(today, todayHoliday?.name);

  const monthInfo = getCurrentBSMonthInfo();

  const presentDaysThisMonth = records.filter(
    (record) =>
      record.clock_in &&
      record.date >= monthInfo.startISO &&
      record.date <= monthInfo.endISO,
  ).length;

  const monthStart = new Date(monthInfo.startISO);
  const monthEnd = new Date(monthInfo.endISO);

  const workingDaysThisMonth = [];

  const cursor = new Date(monthStart);

  while (cursor <= monthEnd) {
    const iso = formatDateISO(cursor);
    const day = cursor.getDay();

    const isWeekend = day === 0 || day === 6;

    const isHoliday = holidays.some((holiday) => holiday.date === iso);

    if (!isWeekend && !isHoliday) {
      workingDaysThisMonth.push(iso);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

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
            <CalendarDays size={12} />
            <span>
              {presentDaysThisMonth}/{workingDaysThisMonth.length} days this
              month
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

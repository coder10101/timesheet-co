import { CalendarDays, Clock, ArrowRight, PartyPopper } from "lucide-react";
import { NavLink } from "react-router-dom";
import { fmtTimeAmPm } from "../utils/nepaliCalendar";
import { Card } from "./Card";

export default function UpcomingEvents({ events = [], holidays = [] }) {
  const today = new Date().toISOString().slice(0, 10);

  const upcomingHolidays = holidays
    .filter((holiday) => holiday.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((holiday) => ({
      id: `holiday-${holiday.date}`,
      date: holiday.date,
      title: holiday.name,
      type: "holiday",
    }));

  const upcomingEvents = events
    .filter((event) => event.date >= today)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.time || "").localeCompare(b.time || ""),
    )
    .map((event) => ({
      ...event,
      type: "event",
    }));

  const upcoming = [...upcomingHolidays, ...upcomingEvents]
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.time || "").localeCompare(b.time || ""),
    )
    .slice(0, 3);

  const formatDate = (date) => {
    const eventDate = new Date(`${date}T00:00:00`);
    const todayDate = new Date(`${today}T00:00:00`);
    const diff = Math.round((eventDate - todayDate) / 86400000);

    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";

    return eventDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card>
      {/* HEADER — title left, calendar link right */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-[#292722]">
          Upcoming events
        </h3>
        <NavLink
          to="/calendar"
          className="flex items-center gap-1 text-xs font-medium text-[#3D6B7D] hover:text-[#294D5B] transition shrink-0"
        >
          <span>View full calendar</span>
          <ArrowRight size={12} />
        </NavLink>
      </div>

      {upcoming.length === 0 ? (
        <div className="py-4 text-center text-xs text-[#9A9383]">
          Nothing coming up
        </div>
      ) : (
        <div className="space-y-1">
          {upcoming.map((item) => {
            const isHoliday = item.type === "holiday";

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[#F7F5F0] transition"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isHoliday
                      ? "bg-[#FBEEEA] text-[#B5563A]"
                      : "bg-[#EEF3F4] text-[#3D6B7D]"
                  }`}
                >
                  {isHoliday ? (
                    <PartyPopper size={14} />
                  ) : (
                    <CalendarDays size={14} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#4A4738] truncate">
                    {item.title}
                  </p>

                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] ${
                        isHoliday ? "text-[#B5563A]" : "text-[#3D6B7D]"
                      }`}
                    >
                      {formatDate(item.date)}
                    </span>

                    {!isHoliday && item.time && (
                      <>
                        <span className="text-[#DDD8CB]">·</span>
                        <span className="flex items-center gap-1 text-[10px] font-mono text-[#7A7362]">
                          <Clock size={9} />
                          {fmtTimeAmPm(item.time)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <span
                  className={`hidden sm:block text-[9px] px-1.5 py-0.5 rounded-full ${
                    isHoliday
                      ? "bg-[#FBEEEA] text-[#B5563A]"
                      : "bg-[#EEF3F4] text-[#3D6B7D]"
                  }`}
                >
                  {isHoliday ? "Holiday" : "Event"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

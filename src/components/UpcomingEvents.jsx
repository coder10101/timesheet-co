import {
  CalendarDays,
  Clock,
  ArrowRight,
  PartyPopper,
  Users,
  Flag,
  CalendarClock,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { isoToBSLabel } from "../utils/nepaliCalendar";
import { Card } from "./Card";
import { fmtTimeAmPm } from "../utils/workTime";

export default function UpcomingEvents({ events = [], holidays = [], today }) {
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
    .slice(0, 4);

  const formatDate = (date) => {
    const [ey, em, ed] = date.split("-").map(Number);
    const [ty, tm, td] = today.split("-").map(Number);
    const eventDate = new Date(ey, em - 1, ed);
    const todayDate = new Date(ty, tm - 1, td);
    const diff = Math.round(
      (eventDate.getTime() - todayDate.getTime()) / 86400000,
    );

    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";

    return isoToBSLabel(date);
  };

  const getDiffDays = (date) => {
    const [ey, em, ed] = date.split("-").map(Number);
    const [ty, tm, td] = today.split("-").map(Number);
    const eventDate = new Date(ey, em - 1, ed);
    const todayDate = new Date(ty, tm - 1, td);
    return Math.round((eventDate.getTime() - todayDate.getTime()) / 86400000);
  };

  return (
    <Card>
      {/* HEADER — title left, calendar link right */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-text">Upcoming Schedule</h3>
        <NavLink
          to="/calendar"
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition shrink-0"
        >
          <span>View calendar</span>
          <ArrowRight size={12} />
        </NavLink>
      </div>

      {upcoming.length === 0 ? (
        <div className="py-4 text-center text-xs text-text-subtle">
          No upcoming events or holidays
        </div>
      ) : (
        <div className="space-y-1">
          {upcoming.map((item) => {
            const isHoliday = item.type === "holiday";
            const isDeadline = item.event_type === "deadline";
            const isMeeting = item.event_type === "meeting";
            const diffDays = getDiffDays(item.date);

            const badgeColor = isHoliday
              ? "bg-alert-light text-alert"
              : isDeadline
                ? "bg-[#FDEDEA] text-[#B5563A] border border-[#FAD8CF]"
                : isMeeting
                  ? "bg-[#EEF6F8] text-[#1E4E5F] border border-[#C5DCE4]"
                  : "bg-warning-light text-warning";

            const badgeLabel = isHoliday
              ? "Holiday"
              : isDeadline
                ? "Deadline"
                : isMeeting
                  ? "Meeting"
                  : "Event";

            const Icon = isHoliday
              ? PartyPopper
              : isDeadline
                ? Flag
                : isMeeting
                  ? Users
                  : CalendarClock;

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-surface-muted/60 transition"
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${badgeColor}`}
                >
                  <Icon size={14} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text truncate">
                    {item.title}
                  </p>

                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-medium text-text-muted">
                      {formatDate(item.date)}
                    </span>

                    <span className="text-text-faint">·</span>

                    <span className="text-[10px] font-semibold text-primary bg-primary-light/70 px-1.5 py-0.5 rounded leading-none">
                      {diffDays === 0
                        ? "coming today"
                        : diffDays === 1
                          ? "coming in 1 day"
                          : `coming in ${diffDays} days`}
                    </span>

                    {!isHoliday && item.time && (
                      <>
                        <span className="text-text-faint">·</span>
                        <span className="flex items-center gap-1 text-[10px] font-mono text-text-muted">
                          <Clock size={9} />
                          {fmtTimeAmPm(item.time)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <span
                  className={`hidden sm:block text-[9px] font-semibold px-2 py-0.5 rounded-md ${badgeColor}`}
                >
                  {badgeLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

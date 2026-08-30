import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  ArrowRight,
  Clock,
  Users,
  Flag,
  PartyPopper,
} from "lucide-react";
import {
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
  getTodayBS,
  buildMonthGrid,
  addMonths,
  isoToBS,
} from "../utils/nepaliCalendar";
import { useHolidays, useEvents } from "../hooks/useOrgData";
import { Card } from "./Card";
import { fmtTimeAmPm, todayISO } from "../utils/workTime";

export function NepaliCalendar() {
  const todayBS = useMemo(() => getTodayBS(), []);
  const today = todayISO();

  const [view, setView] = useState({
    year: todayBS.year,
    month: todayBS.month,
  });

  const [selectedDate, setSelectedDate] = useState(null);

  const { holidays } = useHolidays();
  const { events } = useEvents();

  const holidaysByIso = useMemo(() => {
    const map = {};
    (holidays || []).forEach((h) => {
      map[h.date] = h.name;
    });
    return map;
  }, [holidays]);

  const eventsByIso = useMemo(() => {
    const map = {};
    (events || []).forEach((e) => {
      (map[e.date] ||= []).push({
        title: e.title,
        event_type: e.event_type,
        time: e.time,
        description: e.description,
      });
    });
    return map;
  }, [events]);

  const weeks = useMemo(
    () => buildMonthGrid(view.year, view.month, holidaysByIso, eventsByIso),
    [view, holidaysByIso, eventsByIso],
  );

  const selectedCell = selectedDate
    ? weeks.flat().find((cell) => cell?.isoDate === selectedDate)
    : null;

  const upcoming = useMemo(() => {
    return (events || [])
      .filter((e) => e.date >= today)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.time || "").localeCompare(b.time || ""),
      )
      .slice(0, 2);
  }, [events, today]);

  const jumpToEvent = (isoDate) => {
    const bsDate = isoToBS(isoDate);
    setView({ year: bsDate.year, month: bsDate.month });
    setSelectedDate(isoDate);
  };

  const relativeDayLabel = (isoDate) => {
    const [ey, em, ed] = isoDate.split("-").map(Number);
    const [ty, tm, td] = today.split("-").map(Number);
    const eventDate = new Date(ey, em - 1, ed);
    const todayDate = new Date(ty, tm - 1, td);
    const diffDays = Math.round(
      (eventDate.getTime() - todayDate.getTime()) / 86400000,
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 6) return `In ${diffDays} days`;
    return eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Card>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => {
            setSelectedDate(null);
            setView(addMonths(view.year, view.month, -1));
          }}
          className="p-1.5 rounded-lg hover:bg-[#F5F3EE]"
        >
          <ChevronLeft size={15} />
        </button>

        <span className="text-xs font-semibold">
          {NEPALI_MONTHS[view.month - 1]} {view.year}
        </span>

        <button
          onClick={() => {
            setSelectedDate(null);
            setView(addMonths(view.year, view.month, 1));
          }}
          className="p-1.5 rounded-lg hover:bg-[#F5F3EE]"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* WEEKDAYS */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-[9px] uppercase text-text-subtle font-medium"
          >
            {d}
          </div>
        ))}
      </div>

      {/* CALENDAR */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((cell, i) => {
          if (!cell) return <div key={i} />;

          const isToday = cell.isoDate === today;
          const isHoliday = !!cell.holidayName;
          const cellEvents = cell.events || [];
          const hasDeadline = cellEvents.some((e) => e.event_type === "deadline");
          const hasMeeting = cellEvents.some((e) => e.event_type === "meeting");
          const hasEvents = cellEvents.length > 0;
          const isSelectable = isHoliday || hasEvents;
          const isSelected = cell.isoDate === selectedDate;

          const label = isHoliday
            ? cell.holidayName
            : hasDeadline
              ? "Deadline"
              : hasMeeting
                ? "Meeting"
                : hasEvents
                  ? cellEvents[0].title
                  : null;

          return (
            <button
              key={i}
              onClick={() => {
                if (isSelectable) {
                  setSelectedDate(
                    selectedDate === cell.isoDate ? null : cell.isoDate,
                  );
                }
              }}
              className={`
                relative aspect-square rounded-lg
                flex items-center justify-center
                text-[11px] font-mono
                transition
                ${
                  isToday
                    ? "bg-primary text-white font-semibold shadow-xs"
                    : isSelected
                      ? "bg-border text-text font-semibold ring-1 ring-primary"
                      : hasDeadline
                        ? "bg-[#FFF6F4] text-alert border border-alert/30 font-semibold"
                        : hasMeeting
                          ? "bg-[#EEF6F8] text-[#1E4E5F] border border-[#C5DCE4] font-semibold"
                          : isHoliday
                            ? "bg-alert-light text-alert font-semibold"
                            : hasEvents
                              ? "bg-[#FBF3E3] text-text"
                              : cell.isWeekend
                                ? "text-alert"
                                : "text-text"
                }
              `}
            >
              {cell.bsDay}

              {/* Indicator Dot */}
              {!isToday && (
                <div className="absolute top-1 right-1 flex items-center gap-0.5">
                  {hasDeadline && (
                    <span className="w-1.5 h-1.5 rounded-full bg-alert" />
                  )}
                  {hasMeeting && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1E4E5F]" />
                  )}
                  {isHoliday && !hasDeadline && (
                    <span className="w-1.5 h-1.5 rounded-full bg-alert" />
                  )}
                </div>
              )}

              {label && !isToday && (
                <span
                  className={`absolute bottom-0.5 left-1 right-1 font-mono text-[6px] font-bold truncate ${
                    hasDeadline
                      ? "text-alert"
                      : hasMeeting
                        ? "text-[#1E4E5F]"
                        : isHoliday
                          ? "text-alert"
                          : "text-warning"
                  }`}
                >
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SELECTED DATE DETAIL */}
      {selectedCell &&
        (selectedCell.holidayName || selectedCell.events.length > 0) && (
          <div className="mt-3 space-y-2">
            {selectedCell.holidayName && (
              <div className="px-3 py-2.5 rounded-lg bg-alert-light border border-[#F0D8D0]">
                <div className="text-[10px] uppercase tracking-wide text-text-subtle">
                  {selectedCell.bsDay} {NEPALI_MONTHS[view.month - 1]}
                </div>
                <div className="text-xs font-medium text-alert mt-0.5 flex items-center gap-1.5">
                  <PartyPopper size={12} />
                  <span>{selectedCell.holidayName}</span>
                </div>
              </div>
            )}

            {selectedCell.events.map((ev, idx) => {
              const isDeadline = ev.event_type === "deadline";
              const isMeeting = ev.event_type === "meeting";

              const cardStyle = isDeadline
                ? "bg-[#FFF6F4] border-[#FCD9D1] text-text"
                : isMeeting
                  ? "bg-[#EEF6F8] border-[#C5DCE4] text-text"
                  : "bg-warning-light border-[#EEDFC0] text-text";

              const badgeStyle = isDeadline
                ? "bg-alert text-white"
                : isMeeting
                  ? "bg-[#1E4E5F] text-white"
                  : "bg-warning text-white";

              const Icon = isDeadline ? Flag : isMeeting ? Users : CalendarClock;

              return (
                <div
                  key={idx}
                  className={`px-3 py-2.5 rounded-lg border ${cardStyle}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                      <span className={`${badgeStyle} px-1.5 py-0.2 rounded`}>
                        {ev.event_type}
                      </span>
                    </div>
                    {ev.time && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-white border border-border-light">
                        <Clock size={9} />
                        {fmtTimeAmPm(ev.time)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-text mt-1.5">
                    {ev.title}
                  </div>
                  {ev.description && (
                    <div className="text-[11px] text-text-muted mt-1 leading-relaxed max-h-8 overflow-hidden relative">
                      {ev.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      {/* LEGEND */}
      <div className="flex items-center gap-3 mt-3 text-[9px] text-text-subtle flex-wrap">
        <span className="flex items-center gap-1 font-medium">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Today
        </span>
        <span className="flex items-center gap-1 font-medium">
          <span className="w-2 h-2 rounded-full bg-alert" />
          Holiday
        </span>
        <span className="flex items-center gap-1 font-medium">
          <span className="w-2 h-2 rounded-full bg-alert" />
          Deadline
        </span>
        <span className="flex items-center gap-1 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#1E4E5F]" />
          Meeting
        </span>
      </div>

      {/* UPCOMING */}
      {upcoming.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {upcoming.map((ev) => {
            const isDeadline = ev.event_type === "deadline";
            const isMeeting = ev.event_type === "meeting";

            const dotColor = isDeadline
              ? "bg-alert"
              : isMeeting
                ? "bg-[#1E4E5F]"
                : "bg-warning";

            return (
              <button
                key={ev.id}
                onClick={() => jumpToEvent(ev.date)}
                className="w-full flex items-start justify-between gap-2 text-left group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`}
                    />
                    <span className="text-[11px] font-semibold truncate group-hover:text-primary transition-colors">
                      {ev.title}
                    </span>
                    <span
                      className={`text-[8px] uppercase font-bold px-1 rounded ${
                        isDeadline
                          ? "bg-alert-light text-alert"
                          : isMeeting
                            ? "bg-[#EEF6F8] text-[#1E4E5F]"
                            : "bg-warning-light text-warning"
                      }`}
                    >
                      {ev.event_type}
                    </span>
                  </div>
                  {ev.time && (
                    <div className="flex items-center gap-1 mt-1 ml-3">
                      <span className="flex items-center gap-1 text-[9px] font-mono font-medium text-text-muted bg-surface px-1.5 py-0.5 rounded-full border border-border-light">
                        <Clock size={8} />
                        {fmtTimeAmPm(ev.time)}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-text-subtle font-mono shrink-0 flex items-center gap-0.5 pt-0.5">
                  {relativeDayLabel(ev.date)}
                  <ArrowRight
                    size={9}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

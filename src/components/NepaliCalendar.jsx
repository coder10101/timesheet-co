import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  ArrowRight,
  Clock,
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
import { fmtTimeAmPm } from "../utils/workTime";

export function NepaliCalendar() {
  const todayBS = useMemo(() => getTodayBS(), []);

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

  const todayISO = new Date().toISOString().slice(0, 10);

  const selectedCell = selectedDate
    ? weeks.flat().find((cell) => cell?.isoDate === selectedDate)
    : null;

  const upcoming = useMemo(() => {
    return (events || [])
      .filter((e) => e.date >= todayISO)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.time || "").localeCompare(b.time || ""),
      )
      .slice(0, 2);
  }, [events, todayISO]);

  const jumpToEvent = (isoDate) => {
    const bsDate = isoToBS(isoDate);
    setView({ year: bsDate.year, month: bsDate.month });
    setSelectedDate(isoDate);
  };

  const relativeDayLabel = (isoDate) => {
    const diffDays = Math.round(
      (new Date(isoDate) - new Date(todayISO)) / 86400000,
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 6) return `In ${diffDays} days`;
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
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

          const isToday = cell.isoDate === todayISO;
          const isHoliday = !!cell.holidayName;
          const hasEvents = cell.events.length > 0;
          const isSelectable = isHoliday || hasEvents;
          const isSelected = cell.isoDate === selectedDate;

          const label = isHoliday
            ? cell.holidayName
            : hasEvents
              ? cell.events[0].title +
                (cell.events.length > 1 ? ` +${cell.events.length - 1}` : "")
              : null;

          const showDot = hasEvents && isHoliday;

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
                    ? "bg-primary text-white font-semibold"
                    : isSelected
                      ? "bg-border text-text font-semibold"
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

              {showDot && (
                <span
                  className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                    isToday ? "bg-white" : "bg-[#E0A458]"
                  }`}
                />
              )}

              {label && !isToday && (
                <span
                  className={`absolute bottom-1 left-1 right-1 font-mono text-[6px] truncate ${
                    isHoliday ? "text-alert" : "text-[#9A6B1F]"
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
                <div className="text-xs font-medium text-[#5E594E] mt-0.5">
                  🎉 {selectedCell.holidayName}
                </div>
              </div>
            )}

            {selectedCell.events.map((ev, idx) => (
              <div
                key={idx}
                className="px-3 py-2.5 rounded-lg bg-warning-light border border-[#EEDFC0]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-wide text-text-subtle flex items-center gap-1">
                    <CalendarClock size={10} /> {ev.event_type}
                  </div>
                  {ev.time && (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-warning bg-[#F0DFA8] px-1.5 py-0.5 rounded-full">
                      <Clock size={9} />
                      {fmtTimeAmPm(ev.time)}
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium text-[#5E594E] mt-1">
                  {ev.title}
                </div>
                {ev.description && (
                  <div className="text-[11px] text-[#8A8374] mt-1 leading-relaxed max-h-8 overflow-hidden relative">
                    {ev.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      {/* LEGEND */}
      <div className="flex items-center gap-3 mt-3 text-[9px] text-text-subtle flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Today
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-alert" />
          Holiday
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E0A458]" />
          Event
        </span>
      </div>

      {/* UPCOMING */}
      {upcoming.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {upcoming.map((ev) => (
            <button
              key={ev.id}
              onClick={() => jumpToEvent(ev.date)}
              className="w-full flex items-start justify-between gap-2 text-left group"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.event_type === "deadline" ? "bg-alert" : "bg-primary"}`}
                  />
                  <span className="text-[11px] truncate group-hover:underline">
                    {ev.title}
                  </span>
                </div>
                {ev.time && (
                  <div className="flex items-center gap-1 mt-1 ml-3">
                    <span className="flex items-center gap-1 text-[9px] font-mono font-medium text-warning bg-[#F0DFA8] px-1.5 py-0.5 rounded-full">
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
          ))}
        </div>
      )}
    </Card>
  );
}

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import {
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
  getTodayBS,
  buildMonthGrid,
  addMonths,
} from "../utils/nepaliCalendar";
import { useHolidays, useEvents } from "../hooks/useOrgData";
import { Card } from "./Card";

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
            className="text-[9px] uppercase text-[#9A9383] font-medium"
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
                    ? "bg-[#3D6B7D] text-white font-semibold"
                    : isSelected
                      ? "bg-[#EEEAE0] text-[#292722] font-semibold"
                      : isHoliday
                        ? "bg-[#FBEEEA] text-[#B5563A] font-semibold"
                        : cell.isWeekend
                          ? "text-[#B5563A]"
                          : "text-[#292722]"
                }
              `}
            >
              {cell.bsDay}

              {/* Event dot — top-right, so it doesn't collide with the holiday label below */}
              {hasEvents && (
                <span
                  className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                    isToday ? "bg-white" : "bg-[#E0A458]"
                  }`}
                />
              )}

              {/* Holiday label — unchanged from before */}
              {isHoliday && !isToday && (
                <span className="absolute bottom-1 left-1 right-1 font-mono text-[6px] text-[#B5563A] truncate">
                  {cell.holidayName}
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
              <div className="px-3 py-2.5 rounded-lg bg-[#FBEEEA] border border-[#F0D8D0]">
                <div className="text-[10px] uppercase tracking-wide text-[#9A9383]">
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
                className="px-3 py-2.5 rounded-lg bg-[#F8F2E3] border border-[#EEDFC0]"
              >
                <div className="text-[10px] uppercase tracking-wide text-[#9A9383] flex items-center gap-1">
                  <CalendarClock size={10} /> {ev.event_type}
                </div>
                <div className="text-xs font-medium text-[#5E594E] mt-0.5">
                  {ev.title}
                  {ev.time ? ` · ${ev.time}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* LEGEND */}
      <div className="flex items-center gap-3 mt-3 text-[9px] text-[#9A9383] flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#3D6B7D]" />
          Today
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#B5563A]" />
          Holiday
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E0A458]" />
          Event
        </span>
      </div>
    </Card>
  );
}

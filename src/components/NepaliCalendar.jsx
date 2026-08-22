import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Dot } from "lucide-react";
import {
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
  getTodayBS,
  buildMonthGrid,
  addMonths,
} from "../utils/nepaliCalendar";
import { useHolidays } from "../hooks/useOrgData";
import { Card } from "./Card";

export function NepaliCalendar() {
  const todayBS = useMemo(() => getTodayBS(), []);

  const [view, setView] = useState({
    year: todayBS.year,
    month: todayBS.month,
  });

  const [selectedDate, setSelectedDate] = useState(null);

  const { holidays } = useHolidays();

  const holidaysByIso = useMemo(() => {
    const map = {};

    (holidays || []).forEach((h) => {
      map[h.date] = h.name;
    });

    return map;
  }, [holidays]);

  const weeks = useMemo(
    () => buildMonthGrid(view.year, view.month, holidaysByIso),
    [view, holidaysByIso],
  );

  console.log("weeks", weeks);

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
          if (!cell) {
            return <div key={i} />;
          }

          const isToday = cell.isoDate === todayISO;
          const isHoliday = !!cell.holidayName;
          const isSelected = cell.isoDate === selectedDate;

          return (
            <button
              key={i}
              onClick={() => {
                if (isHoliday) {
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
              {/* Event indicator */}
              {isHoliday && !isToday && (
                <span
                  className="
                    absolute bottom-1 left-1 right-1
                   font-mono text-[6px] text-[#B5563A] truncate
                  "
                >
                  {cell.holidayName}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SELECTED DATE */}
      {selectedCell?.holidayName && (
        <div className="mt-3 px-3 py-2.5 rounded-lg bg-[#FBEEEA] border border-[#F0D8D0]">
          <div className="text-[10px] uppercase tracking-wide text-[#9A9383]">
            {selectedCell.bsDay} {NEPALI_MONTHS[view.month - 1]}
          </div>

          <div className="text-xs font-medium text-[#5E594E] mt-0.5">
            🎉 {selectedCell.holidayName}
          </div>
        </div>
      )}

      {/* LEGEND */}
      <div className="flex items-center gap-3 mt-3 text-[9px] text-[#9A9383]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#3D6B7D]" />
          Today
        </span>

        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#B5563A]" />
          Holiday
        </span>
      </div>
    </Card>
  );
}

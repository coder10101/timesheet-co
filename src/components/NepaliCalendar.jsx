import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <Card
      title="Nepali calendar"
      subtitle={`${NEPALI_MONTHS[view.month - 1]} ${view.year}`}
    >
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setView(addMonths(view.year, view.month, -1))}
          className="p-1 rounded hover:bg-[#F5F3EE]"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-medium">
          {NEPALI_MONTHS[view.month - 1]} {view.year}
        </span>
        <button
          onClick={() => setView(addMonths(view.year, view.month, 1))}
          className="p-1 rounded hover:bg-[#F5F3EE]"
        >
          <ChevronRight size={14} />
        </button>
      </div>

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

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((cell, i) => {
          if (!cell) return <div key={i} />;
          const isToday = cell.isoDate === todayISO;
          const isOff = cell.isWeekend || cell.holidayName;
          return (
            <div
              key={i}
              title={cell.holidayName || undefined}
              className={`aspect-square flex items-center justify-center rounded text-[11px] font-mono
                ${isToday ? "bg-[#3D6B7D] text-white font-semibold" : isOff ? "text-[#B5563A] bg-[#FBEEEA]" : "text-[#292722]"}
              `}
            >
              {cell.bsDay}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-2 text-[9px] text-[#9A9383]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#FBEEEA] border border-[#B5563A]" />{" "}
          Weekend / Holiday
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#3D6B7D]" /> Today
        </span>
      </div>
    </Card>
  );
}

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
  getTodayBS,
  buildMonthGrid,
  addMonths,
  isoToBS,
  isoToBSLabel,
} from "../utils/nepaliCalendar";

export function NepaliDatePicker({
  value,
  onChange,
  placeholder = "Select date",
}) {
  const todayBS = useMemo(() => getTodayBS(), []);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() =>
    value ? isoToBS(value) : { year: todayBS.year, month: todayBS.month },
  );

  const weeks = useMemo(() => buildMonthGrid(view.year, view.month), [view]);
  const todayISO = new Date().toISOString().slice(0, 10);

  const selectDay = (isoDate) => {
    onChange(isoDate);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm bg-white text-left"
      >
        <span className={value ? "text-[#292722]" : "text-[#9A9383]"}>
          {value ? isoToBSLabel(value) : placeholder}
        </span>
        <Calendar size={14} className="text-[#7A7362] shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 bg-white border border-[#E4DFD3] rounded-xl shadow-lg p-3 w-64">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setView(addMonths(view.year, view.month, -1))}
              className="p-1 rounded hover:bg-[#F5F3EE]"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold">
              {NEPALI_MONTHS[view.month - 1]} {view.year}
            </span>
            <button
              type="button"
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
              const isSelected = cell.isoDate === value;
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => selectDay(cell.isoDate)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-mono transition
                    ${isSelected ? "bg-[#3D6B7D] text-white font-semibold" : isToday ? "bg-[#EEEAE0] font-semibold" : "text-[#292722] hover:bg-[#F5F3EE]"}
                  `}
                >
                  {cell.bsDay}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

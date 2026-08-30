import { useMemo, useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Sparkles } from "lucide-react";
import {
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
  getTodayBS,
  buildMonthGrid,
  addMonths,
  isoToBS,
  isoToBSLabel,
} from "../utils/nepaliCalendar";
import { fmtDate, todayISO as getTodayISO } from "../utils/workTime";

export function NepaliDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  min,
  max,
  className = "",
  align = "left",
}) {
  const todayBS = useMemo(() => getTodayBS(), []);
  const todayISO = getTodayISO();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const [view, setView] = useState(() =>
    value ? isoToBS(value) : { year: todayBS.year, month: todayBS.month },
  );

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const bs = isoToBS(value);
      if (bs) {
        setView({ year: bs.year, month: bs.month });
      }
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const weeks = useMemo(() => buildMonthGrid(view.year, view.month), [view]);

  const selectDay = (isoDate) => {
    if (min && isoDate < min) return;
    if (max && isoDate > max) return;
    onChange(isoDate);
    setOpen(false);
  };

  const jumpToToday = () => {
    setView({ year: todayBS.year, month: todayBS.month });
    onChange(todayISO);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full h-10 flex items-center justify-between gap-2 border rounded-xl px-3.5 text-xs text-text transition-all text-left outline-none cursor-pointer ${
          open
            ? "bg-white border-primary ring-4 ring-primary/10 shadow-xs"
            : "bg-surface-muted border-border hover:bg-white hover:border-border-light shadow-2xs"
        }`}
      >
        <span className={value ? "text-text font-semibold truncate" : "text-text-muted"}>
          {value ? isoToBSLabel(value) : placeholder}
        </span>
        <Calendar size={14} className="text-text-muted shrink-0" />
      </button>

      {open && (
        <div
          className={`absolute z-30 mt-1.5 bg-white border border-border rounded-2xl shadow-lg p-3.5 w-[calc(100vw-2.5rem)] sm:w-72 max-w-xs fade-in ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* HEADER: MONTH & YEAR NAV */}
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-border-light">
            <button
              type="button"
              onClick={() => setView(addMonths(view.year, view.month, -1))}
              className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              title="Previous month"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="text-center">
              <span className="text-xs font-bold text-text">
                {NEPALI_MONTHS[view.month - 1]} {view.year}
              </span>
              <span className="block text-[9px] text-text-muted">Bikram Sambat</span>
            </div>

            <button
              type="button"
              onClick={() => setView(addMonths(view.year, view.month, 1))}
              className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              title="Next month"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* WEEKDAYS */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAY_LABELS.map((d, idx) => (
              <div
                key={d}
                className={`text-[9px] uppercase font-bold tracking-wider ${
                  idx === 6 ? "text-alert" : idx === 0 ? "text-primary" : "text-text-muted"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* DAYS GRID */}
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((cell, i) => {
              if (!cell) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }

              const isToday = cell.isoDate === todayISO;
              const isSelected = cell.isoDate === value;
              const isDisabled =
                (min && cell.isoDate < min) || (max && cell.isoDate > max);
              const isSaturday = cell.isWeekend;

              return (
                <button
                  type="button"
                  key={cell.isoDate}
                  disabled={isDisabled}
                  onClick={() => selectDay(cell.isoDate)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-mono font-semibold transition-all relative
                    ${
                      isSelected
                        ? "bg-primary text-white font-bold shadow-xs scale-105 z-10"
                        : isToday
                          ? "border border-primary text-primary bg-primary-light/30 font-bold"
                          : isSaturday
                            ? "text-alert hover:bg-alert-light/40"
                            : "text-text hover:bg-surface-muted"
                    }
                    ${isDisabled ? "opacity-25 cursor-not-allowed hover:bg-transparent" : "cursor-pointer"}
                  `}
                >
                  <span>{cell.bsDay}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-primary absolute bottom-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="mt-2.5 pt-2 border-t border-border-light flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={jumpToToday}
              className="text-primary hover:text-primary-dark font-semibold transition-colors flex items-center gap-1"
            >
              <Sparkles size={11} />
              <span>Today ({isoToBSLabel(todayISO)})</span>
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


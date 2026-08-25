import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AttendanceMonthSelector({
  monthLabel,
  isCurrentMonth,
  onPrevious,
  onNext,
}) {
  return (
    <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1">
      <button
        onClick={onPrevious}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-muted transition-colors"
        title="Previous month"
      >
        <ChevronLeft size={15} />
      </button>

      <div className="px-3 text-center min-w-[130px]">
        <div className="text-sm font-semibold text-text">{monthLabel}</div>

        <div className="text-[9px] text-text-muted">Nepali calendar</div>
      </div>

      <button
        onClick={onNext}
        disabled={isCurrentMonth}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-muted transition-colors disabled:opacity-30"
        title="Next month"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

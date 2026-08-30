import { useEffect, useState } from "react";
import { isoToBSLabel } from "../utils/nepaliCalendar";
import { todayISO } from "../utils/timezone";

export default function Header({ title, subtitle, action, titleStyle }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const weekdayStr = now.toLocaleDateString("en-US", {
    weekday: "long",
  });
  const nepaliDateStr = isoToBSLabel(todayISO());

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1
          className="text-xl sm:text-2xl font-bold tracking-tight text-dark"
          style={titleStyle}
        >
          {title}
        </h1>

        {subtitle && (
          <p className="text-xs sm:text-sm text-text-muted mt-1">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {action}

        <div className="hidden sm:block text-right">
          <p className="font-mono text-sm font-semibold text-text">{timeStr}</p>
          <p className="text-[11px] text-text-muted">{weekdayStr} · {nepaliDateStr}</p>
        </div>
      </div>
    </div>
  );
}

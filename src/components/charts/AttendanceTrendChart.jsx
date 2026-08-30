import { useState, useMemo } from "react";
import { getWeekday } from "../../utils/attendance";
import { isoToBS, NEPALI_MONTHS, WEEKDAY_LABELS } from "../../utils/nepaliCalendar";
import { TrendingUp, Users } from "lucide-react";
import { COLORS } from "../../constants/colors";

export function AttendanceTrendChart({ weekDates, attendanceRecords, employees, leaveRequests, holidays }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const dailyData = useMemo(() => {
    const totalStaff = employees?.length || 1;
    const leaveMap = new Map();
    (leaveRequests || [])
      .filter((r) => r.status === "Approved")
      .forEach((r) => {
        const [sy, sm, sd] = r.start_date.split("-").map(Number);
        const [ey, em, ed] = r.end_date.split("-").map(Number);
        const cur = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);
        while (cur <= end) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, "0");
          const d = String(cur.getDate()).padStart(2, "0");
          const dateStr = `${y}-${m}-${d}`;
          if (!leaveMap.has(dateStr)) leaveMap.set(dateStr, []);
          leaveMap.get(dateStr).push(r);
          cur.setDate(cur.getDate() + 1);
        }
      });

    const holidaySet = new Set((holidays || []).map((h) => h.date));

    return (weekDates || []).map((date, index) => {
      const weekday = getWeekday(date);
      const isSat = weekday === 6;
      const isHol = holidaySet.has(date);
      const bs = isoToBS(date);

      const dayRecords = (attendanceRecords || []).filter((r) => r.date === date);
      const checkedInTotal = dayRecords.filter((r) => r.clock_in).length;
      const onTimeCount = dayRecords.filter((r) => r.clock_in && !r.is_late).length;
      const lateCount = dayRecords.filter((r) => r.clock_in && r.is_late).length;
      const onLeaveCount = leaveMap.get(date)?.length || 0;

      const rate = isSat || isHol ? 100 : Math.round((checkedInTotal / totalStaff) * 100);

      return {
        date,
        index,
        weekday,
        isSat,
        isHol,
        bs,
        rate,
        checkedInTotal,
        onTimeCount,
        lateCount,
        onLeaveCount,
        totalStaff,
      };
    });
  }, [weekDates, attendanceRecords, employees, leaveRequests, holidays]);

  const activeDays = dailyData.filter((d) => !d.isSat && !d.isHol);
  const avgRate = activeDays.length > 0
    ? Math.round(activeDays.reduce((acc, d) => acc + d.rate, 0) / activeDays.length)
    : 100;

  // Build SVG path coordinates for width=400, height=70
  const width = 460;
  const height = 65;
  const paddingX = 25;
  const paddingY = 12;

  const points = dailyData.map((d, i) => {
    const x = paddingX + (i * (width - 2 * paddingX)) / Math.max(1, dailyData.length - 1);
    const y = height - paddingY - (d.rate / 100) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  // Generate smooth cubic bezier SVG path
  const linePath = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
  }, "");

  const areaPath = `${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  return (
    <div className="bg-white border border-border rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-2">
      {/* COMPACT HEADER */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-primary" />
          <h3 className="text-xs font-bold text-text">Weekly Attendance Pulse</h3>
          <span className="px-2 py-0.2 rounded-md bg-success-light text-success border border-success/30 text-[10px] font-bold font-mono">
            {avgRate}% Avg
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Attendance %</span>
          </span>
        </div>
      </div>

      {/* COMPACT AREA SPARKLINE CANVAS */}
      <div className="relative pt-1 pb-1">
        <svg
          viewBox={`0 0 ${width} ${height + 15}`}
          className="w-full h-20 overflow-visible select-none"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.22" />
              <stop offset="100%" stopColor={COLORS.primary} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* BACKGROUND GRID LINES */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#EEEAE0"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#EEEAE0"
          />

          {/* AREA FILL */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* SMOOTH LINE */}
          <path
            d={linePath}
            fill="none"
            stroke={COLORS.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* DATA POINTS & X-AXIS LABELS */}
          {points.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g key={pt.date} className="cursor-pointer">
                {/* POINT CIRCLE */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5 : 3.5}
                  fill={isHovered ? COLORS.primary : "#FFFFFF"}
                  stroke={COLORS.primary}
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />

                {/* X-AXIS DAY LABEL */}
                <text
                  x={pt.x}
                  y={height + 12}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight={pt.isSat ? "bold" : "500"}
                  fill={pt.isSat ? COLORS.alert : COLORS.textMuted}
                >
                  {WEEKDAY_LABELS[pt.weekday]} {pt.bs?.day || ""}
                </text>
              </g>
            );
          })}
        </svg>

        {/* HOVER TOOLTIP POPUP */}
        {hoveredIdx !== null && (
          <div
            className="absolute -top-10 bg-text text-white px-2 py-1 rounded-lg text-[10px] font-mono shadow-md pointer-events-none transform -translate-x-1/2 transition-all"
            style={{
              left: `${(points[hoveredIdx].x / width) * 100}%`,
            }}
          >
            <span className="font-bold text-success-light">
              {points[hoveredIdx].rate}%
            </span>{" "}
            ({points[hoveredIdx].checkedInTotal}/{points[hoveredIdx].totalStaff} in)
          </div>
        )}
      </div>
    </div>
  );
}

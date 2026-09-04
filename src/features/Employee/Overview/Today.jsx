import { useEffect, useState } from "react";
import { Clock, LogIn, LogOut, Check, MapPin, Coffee, Play } from "lucide-react";

import {
  formatDuration,
  getWorkedMinutes,
  todayISO,
  WORK_DAY_MINUTES,
} from "../../../utils/workTime";
import { ClockRing } from "../../../components/ClockRing";
import { getSiteSummaryForDate } from "../../../utils/workType";
import {
  isHalfDayLeave,
  getHalfDaySession,
  HALF_DAY_SESSIONS,
} from "../../../utils/leaveUtils";
import { isDateWithinLeave } from "../../../utils/attendance";

export function Today({
  records,
  entries = [],
  myLeave = [],
  clockIn,
  clockOut,
  clockInPending,
  startBreak,
  startBreakPending,
  endBreak,
  endBreakPending,
  setErr,
  today,
}) {
  const [justClocked, setJustClocked] = useState(null); // 'in' | 'out' | null
  const [currentTime, setCurrentTime] = useState(new Date());

  const todayRecord = records.find((record) => record.date === today);
  const siteSummary = getSiteSummaryForDate(entries, today);

  const todayLeave = (myLeave || []).find(
    (l) => l.status === "Approved" && isDateWithinLeave(today, l),
  );
  const isTodayHalfDay = isHalfDayLeave(todayLeave);
  const halfDaySession = getHalfDaySession(todayLeave);
  const targetDayMinutes = isTodayHalfDay ? 240 : WORK_DAY_MINUTES;

  useEffect(() => {
    if (!todayRecord?.clock_in || todayRecord?.clock_out) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [todayRecord?.clock_in, todayRecord?.clock_out]);

  const isOnBreak = !!todayRecord?.break_start && !todayRecord?.clock_out;
  const activeBreakMinutes = isOnBreak
    ? Math.max(
        0,
        Math.round(
          (currentTime.getTime() -
            new Date(todayRecord.break_start).getTime()) /
            60000,
        ),
      )
    : 0;

  const totalBreaks = (todayRecord?.break_minutes || 0) + activeBreakMinutes;

  const workedMinutes = todayRecord?.clock_in
    ? getWorkedMinutes(
        todayRecord.clock_in,
        todayRecord.clock_out || currentTime.toISOString(),
        totalBreaks,
      )
    : 0;

  const differenceMinutes = workedMinutes - targetDayMinutes;

  const formatDifference = () => {
    if (differenceMinutes === 0) {
      return "—";
    }

    const value = formatDuration(Math.abs(differenceMinutes));

    return differenceMinutes > 0 ? `+${value}` : `-${value}`;
  };

  const doClockIn = async () => {
    setErr("");
    try {
      await clockIn();
      setJustClocked("in");
      setTimeout(() => setJustClocked(null), 1400);
    } catch (error) {
      setErr(error.message);
    }
  };

  const doClockOut = async () => {
    setErr("");
    try {
      await clockOut();
      setJustClocked("out");
      setTimeout(() => setJustClocked(null), 1400);
    } catch (error) {
      setErr(error.message);
    }
  };

  const doStartBreak = async () => {
    setErr("");
    try {
      await startBreak();
    } catch (error) {
      setErr(error.message);
    }
  };

  const doEndBreak = async () => {
    setErr("");
    try {
      await endBreak();
    } catch (error) {
      setErr(error.message);
    }
  };

  return (
    <section className="relative bg-gradient-to-br from-[#011E26] via-[#012A30] to-[#02353D] text-white rounded-2xl p-5 sm:p-6 overflow-hidden">
      <style>{`
    @keyframes ripple-pop {
      0% { transform: scale(0.5); opacity: 0.55; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    @keyframes check-pop {
      0% { transform: scale(0.4); opacity: 0; }
      45% { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
  `}</style>

      <div
        className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-25 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #3D6B7D 0%, transparent 70%)",
        }}
      />

      <div className="flex items-start justify-between gap-4 relative">
        <div className="flex items-center gap-3 min-w-0">
          <ClockRing
            pct={
              todayRecord?.clock_in
                ? Math.min((workedMinutes / targetDayMinutes) * 100, 100)
                : 0
            }
            color={
              !todayRecord?.clock_in
                ? "rgba(255,255,255,0.3)"
                : isOnBreak
                  ? "#F59E0B"
                  : differenceMinutes >= 0
                    ? "#F2B463"
                    : "#8FBB95"
            }
          >
            <div
              className={`relative w-9 h-9 rounded-full flex items-center justify-center ${
                !todayRecord?.clock_in
                  ? "bg-white/10"
                  : isOnBreak
                    ? "bg-amber-500"
                    : "bg-success"
              }`}
            >
              {isOnBreak ? (
                <Coffee size={15} />
              ) : todayRecord?.clock_in ? (
                <Clock size={15} />
              ) : (
                <LogIn size={15} />
              )}

              {justClocked && (
                <>
                  <span
                    className="absolute inset-0 rounded-full border-2 border-[#8FBB95]"
                    style={{ animation: "ripple-pop 0.6s ease-out" }}
                  />
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center"
                    style={{ animation: "check-pop 0.5s ease-out" }}
                  >
                    <Check size={10} strokeWidth={3} />
                  </span>
                </>
              )}
            </div>
          </ClockRing>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
              Today
            </p>

            <div className="flex items-center gap-1.5 mt-0.5">
              {todayRecord?.clock_in && !todayRecord?.clock_out && (
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isOnBreak ? "bg-amber-400" : "bg-[#8FBB95]"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                      isOnBreak ? "bg-amber-400" : "bg-[#8FBB95]"
                    }`}
                  />
                </span>
              )}
              <p className="text-sm font-medium truncate">
                {!todayRecord?.clock_in
                  ? siteSummary.hasSiteVisit
                    ? "Site visit logged today"
                    : isTodayHalfDay
                      ? halfDaySession === HALF_DAY_SESSIONS.SECOND_HALF
                        ? "Half day · Morning shift (10 AM–2 PM)"
                        : "Half day · Afternoon shift (2 PM–6 PM)"
                      : "Not clocked in yet"
                  : todayRecord.clock_out
                    ? "Workday completed"
                    : isOnBreak
                      ? `On Break (${formatDuration(activeBreakMinutes)})`
                      : "Currently working"}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {isTodayHalfDay && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/95 bg-primary/40 border border-white/20 px-2 py-0.5 rounded-full">
                  🌗 Half Day ({halfDaySession === HALF_DAY_SESSIONS.SECOND_HALF ? "Afternoon Off" : "Morning Off"}) · 4h Target
                </span>
              )}

              {siteSummary.hasSiteVisit && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/90 bg-[#63537E]/60 border border-white/20 px-2 py-0.5 rounded-full">
                  <MapPin size={10} /> Site ({siteSummary.totalHours}h)
                </span>
              )}

              {totalBreaks > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-200 bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  <Coffee size={9} /> {totalBreaks}m break today
                </span>
              )}
            </div>
          </div>
        </div>

        {todayRecord?.clock_in && (
          <div className="text-right shrink-0">
            <div className="font-mono text-xl font-semibold transition-all duration-300">
              {formatDuration(workedMinutes)}
            </div>
            <div
              className={`font-mono text-[10px] ${
                differenceMinutes >= 0 ? "text-[#A9C5AC]" : "text-undertime"
              }`}
            >
              {differenceMinutes >= 0 ? "OT " : "Under "}
              {formatDifference()}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 relative">
        {!todayRecord?.clock_in ? (
          <button
            onClick={doClockIn}
            disabled={!!todayRecord || clockInPending}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-dark active:scale-[0.97] text-white text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
          >
            <LogIn size={15} />
            Clock in
          </button>
        ) : !todayRecord.clock_out ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {isOnBreak ? (
              <button
                onClick={doEndBreak}
                disabled={endBreakPending}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-slate-950 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Play size={15} fill="currentColor" />
                Resume Work
              </button>
            ) : (
              <button
                onClick={doStartBreak}
                disabled={startBreakPending}
                className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 active:scale-[0.97] text-white text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Coffee size={15} />
                Take Break
              </button>
            )}

            <button
              onClick={doClockOut}
              className="py-2.5 rounded-xl bg-alert hover:bg-alert-dark active:scale-[0.97] text-white text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut size={15} />
              Clock out
            </button>
          </div>
        ) : (
          <div className="text-center text-xs text-white/40 py-1">
            Completed for today
          </div>
        )}
      </div>

      <div className="hidden md:grid grid-cols-3 gap-2 mt-4 relative">
        <div className="bg-white/5 rounded-lg px-3 py-2.5">
          <p className="text-[9px] uppercase tracking-wider text-white/30">
            Clock in
          </p>
          <p className="font-mono text-xs mt-1">
            {todayRecord?.clock_in
              ? new Date(todayRecord?.clock_in).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : isTodayHalfDay
                ? halfDaySession === HALF_DAY_SESSIONS.SECOND_HALF
                  ? "Expected 10:00 AM"
                  : "Expected 02:00 PM"
                : "—"}
          </p>
        </div>

        <div className="bg-white/5 rounded-lg px-3 py-2.5">
          <p className="text-[9px] uppercase tracking-wider text-white/30">
            Break Time
          </p>
          <p className="font-mono text-xs mt-1">
            {isOnBreak ? (
              <span className="text-amber-300 font-semibold">On Break</span>
            ) : totalBreaks > 0 ? (
              `${totalBreaks} mins`
            ) : (
              "—"
            )}
          </p>
        </div>

        <div className="bg-white/5 rounded-lg px-3 py-2.5">
          <p className="text-[9px] uppercase tracking-wider text-white/30">
            Clock out
          </p>
          <p className="font-mono text-xs mt-1">
            {todayRecord?.clock_out
              ? new Date(todayRecord?.clock_out).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : isTodayHalfDay
                ? halfDaySession === HALF_DAY_SESSIONS.SECOND_HALF
                  ? "Target 02:00 PM (4h)"
                  : "Target 06:00 PM (4h)"
                : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}

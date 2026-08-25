import { useState } from "react";
import { Clock, LogIn, LogOut, Check } from "lucide-react";

import {
  formatDuration,
  getWorkedMinutes,
  todayISO,
  WORK_DAY_MINUTES,
} from "../../../utils/workTime";
import { ClockRing } from "../../../components/ClockRing";

export function Today({
  records,
  clockIn,
  clockOut,
  clockInPending,
  setErr,
  today,
}) {
  const [justClocked, setJustClocked] = useState(null); // 'in' | 'out' | null

  const todayRecord = records.find((record) => record.date === today);

  const workedMinutes = todayRecord?.clock_in
    ? getWorkedMinutes(todayRecord.clock_in, todayRecord.clock_out)
    : 0;

  const differenceMinutes = workedMinutes - WORK_DAY_MINUTES;

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

  return (
    <section className="relative bg-gradient-to-br from-[#11151F] via-[#2B2B33] to-[#3C4042] text-white rounded-2xl p-5 sm:p-6 overflow-hidden">
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
                ? (workedMinutes / WORK_DAY_MINUTES) * 100
                : 0
            }
            color={
              !todayRecord?.clock_in
                ? "rgba(255,255,255,0.3)"
                : differenceMinutes >= 0
                  ? "#F2B463"
                  : "#8FBB95"
            }
          >
            <div
              className={`relative w-9 h-9 rounded-full flex items-center justify-center ${
                todayRecord?.clock_in ? "bg-success" : "bg-white/10"
              }`}
            >
              {todayRecord?.clock_in ? (
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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8FBB95] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#8FBB95]" />
                </span>
              )}
              <p className="text-sm font-medium truncate">
                {!todayRecord?.clock_in
                  ? "Not clocked in yet"
                  : todayRecord.clock_out
                    ? "Workday completed"
                    : "Currently working"}
              </p>
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
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-dark active:scale-[0.97] text-white text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            <LogIn size={15} />
            Clock in
          </button>
        ) : !todayRecord.clock_out ? (
          <button
            onClick={doClockOut}
            className="w-full py-2.5 rounded-xl bg-alert hover:bg-alert-dark active:scale-[0.97] text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
          >
            <LogOut size={15} />
            Clock out
          </button>
        ) : (
          <div className="text-center text-xs text-white/40 py-1">
            Completed for today
          </div>
        )}
      </div>

      <div className="hidden md:grid grid-cols-2 gap-2 mt-4 relative  ">
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
              : "—"}
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
              : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}

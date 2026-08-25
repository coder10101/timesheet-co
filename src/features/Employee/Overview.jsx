import { useMemo, useState } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Sun,
  HeartPulse,
  Check,
  X,
  CalendarDays,
  AlertCircle,
  Umbrella,
  ChevronRight,
  ClipboardList,
} from "lucide-react";

import {
  useAttendance,
  useWorkLogs,
  useLeaveRequests,
  useProjects,
  useHolidays,
  useEvents,
} from "../../hooks/useOrgData";

import {
  formatDuration,
  getWorkedMinutes,
  todayISO,
  WORK_DAY_MINUTES,
} from "../../utils/workTime";

import { Card } from "../../components/Card";
import { getDailyMessage } from "../../utils/dailyMessage";
import { getCurrentBSMonthInfo, isoToBS } from "../../utils/nepaliCalendar";
import UpcomingEvents from "../../components/UpcomingEvents";

const LEAVE_VISUAL = {
  Annual: {
    icon: Sun,
    color: "#3D6B7D",
    max: 24,
  },
  Sick: {
    icon: HeartPulse,
    color: "#B5563A",
    max: 6,
  },
};

/* -------------------------------------------------------
   DATE HELPERS
------------------------------------------------------- */

const formatDateISO = (date) => {
  return date.toISOString().slice(0, 10);
};

const addDays = (date, amount) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const formatShortDay = (date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
  });
};

const formatDayNumber = (date) => {
  return date.getDate();
};

/* -------------------------------------------------------
   EMPLOYEE OVERVIEW
------------------------------------------------------- */

export function EmployeeOverview({ me }) {
  const { records, clockIn, clockOut, clockInPending } = useAttendance(me.id);

  const { entries, addEntry, updateEntry, deleteEntry } = useWorkLogs(me.id);

  const { requests: myLeave } = useLeaveRequests(me.id, "mine");

  const { projects } = useProjects();

  const { holidays } = useHolidays();

  const { events } = useEvents();

  const [err, setErr] = useState("");
  const [workText, setWorkText] = useState("");
  const [workProjectId, setWorkProjectId] = useState("");
  const [editingWorkId, setEditingWorkId] = useState(null);
  const [savingWork, setSavingWork] = useState(false);
  const [justClocked, setJustClocked] = useState(null); // 'in' | 'out' | null

  /* -------------------------------------------------------
     LOADING
  ------------------------------------------------------- */

  if (
    records === null ||
    entries === null ||
    myLeave === null ||
    projects === null ||
    holidays === null ||
    events === null
  ) {
    return null;
  }

  /* -------------------------------------------------------
     BASIC DATA
  ------------------------------------------------------- */

  const activeProjects = projects.filter((p) => !p.archived);

  const today = todayISO();

  const todayRecord = records.find((record) => record.date === today);

  const todayWorkLogs = entries.filter((entry) => entry.date === today);

  const todayHoliday = holidays.find((holiday) => holiday.date === today);

  const todayEvents = events.filter((event) => event.date === today);

  const workedMinutes = todayRecord?.clock_in
    ? getWorkedMinutes(todayRecord.clock_in, todayRecord.clock_out)
    : 0;

  const differenceMinutes = workedMinutes - WORK_DAY_MINUTES;

  const pendingLeave = myLeave.filter(
    (leave) => leave.status === "Pending",
  ).length;

  const dailyMessage = getDailyMessage(today, todayHoliday?.name);

  /* -------------------------------------------------------
     MONTHLY ATTENDANCE
  ------------------------------------------------------- */

  const monthInfo = getCurrentBSMonthInfo();

  const presentDaysThisMonth = records.filter(
    (record) =>
      record.clock_in &&
      record.date >= monthInfo.startISO &&
      record.date <= monthInfo.endISO,
  ).length;

  const monthStart = new Date(monthInfo.startISO);
  const monthEnd = new Date(monthInfo.endISO);

  const workingDaysThisMonth = [];

  const cursor = new Date(monthStart);

  while (cursor <= monthEnd) {
    const iso = formatDateISO(cursor);
    const day = cursor.getDay();

    const isWeekend = day === 0 || day === 6;

    const isHoliday = holidays.some((holiday) => holiday.date === iso);

    if (!isWeekend && !isHoliday) {
      workingDaysThisMonth.push(iso);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  /* -------------------------------------------------------
     CLOCK DIFFERENCE
  ------------------------------------------------------- */

  const formatDifference = () => {
    if (differenceMinutes === 0) {
      return "—";
    }

    const value = formatDuration(Math.abs(differenceMinutes));

    return differenceMinutes > 0 ? `+${value}` : `-${value}`;
  };

  /* -------------------------------------------------------
     CLOCK ACTIONS
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     WORK LOG
  ------------------------------------------------------- */

  const saveWork = async () => {
    const text = workText.trim();

    if (!text) return;

    setSavingWork(true);
    setErr("");

    try {
      if (editingWorkId) {
        await updateEntry(editingWorkId, text, workProjectId || null);
      } else {
        await addEntry(text, undefined, workProjectId || null);
      }

      setWorkText("");
      setWorkProjectId("");
      setEditingWorkId(null);
    } catch (error) {
      setErr(error.message);
    } finally {
      setSavingWork(false);
    }
  };

  const startEditWork = (entry) => {
    setEditingWorkId(entry.id);
    setWorkText(entry.entry_text);
    setWorkProjectId(entry.project_id || "");
  };

  const cancelWork = () => {
    setEditingWorkId(null);
    setWorkText("");
    setWorkProjectId("");
  };

  const removeWork = async (id) => {
    if (!window.confirm("Delete this work log?")) {
      return;
    }

    try {
      await deleteEntry(id);
    } catch (error) {
      setErr(error.message);
    }
  };

  function getWeekDates(isoDate) {
    const date = new Date(`${isoDate}T00:00:00`);

    // Sunday = 0
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - date.getDay());

    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + index);

      return d.toISOString().slice(0, 10);
    });
  }

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /* -------------------------------------------------------
     Week At A Glance
  ------------------------------------------------------- */

  function WeekAtGlance({ records, leaveRequests }) {
    const today = todayISO();

    const weekDates = useMemo(() => {
      return getWeekDates(today);
    }, [today]);

    const loggedDates = useMemo(() => {
      return new Set(
        records
          .filter((record) => record.clock_in)
          .map((record) => record.date),
      );
    }, [records]);

    const leaveDates = useMemo(() => {
      const dates = new Set();

      leaveRequests
        .filter((request) => request.status === "Approved")
        .forEach((request) => {
          const start = new Date(`${request.start_date}T00:00:00`);
          const end = new Date(`${request.end_date}T00:00:00`);

          const current = new Date(start);

          while (current <= end) {
            dates.add(current.toISOString().slice(0, 10));
            current.setDate(current.getDate() + 1);
          }
        });

      return dates;
    }, [leaveRequests]);

    const pastDates = weekDates.filter((date) => date <= today);

    const loggedCount = pastDates.filter((date) =>
      loggedDates.has(date),
    ).length;

    return (
      <Card
        title="Your attendance at a glance"
        subtitle={`${loggedCount} of ${pastDates.length} days logged`}
        cardClass="mb-0"
      >
        <div className="grid grid-cols-7 gap-1.5">
          {weekDates.map((date, index) => {
            const isToday = date === today;
            const isFuture = date > today;
            const isLogged = loggedDates.has(date);
            const isLeave = leaveDates.has(date);

            const bs = isoToBS(date);

            let status = "future";
            let statusText = "—";

            if (isLeave) {
              status = "leave";
              statusText = "Leave";
            } else if (isLogged) {
              status = "logged";
              statusText = "✓";
            } else if (!isFuture) {
              status = "missing";
              statusText = "Missing";
            }

            return (
              <div
                key={date}
                className={`
                  min-w-0 rounded-xl p-2 text-center border
                  ${
                    isToday
                      ? "border-[#3D6B7D] bg-[#F0F5F6]"
                      : "border-[#EEEAE0] bg-[#FAF9F6]"
                  }
                `}
              >
                {/* Gregorian weekday */}
                <div
                  className={`text-[9px] uppercase tracking-wide font-medium ${
                    isToday ? "text-[#3D6B7D]" : "text-[#9A9383]"
                  }`}
                >
                  {WEEKDAYS[index]}
                </div>

                {/* Nepali date */}
                <div
                  className={`mt-1 text-sm font-mono font-semibold ${
                    isToday ? "text-[#3D6B7D]" : "text-[#292722]"
                  }`}
                >
                  {bs?.day}
                </div>

                {/* Status */}
                <div className="mt-1.5">
                  {status === "logged" && (
                    <div
                      className="mx-auto w-5 h-5 rounded-full bg-[#E3EFE5] text-[#5D8065]
                      flex items-center justify-center"
                    >
                      <Check size={11} strokeWidth={2.5} />
                    </div>
                  )}

                  {status === "leave" && (
                    <div
                      className="text-[8px] font-medium text-[#3D6B7D]
                      truncate"
                    >
                      Leave
                    </div>
                  )}

                  {status === "missing" && (
                    <div
                      className="mx-auto w-5 h-5 rounded-full bg-[#FCEDEA] text-[#B5563A]
                      flex items-center justify-center text-[9px]"
                    >
                      !
                    </div>
                  )}

                  {status === "future" && (
                    <div className="text-[#B6B0A2] text-xs">—</div>
                  )}
                </div>

                {/* Today label */}
                {isToday && (
                  <div className="mt-1 text-[7px] uppercase tracking-wide text-[#3D6B7D] font-semibold">
                    Today
                  </div>
                )}

                {!isToday && status === "missing" && (
                  <div className="mt-1 text-[7px] text-[#B5563A]">Missing</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-[#EEEAE0]">
          <div className="flex items-center gap-1.5 text-[9px] text-[#7A7362]">
            <span className="w-2 h-2 rounded-full bg-[#6B8F71]" />
            Logged
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-[#7A7362]">
            <span className="w-2 h-2 rounded-full bg-[#B5563A]" />
            Missing
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-[#7A7362]">
            <span className="w-2 h-2 rounded-full bg-[#3D6B7D]" />
            Leave
          </div>
        </div>
      </Card>
    );
  }

  function ClockRing({ pct, size = 48, stroke = 3, color, children }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, pct));
    const offset = c * (1 - clamped / 100);
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 absolute inset-0">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      </div>
    );
  }
  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{dailyMessage.emoji}</span>

            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#292722]"
              style={{
                fontWeight: 800,
              }}
            >
              {dailyMessage.text} {me.name.split(" ")[0]}.
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-right">
          <div className="hidden sm:block">
            <p className="font-mono text-sm font-medium text-[#292722]">
              {new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            <div className=" flex items-center gap-1.5 text-xs text-[#7A7362]">
              <CalendarDays size={13} />
              <span>
                {presentDaysThisMonth}/{workingDaysThisMonth.length} days this
                month
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================
          ERROR
      =================================================== */}

      {err && (
        <div className="mb-4 px-3 py-2.5 rounded-lg bg-[#FCEDEA] text-[#B5563A] text-xs flex items-center gap-2">
          <AlertCircle size={14} />
          {err}
        </div>
      )}

      {/* ===================================================
          TOP GRID
      =================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-4">
        {/* =================================================
            TODAY
        ================================================= */}

        <section className="relative bg-gradient-to-br from-[#1A2332] via-[#1E2838] to-[#26344A] text-white rounded-2xl p-5 sm:p-6 overflow-hidden">
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
              background:
                "radial-gradient(circle, #3D6B7D 0%, transparent 70%)",
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
                    todayRecord?.clock_in ? "bg-[#6B8F71]" : "bg-white/10"
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
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#6B8F71] flex items-center justify-center"
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
                  Today .
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
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
                    differenceMinutes >= 0 ? "text-[#A9C5AC]" : "text-[#F2A89A]"
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
                className="w-full py-2.5 rounded-xl bg-[#6B8F71] hover:bg-[#5E8064] active:scale-[0.97] text-white text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                <LogIn size={15} />
                Clock in
              </button>
            ) : !todayRecord.clock_out ? (
              <button
                onClick={doClockOut}
                className="w-full py-2.5 rounded-xl bg-[#B5563A] hover:bg-[#A44930] active:scale-[0.97] text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
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
                  ? new Date(todayRecord?.clock_in).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )
                  : "—"}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-wider text-white/30">
                Clock out
              </p>
              <p className="font-mono text-xs mt-1">
                {todayRecord?.clock_out
                  ? new Date(todayRecord?.clock_out).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )
                  : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            THIS WEEK
        ================================================= */}

        <WeekAtGlance records={records} leaveRequests={myLeave} />
      </div>

      {/* ===================================================
          LOWER GRID
      =================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 mt-4 items-start">
        {/* =================================================
            TODAY'S WORK
        ================================================= */}

        <Card
          title="Today's work"
          subtitle={
            todayWorkLogs.length
              ? `${todayWorkLogs.length} logged`
              : "Nothing logged yet"
          }
        >
          {/* Compose bar */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex-1 flex items-center gap-2 bg-[#F7F5F0] rounded-full pl-1.5 pr-1 py-1 border border-transparent focus-within:border-[#3D6B7D] focus-within:bg-white transition-colors">
              <select
                value={workProjectId}
                onChange={(e) => setWorkProjectId(e.target.value)}
                className="bg-transparent text-xs rounded-full px-3 py-2 outline-none text-[#7A7362] w-24 sm:w-32 shrink-0"
              >
                <option value="">No tag</option>
                {activeProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              <span className="w-px h-4 bg-[#DDD8CB] shrink-0" />

              <input
                value={workText}
                onChange={(e) => setWorkText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveWork();
                }}
                placeholder="What did you work on?"
                className="flex-1 min-w-0 bg-transparent text-sm outline-none px-2 py-1.5"
              />
            </div>

            {editingWorkId && (
              <button
                onClick={cancelWork}
                title="Cancel edit"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#7A7362] hover:bg-[#F7F5F0] transition-colors shrink-0"
              >
                <X size={15} />
              </button>
            )}

            <button
              onClick={saveWork}
              disabled={!workText.trim() || savingWork}
              title={editingWorkId ? "Update" : "Add"}
              className="w-9 h-9 rounded-full bg-[#3D6B7D] hover:bg-[#345B69] active:scale-95 text-white flex items-center justify-center disabled:opacity-40 disabled:active:scale-100 transition-all shrink-0"
            >
              {editingWorkId ? <Check size={15} /> : <Plus size={15} />}
            </button>
          </div>

          {/* Entries — timeline feed */}
          {todayWorkLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-8 h-8 rounded-full bg-[#F7F5F0] flex items-center justify-center mb-1.5">
                <ClipboardList size={14} className="text-[#B6B0A2]" />
              </div>
              <p className="text-xs text-[#9A9383]">Nothing logged yet</p>
            </div>
          ) : (
            <div className="pl-1">
              {todayWorkLogs.map((entry, idx) => {
                const project = projects.find((p) => p.id === entry.project_id);
                const dotColor = project?.color || "#B6B0A2";
                const isLast = idx === todayWorkLogs.length - 1;

                return (
                  <div
                    key={entry.id}
                    className="group relative pl-5 pb-2 last:pb-0"
                  >
                    {!isLast && (
                      <span className="absolute left-[6.5px] top-3.5 bottom-0 w-px bg-[#EDE9DF]" />
                    )}
                    <span
                      className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-white border-2"
                      style={{ borderColor: dotColor }}
                    />

                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs leading-relaxed min-w-0 pt-0.5">
                        {project && (
                          <span
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 text-white align-middle"
                            style={{ backgroundColor: project.color }}
                          >
                            {project.name}
                          </span>
                        )}
                        {entry.entry_text}
                      </span>

                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => startEditWork(entry)}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F7F5F0]"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => removeWork(entry.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F7F5F0] text-[#B5563A]"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <div className="space-y-4">
          {/* LEAVE BALANCE */}

          <Card
            title="Leave balance"
            subtitle={
              pendingLeave
                ? `${pendingLeave} request${pendingLeave > 1 ? "s" : ""} pending`
                : "Available days"
            }
          >
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(LEAVE_VISUAL).map(
                ([type, { icon: Icon, color, max }]) => {
                  const value = me.leave_balance?.[type];
                  if (value === undefined) return null;

                  const isOut = value <= 0;
                  const used = Math.max(0, max - value);
                  const stubColor = isOut ? "#B5563A" : color;

                  return (
                    <div
                      key={type}
                      className="flex rounded-lg overflow-hidden border border-[#EDE9DF] bg-white"
                    >
                      {/* stub */}
                      <div
                        className="w-12 shrink-0 flex flex-col items-center justify-center py-2 text-white"
                        style={{ backgroundColor: stubColor }}
                      >
                        <span className="font-mono text-base font-bold leading-none">
                          {value}
                        </span>
                        <span className="text-[8px] uppercase tracking-wide text-white/75 mt-0.5">
                          left
                        </span>
                      </div>

                      {/* perforation */}
                      <div className="relative w-px shrink-0">
                        <div
                          className="absolute inset-y-1 left-0 w-px"
                          style={{
                            backgroundImage: `linear-gradient(${stubColor} 50%, transparent 0%)`,
                            backgroundSize: "1px 6px",
                            backgroundRepeat: "repeat-y",
                            opacity: 0.35,
                          }}
                        />
                        <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-[#F7F5F0]" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-[#F7F5F0]" />
                      </div>

                      {/* details */}
                      <div className="flex-1 min-w-0 px-2 py-1.5 flex flex-col justify-center">
                        <div className="flex items-center gap-1">
                          <Icon
                            size={11}
                            style={{ color: stubColor }}
                            className="shrink-0"
                          />
                          <span className="text-xs font-semibold text-[#292722] truncate">
                            {type}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#7A7362]">
                          {used}/{max} used
                        </span>
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            {pendingLeave > 0 && (
              <div className="mt-3 px-2.5 py-2 rounded-lg bg-[#F8F2E3] text-[#7A5A17] text-[11px] flex gap-2">
                <Umbrella size={12} className="shrink-0 mt-0.5" />
                <span>
                  {pendingLeave} leave request{pendingLeave > 1 ? "s" : ""}{" "}
                  waiting for approval.
                </span>
              </div>
            )}
          </Card>
          {/* UPCOMING */}

          <UpcomingEvents events={events} holidays={holidays} />
        </div>
      </div>
    </div>
  );
}

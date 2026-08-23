import { useState } from "react";
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
  CalendarCheck,
} from "lucide-react";
import {
  useAttendance,
  useWorkLogs,
  useLeaveRequests,
  useProjects,
  useHolidays,
} from "../../hooks/useOrgData";
import {
  fmtTime,
  formatDuration,
  getWorkedMinutes,
  todayISO,
  WORK_DAY_MINUTES,
} from "../../utils/workTime";
import { Card } from "../../components/Card";
import { NepaliCalendar } from "../../components/NepaliCalendar";
import { getDailyMessage } from "../../utils/dailyMessage";
import { getCurrentBSMonthInfo } from "../../utils/nepaliCalendar";

const LEAVE_VISUAL = {
  Annual: { icon: Sun, color: "#3D6B7D", max: 24 },
  Sick: { icon: HeartPulse, color: "#B5563A", max: 6 },
};

export function EmployeeOverview({ me }) {
  const { records, clockIn, clockOut, clockInPending } = useAttendance(me.id);
  const { entries, addEntry, updateEntry, deleteEntry } = useWorkLogs(me.id);
  const { requests: myLeave } = useLeaveRequests(me.id, "mine");
  const { projects } = useProjects();
  const { holidays } = useHolidays();

  const [err, setErr] = useState("");
  const [workText, setWorkText] = useState("");
  const [workProjectId, setWorkProjectId] = useState("");
  const [editingWorkId, setEditingWorkId] = useState(null);
  const [savingWork, setSavingWork] = useState(false);

  if (
    records === null ||
    entries === null ||
    myLeave === null ||
    projects === null ||
    holidays === null
  ) {
    return null;
  }

  const activeProjects = projects.filter((p) => !p.archived);
  const today = todayISO();
  const todayRecord = records.find((r) => r.date === today);
  const todayWorkLogs = entries.filter((entry) => entry.date === today);

  const todayHoliday = (holidays || []).find((h) => h.date === today);

  const workedMinutes = todayRecord?.clock_in
    ? getWorkedMinutes(todayRecord.clock_in, todayRecord.clock_out)
    : 0;
  const differenceMinutes = workedMinutes - WORK_DAY_MINUTES;
  const presentDays = records.filter((r) => r.clock_in).length;
  const pendingLeave = myLeave.filter((r) => r.status === "Pending").length;

  const projectFor = (id) => projects.find((p) => p.id === id);
  const dailyMessage = getDailyMessage(today, todayHoliday?.name);

  const monthInfo = getCurrentBSMonthInfo();
  const presentDaysThisMonth = records.filter(
    (r) =>
      r.clock_in && r.date >= monthInfo.startISO && r.date <= monthInfo.endISO,
  ).length;

  const formatDifference = () => {
    if (differenceMinutes === 0) return "—";
    const value = formatDuration(Math.abs(differenceMinutes));
    return differenceMinutes > 0 ? `+${value}` : `-${value}`;
  };

  const doClockIn = async () => {
    setErr("");
    try {
      await clockIn();
    } catch (e) {
      setErr(e.message);
    }
  };
  const doClockOut = async () => {
    setErr("");
    try {
      await clockOut();
    } catch (e) {
      setErr(e.message);
    }
  };

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
    } catch (e) {
      setErr(e.message);
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
    if (!window.confirm("Delete this work log?")) return;
    try {
      await deleteEntry(id);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="leading-none">{dailyMessage.emoji}</span>
              <span
                className="font-semibold"
                style={{ color: dailyMessage.color }}
              >
                {dailyMessage.text} {me.name.split(" ")[0]}.
              </span>
            </div>
          </h1>
          <p className="text-xs text-[#7A7362] mt-1 ml-1">
            {new Date().toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[#7A7362] text-xs">
          <CalendarCheck size={13} />
          <span className="font-mono font-semibold text-[#292722]">
            {presentDaysThisMonth}/{monthInfo.totalDays}
          </span>{" "}
          this month
        </div>
      </div>

      {err && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-[#FCEDEA] text-[#B5563A] text-xs">
          {err}
        </div>
      )}

      {/* TWO-COLUMN LAYOUT ON WIDE SCREENS: work on the left, leave as a sidebar on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
        {/* LEFT COLUMN */}
        <div>
          {/* CLOCK IN/OUT */}
          <div className="bg-[#1A2332] text-white rounded-xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${todayRecord?.clock_in ? "bg-[#6B8F71]" : "bg-white/10"}`}
              >
                {todayRecord?.clock_in ? (
                  <Clock size={16} />
                ) : (
                  <LogIn size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-white/50">
                  Today
                </div>
                <div className="text-sm font-medium truncate">
                  {!todayRecord?.clock_in
                    ? "Not clocked in yet"
                    : todayRecord.clock_out
                      ? "Workday completed"
                      : "Currently working"}
                </div>
              </div>
              {todayRecord?.clock_in && (
                <div className="text-right shrink-0">
                  <div className="font-mono text-base font-semibold leading-tight">
                    {formatDuration(workedMinutes)}
                  </div>
                  <div
                    className={`font-mono text-[10px] leading-tight ${differenceMinutes >= 0 ? "text-[#A9C5AC]" : "text-[#F2A89A]"}`}
                  >
                    {differenceMinutes >= 0 ? "OT " : "Under "}
                    {formatDifference()}
                  </div>
                </div>
              )}
            </div>

            {!todayRecord?.clock_in ? (
              <button
                onClick={doClockIn}
                className="w-full py-2 rounded-lg bg-[#6B8F71] hover:bg-[#5E8064] text-white text-sm font-medium flex items-center justify-center gap-2"
                disabled={!!todayRecord || clockInPending}
              >
                <LogIn size={14} /> Clock in
              </button>
            ) : !todayRecord.clock_out ? (
              <button
                onClick={doClockOut}
                className="w-full py-2 rounded-lg bg-[#B5563A] hover:bg-[#A44930] text-white text-sm font-medium flex items-center justify-center gap-2"
              >
                <LogOut size={14} /> Clock out
              </button>
            ) : (
              <div className="text-center text-xs text-white/50 py-0.5">
                Completed for today
              </div>
            )}
          </div>

          {/* TODAY'S WORK */}
          <Card
            title="Today's work"
            subtitle={
              todayWorkLogs.length
                ? `${todayWorkLogs.length} logged`
                : "Nothing logged yet"
            }
          >
            <div className="flex gap-2 mb-3">
              <select
                value={workProjectId}
                onChange={(e) => setWorkProjectId(e.target.value)}
                className="border border-[#DDD8CB] rounded-lg px-2 py-2 text-xs bg-white w-24 shrink-0"
              >
                <option value="">No tag</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                value={workText}
                onChange={(e) => setWorkText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveWork()}
                placeholder="What did you work on?"
                className="flex-1 min-w-0 border border-[#DDD8CB] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3D6B7D]"
              />
              <button
                onClick={saveWork}
                disabled={!workText.trim() || savingWork}
                title={editingWorkId ? "Update" : "Add"}
                className="shrink-0 w-9 h-9 rounded-lg bg-[#3D6B7D] text-white flex items-center justify-center disabled:opacity-40"
              >
                {editingWorkId ? <Check size={15} /> : <Plus size={15} />}
              </button>
              {editingWorkId && (
                <button
                  onClick={cancelWork}
                  title="Cancel edit"
                  className="shrink-0 w-9 h-9 rounded-lg border border-[#DDD8CB] flex items-center justify-center"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {todayWorkLogs.length === 0 ? (
              <div className="py-3 text-center border border-dashed border-[#E4DFD3] rounded-lg text-xs text-[#7A7362]">
                No work logged today — add your first entry above
              </div>
            ) : (
              <div className="space-y-0.5">
                {todayWorkLogs.map((entry) => {
                  const proj = projectFor(entry.project_id);
                  return (
                    <div
                      key={entry.id}
                      className="group flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F7F5F0]"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3D6B7D] mt-1.5 shrink-0" />
                        <span className="text-xs leading-relaxed">
                          {proj && (
                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 text-white align-middle"
                              style={{ backgroundColor: proj.color }}
                            >
                              {proj.name}
                            </span>
                          )}
                          {entry.entry_text}
                        </span>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => startEditWork(entry)}
                          className="p-1.5 rounded hover:bg-white"
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => removeWork(entry.id)}
                          className="p-1.5 rounded hover:bg-white text-[#B5563A]"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          {/* TODAY'S FOCUS — entry distribution across projects, not a time-tracked breakdown */}
          {todayWorkLogs.length > 0 && (
            <Card
              title="Today's focus"
              subtitle="Where your logged entries went"
            >
              {(() => {
                const counts = {};
                let untagged = 0;
                todayWorkLogs.forEach((entry) => {
                  if (entry.project_id) {
                    counts[entry.project_id] =
                      (counts[entry.project_id] || 0) + 1;
                  } else {
                    untagged += 1;
                  }
                });

                const total = todayWorkLogs.length;
                const segments = Object.entries(counts)
                  .map(([projectId, count]) => ({
                    projectId,
                    count,
                    project: projectFor(projectId),
                  }))
                  .filter((s) => s.project) // drop if project was deleted, not just archived
                  .sort((a, b) => b.count - a.count);

                if (untagged > 0) {
                  segments.push({
                    projectId: "untagged",
                    count: untagged,
                    project: { name: "No tag", color: "#B6B0A2" },
                  });
                }

                return (
                  <>
                    <div className="h-2 rounded-full overflow-hidden flex mb-3">
                      {segments.map((s) => (
                        <div
                          key={s.projectId}
                          style={{
                            width: `${(s.count / total) * 100}%`,
                            backgroundColor: s.project.color,
                          }}
                          title={`${s.project.name}: ${s.count}`}
                        />
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {segments.map((s) => (
                        <div
                          key={s.projectId}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: s.project.color }}
                            />
                            <span className="truncate">{s.project.name}</span>
                          </div>
                          <span className="font-mono text-[#7A7362] shrink-0">
                            {s.count} {s.count === 1 ? "entry" : "entries"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN — sidebar, fills the space that used to sit empty */}
        <div className="lg:sticky lg:top-6">
          <Card
            title="Leave balance"
            subtitle={
              pendingLeave
                ? `${pendingLeave} request${pendingLeave > 1 ? "s" : ""} pending`
                : "Available days"
            }
          >
            <div className="space-y-2">
              {Object.entries(LEAVE_VISUAL).map(
                ([type, { icon: Icon, color, max }]) => {
                  const value = me.leave_balance?.[type];
                  if (value === undefined) return null;
                  const isOut = value <= 0;
                  const pct = Math.max(0, Math.min(100, (value / max) * 100));

                  return (
                    <div key={type} className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${color}1A`, color }}
                      >
                        <Icon size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-0.5">
                          <span className="text-xs font-medium text-[#4A4738]">
                            {type}
                          </span>
                          <span
                            className={`font-mono text-xs font-semibold ${isOut ? "text-[#B5563A]" : "text-[#292722]"}`}
                          >
                            {value} {type !== "Unpaid" && "days"}
                            {isOut && (
                              <span className="ml-1 text-[9px] uppercase font-normal">
                                out
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-[#EDE9DF] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: isOut ? "#B5563A" : color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            {pendingLeave > 0 && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-[#F8F2E3] text-[#7A5A17] text-[11px]">
                You have {pendingLeave} leave request
                {pendingLeave > 1 ? "s" : ""} waiting for approval.
              </div>
            )}
          </Card>
          <NepaliCalendar />
        </div>
      </div>
    </div>
  );
}

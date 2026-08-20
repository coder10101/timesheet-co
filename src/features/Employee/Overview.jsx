import { useState } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  useAttendance,
  useWorkLogs,
  useLeaveRequests,
  useProjects,
} from "../../hooks/useOrgData";
import {
  fmtDate,
  fmtTime,
  formatDuration,
  getWorkedMinutes,
  LEAVE_TYPES,
  todayISO,
  WORK_DAY_MINUTES,
} from "../../utils/workTime";
import { Card } from "../../components/Card";
import { MiniStat } from "../../components/MiniStat";

export function EmployeeOverview({ me }) {
  const { records, clockIn, clockOut } = useAttendance(me.id);
  const { entries, addEntry, updateEntry, deleteEntry } = useWorkLogs(me.id);
  const { requests: myLeave } = useLeaveRequests(me.id, "mine");
  const { projects } = useProjects();

  const [err, setErr] = useState("");

  const [showWorkInput, setShowWorkInput] = useState(false);
  const [workText, setWorkText] = useState("");
  const [workProjectId, setWorkProjectId] = useState("");
  const [editingWorkId, setEditingWorkId] = useState(null);
  const [savingWork, setSavingWork] = useState(false);

  if (
    records === null ||
    entries === null ||
    myLeave === null ||
    projects === null
  ) {
    return null;
  }

  const activeProjects = projects.filter((p) => !p.archived);

  const today = todayISO();
  const todayRecord = records.find((r) => r.date === today);
  const todayWorkLogs = entries.filter((entry) => entry.date === today);

  const workedMinutes = todayRecord?.clock_in
    ? getWorkedMinutes(todayRecord.clock_in, todayRecord.clock_out)
    : 0;
  const differenceMinutes = workedMinutes - WORK_DAY_MINUTES;
  const presentDays = records.filter((r) => r.clock_in).length;
  const pendingLeave = myLeave.filter((r) => r.status === "Pending").length;

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
      setShowWorkInput(false);
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
    setShowWorkInput(true);
  };

  const cancelWork = () => {
    setEditingWorkId(null);
    setWorkText("");
    setWorkProjectId("");
    setShowWorkInput(false);
  };

  const removeWork = async (id) => {
    if (!window.confirm("Delete this work log?")) return;
    try {
      await deleteEntry(id);
    } catch (e) {
      setErr(e.message);
    }
  };

  const projectFor = (id) => projects.find((p) => p.id === id);

  return (
    <div className="max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {me.name.split(" ")[0]}
          </h1>
          <p className="text-xs text-[#7A7362] mt-1">
            {new Date().toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-[10px] uppercase tracking-wider text-[#9A9383]">
            Workday
          </div>
          <div className="font-mono text-sm">8h required</div>
        </div>
      </div>

      {err && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-[#FCEDEA] text-[#B5563A] text-xs">
          {err}
        </div>
      )}

      {/* TODAY HERO — unchanged */}
      <div className="bg-[#1A2332] text-white rounded-xl px-5 py-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${todayRecord?.clock_in ? "bg-[#6B8F71]" : "bg-white/10"}`}
            >
              {todayRecord?.clock_in ? (
                <Clock size={18} />
              ) : (
                <LogIn size={18} />
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white/50">
                Today's attendance
              </div>
              <div className="text-sm font-medium mt-0.5">
                {!todayRecord?.clock_in
                  ? "You haven't clocked in yet"
                  : todayRecord.clock_out
                    ? "Workday completed"
                    : "You're currently working"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] text-white/40 uppercase">In</div>
              <div className="font-mono text-sm">
                {fmtTime(todayRecord?.clock_in)}
              </div>
            </div>
            <div className="text-white/20">→</div>
            <div>
              <div className="text-[10px] text-white/40 uppercase">Out</div>
              <div className="font-mono text-sm">
                {fmtTime(todayRecord?.clock_out)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div>
              <div className="text-[10px] text-white/40 uppercase">Worked</div>
              <div className="font-mono text-lg font-semibold">
                {todayRecord?.clock_in ? formatDuration(workedMinutes) : "—"}
              </div>
            </div>
            {todayRecord?.clock_in && (
              <div>
                <div className="text-[10px] text-white/40 uppercase">
                  {differenceMinutes >= 0 ? "OT" : "Under"}
                </div>
                <div
                  className={`font-mono text-sm font-semibold ${differenceMinutes >= 0 ? "text-[#A9C5AC]" : "text-[#F2A89A]"}`}
                >
                  {formatDifference()}
                </div>
              </div>
            )}
          </div>
          {!todayRecord?.clock_in ? (
            <button
              onClick={doClockIn}
              className="px-4 py-2 rounded-lg bg-[#6B8F71] hover:bg-[#5E8064] text-white text-xs font-medium flex items-center gap-2"
            >
              <LogIn size={14} /> Clock in
            </button>
          ) : !todayRecord.clock_out ? (
            <button
              onClick={doClockOut}
              className="px-4 py-2 rounded-lg bg-[#B5563A] hover:bg-[#A44930] text-white text-xs font-medium flex items-center gap-2"
            >
              <LogOut size={14} /> Clock out
            </button>
          ) : (
            <div className="text-xs text-white/50">Completed</div>
          )}
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 mb-4">
        {/* TODAY'S WORK */}
        <Card
          title="Today's work"
          subtitle={
            todayWorkLogs.length
              ? `${todayWorkLogs.length} logged`
              : "Nothing logged yet"
          }
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-[#9A9383]">
              Keep a quick record of what you worked on.
            </span>
            {!showWorkInput && (
              <button
                onClick={() => setShowWorkInput(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#3D6B7D] hover:underline"
              >
                <Plus size={13} /> Add work
              </button>
            )}
          </div>

          {showWorkInput && (
            <div className="mb-3">
              <select
                value={workProjectId}
                onChange={(e) => setWorkProjectId(e.target.value)}
                className="w-full border border-[#DDD8CB] rounded-lg px-2.5 py-1.5 text-xs mb-2 bg-white"
              >
                <option value="">No project tag</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {editingWorkId && projectFor(workProjectId)?.archived && (
                  <option value={workProjectId}>
                    {projectFor(workProjectId).name} (archived)
                  </option>
                )}
              </select>

              <textarea
                autoFocus
                value={workText}
                onChange={(e) => setWorkText(e.target.value)}
                placeholder="What did you work on?"
                rows={2}
                className="w-full border border-[#DDD8CB] rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-[#3D6B7D]"
              />

              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveWork}
                  disabled={!workText.trim() || savingWork}
                  className="px-3 py-1.5 rounded-md bg-[#3D6B7D] text-white text-xs font-medium disabled:opacity-40"
                >
                  {savingWork ? "Saving..." : editingWorkId ? "Update" : "Add"}
                </button>
                <button
                  onClick={cancelWork}
                  className="px-3 py-1.5 rounded-md border border-[#DDD8CB] text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {todayWorkLogs.length === 0 ? (
            <div className="py-4 text-center border border-dashed border-[#E4DFD3] rounded-lg">
              <ClipboardList
                size={20}
                className="mx-auto text-[#B6B0A2] mb-1"
              />
              <div className="text-xs text-[#7A7362]">No work logged today</div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {todayWorkLogs.map((entry) => {
                const proj = projectFor(entry.project_id);
                return (
                  <div
                    key={entry.id}
                    className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F7F5F0]"
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
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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

        {/* LEAVE — unchanged */}
        <Card
          title="Leave balance"
          subtitle={
            pendingLeave ? `${pendingLeave} request pending` : "Available days"
          }
        >
          <div className="grid grid-cols-2 gap-2">
            {LEAVE_TYPES.map((type) => (
              <div key={type} className="bg-[#F5F3EE] rounded-lg px-3 py-3">
                <div className="text-[10px] uppercase tracking-wide text-[#8A8374]">
                  {type}
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono text-xl font-semibold">
                    {me.leave_balance?.[type] ?? 0}
                  </span>
                  <span className="text-[10px] text-[#8A8374]">days</span>
                </div>
              </div>
            ))}
          </div>
          {pendingLeave > 0 && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-[#F8F2E3] text-[#7A5A17] text-[11px]">
              You have {pendingLeave} leave request{pendingLeave > 1 ? "s" : ""}{" "}
              waiting for approval.
            </div>
          )}
        </Card>
      </div>

      {/* QUICK STATS — unchanged */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MiniStat label="Days present" value={presentDays} />
        <MiniStat label="Annual left" value={me.leave_balance?.Annual ?? 0} />
        <MiniStat label="Sick left" value={me.leave_balance?.Sick ?? 0} />
      </div>

      {/* RECENT ACTIVITY */}
      <Card title="Recent activity" subtitle="Your latest workdays">
        {records.length === 0 ? (
          <div className="text-xs text-[#7A7362] py-3">
            No attendance records yet.
          </div>
        ) : (
          <div className="divide-y divide-[#EDE9DF]">
            {records
              .filter((r) => r.clock_in)
              .slice(0, 5)
              .map((record) => {
                const minutes = getWorkedMinutes(
                  record.clock_in,
                  record.clock_out,
                );
                const diff = minutes - WORK_DAY_MINUTES;
                const dayLogs = entries.filter(
                  (entry) => entry.date === record.date,
                );

                return (
                  <div
                    key={record.id}
                    className="py-2.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium">
                        {fmtDate(record.date)}
                      </div>
                      <div className="text-[11px] text-[#8A8374] truncate mt-0.5">
                        {dayLogs.length
                          ? dayLogs
                              .map((x) => {
                                const proj = projectFor(x.project_id);
                                return proj
                                  ? `[${proj.name}] ${x.entry_text}`
                                  : x.entry_text;
                              })
                              .join(" · ")
                          : "No work log"}
                      </div>
                    </div>
                    <div className="flex items-center gap-5 shrink-0">
                      <div className="text-right">
                        <div className="font-mono text-xs">
                          {formatDuration(minutes)}
                        </div>
                        <div className="text-[9px] uppercase text-[#9A9383]">
                          worked
                        </div>
                      </div>
                      <div
                        className={`font-mono text-xs w-12 text-right ${diff > 0 ? "text-[#6B8F71]" : diff < 0 ? "text-[#B5563A]" : "text-[#9A9383]"}`}
                      >
                        {diff > 0
                          ? `+${formatDuration(diff)}`
                          : diff < 0
                            ? `-${formatDuration(diff)}`
                            : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>
    </div>
  );
}

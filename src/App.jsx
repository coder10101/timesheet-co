import { useEffect, useState } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  Clock3,
  Users,
  ClipboardList,
  Plus,
  AlertCircle,
  ArrowLeft,
  TimerReset,
  Sunrise,
  Pencil,
  Trash2,
} from "lucide-react";
import { AuthProvider, useAuth } from "./lib/AuthProvider";
import Login from "./components/Login";
import {
  useAttendance,
  useWorkLogs,
  useLeaveRequests,
  useRoster,
} from "./hooks/useOrgData";
import {
  calculateLeaveDays,
  formatDuration,
  getWorkDifference,
  getWorkedMinutes,
  WORK_DAY_MINUTES,
} from "./utils/workTime";
import { toNepalDateTimeLocal } from "./utils/timezone";
import { EmployeeOverview } from "./features/Employee/EmployeeOverview";

const todayISO = () => new Date().toISOString().slice(0, 10);
function fmtTime(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}
const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const daysBetween = (a, b) =>
  Math.round((new Date(b) - new Date(a)) / 86400000) + 1;

/* ---------------- Working hours ---------------- */

const STATUS_STYLES = {
  Pending: "bg-[#F4E3C1] text-[#7A5A17] border-[#E0A458]",
  Approved: "bg-[#DCE9DE] text-[#2F5233] border-[#6B8F71]",
  Rejected: "bg-[#F1DAD2] text-[#8C3A20] border-[#B5563A]",
};

function StatusPill({ status }) {
  const icon =
    status === "Approved" ? (
      <CheckCircle2 size={13} />
    ) : status === "Rejected" ? (
      <XCircle size={13} />
    ) : (
      <Clock3 size={13} />
    );
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${STATUS_STYLES[status]}`}
    >
      {icon}
      {status}
    </span>
  );
}
function Card({ title, subtitle, children, right }) {
  return (
    <div className="bg-white border border-[#E4DFD3] rounded-xl p-5 mb-5">
      {(title || right) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="font-semibold text-[15px]">{title}</h3>}
            {subtitle && (
              <p className="text-[12px] text-[#7A7362] mt-0.5">{subtitle}</p>
            )}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
function StatBlock({ label, value, accent }) {
  return (
    <div className="bg-white border border-[#E4DFD3] rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wide text-[#7A7362] mb-1">
        {label}
      </div>
      <div
        className={`font-mono text-2xl font-semibold ${accent || "text-[#1A2332]"}`}
      >
        {value}
      </div>
    </div>
  );
}
function EmptyState({ text }) {
  return (
    <div className="text-center py-10 text-[13px] text-[#7A7362] border border-dashed border-[#E4DFD3] rounded-lg">
      {text}
    </div>
  );
}

/* ================= Root ================= */
export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

function Root() {
  const { isAuthLoading, user, profile, profileLoading, signOut } = useAuth();

  if (isAuthLoading || (user && profileLoading && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101820] text-[#EDE7DA] font-mono text-sm">
        loading workspace…
      </div>
    );
  }
  if (!user) return <Login />;
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101820] text-[#EDE7DA] text-sm gap-3 flex-col">
        <p>Couldn't load your profile.</p>
        <button onClick={signOut} className="underline text-[#8FA6AE]">
          Sign out and try again
        </button>
      </div>
    );
  }
  return <Dashboard me={profile} onLogout={signOut} />;
}

/* ================= Dashboard shell ================= */
function Dashboard({ me, onLogout }) {
  const isAdmin = me.role === "admin";
  const [tab, setTab] = useState("overview");

  const employeeTabs = [
    { id: "overview", label: "Overview", icon: <Sunrise size={15} /> },
    { id: "attendance", label: "Attendance", icon: <Calendar size={15} /> },
    { id: "worklog", label: "Work Log", icon: <ClipboardList size={15} /> },
    { id: "leave", label: "Leave", icon: <FileText size={15} /> },
  ];
  const adminTabs = [
    { id: "overview", label: "Team Overview", icon: <Users size={15} /> },
    {
      id: "attendance",
      label: "Attendance Records",
      icon: <Calendar size={15} />,
    },
    {
      id: "leaveApprovals",
      label: "Leave Approvals",
      icon: <FileText size={15} />,
    },
    { id: "worklogs", label: "Work Logs", icon: <ClipboardList size={15} /> },
  ];
  const tabs = isAdmin ? adminTabs : employeeTabs;

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#1A2332] font-sans">
      <div className="flex flex-col md:flex-row">
        <aside className="md:w-60 shrink-0 bg-[#101820] text-[#EDE7DA] md:min-h-screen">
          <div className="flex items-center gap-2 px-5 py-5 border-b border-[#26333F]">
            <div className="w-8 h-8 rounded bg-[#3D6B7D] flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-[#8FA6AE] uppercase">
                Timesheet Co.
              </div>
              <div className="font-semibold text-sm leading-none">
                Attendance Ledger
              </div>
            </div>
          </div>
          <nav className="px-3 py-4 flex md:flex-col gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors ${tab === t.id ? "bg-[#3D6B7D] text-white" : "text-[#8FA6AE] hover:bg-[#1C2933] hover:text-[#EDE7DA]"}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto px-4 py-4 border-t border-[#26333F] hidden md:block">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-8 h-8 rounded-full bg-[#3D6B7D] flex items-center justify-center text-[11px] font-mono">
                {me.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className="text-sm font-medium">{me.name}</div>
                <div className="text-[11px] text-[#8FA6AE]">{me.role}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-[12px] text-[#8FA6AE] hover:text-[#EDE7DA] flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 p-5 md:p-8">
          {!isAdmin && tab === "overview" && <EmployeeOverview me={me} />}
          {!isAdmin && tab === "attendance" && <EmployeeAttendance me={me} />}
          {!isAdmin && tab === "worklog" && <EmployeeWorklog me={me} />}
          {!isAdmin && tab === "leave" && <EmployeeLeave me={me} />}
          {isAdmin && tab === "overview" && <AdminOverview />}
          {isAdmin && tab === "attendance" && <AdminAttendance />}
          {isAdmin && tab === "leaveApprovals" && <AdminLeave me={me} />}
          {isAdmin && tab === "worklogs" && <AdminWorklogs />}
        </main>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-white border border-[#E4DFD3] rounded-lg px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-[#918A7B]">
        {label}
      </div>

      <div className="font-mono text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}

/* ================= Employee views ================= */

function EmployeeAttendance({ me }) {
  const { records, updateAttendance } = useAttendance(me.id);

  const [editing, setEditing] = useState(null);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  if (records === null) {
    return null;
  }

  const presentRecords = records.filter((r) => r.clock_in);

  const totalWorked = presentRecords.reduce(
    (sum, record) => sum + getWorkedMinutes(record.clock_in, record.clock_out),
    0,
  );

  const totalDifference = presentRecords.reduce((sum, record) => {
    if (!record.clock_in || !record.clock_out) {
      return sum;
    }

    const difference = getWorkDifference(record.clock_in, record.clock_out);

    if (Number.isNaN(difference)) {
      return sum;
    }

    return sum + difference;
  }, 0);

  const startEdit = (record) => {
    setError("");

    setEditing({
      id: record.id,

      clockIn: toNepalDateTimeLocal(record.clock_in),

      clockOut: toNepalDateTimeLocal(record.clock_out),
    });
  };

  const saveEdit = async () => {
    setSaving(true);
    setError("");

    try {
      await updateAttendance(editing.id, {
        clockIn: editing.clockIn,
        clockOut: editing.clockOut,
      });

      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Attendance</h1>

        <p className="text-xs text-[#7A7362] mt-1">
          Your attendance and working hours
        </p>
      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-3 gap-3 mb-5">
        <MiniStat label="Days present" value={presentRecords.length} />

        <MiniStat label="Hours worked" value={formatDuration(totalWorked)} />

        <MiniStat
          label={totalDifference >= 0 ? "Overtime" : "Undertime"}
          value={
            totalDifference >= 0
              ? `+${formatDuration(totalDifference)}`
              : `-${formatDuration(totalDifference)}`
          }
        />
      </div>

      {/* NOTE */}

      <div className="mb-4 px-3 py-2 rounded-lg bg-[#F5F3EE] text-[11px] text-[#7A7362]">
        Working hours are calculated from clock-in to clock-out, with a 1-hour
        lunch automatically deducted.
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-[#FCEDEA] text-[#B5563A] text-xs">
          {error}
        </div>
      )}

      {/* RECORDS */}

      <div className="bg-white border border-[#E4DFD3] rounded-xl overflow-hidden">
        {records.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#7A7362]">
            No attendance records yet.
          </div>
        ) : (
          records.map((record) => {
            const worked = getWorkedMinutes(record.clock_in, record.clock_out);

            const difference = getWorkDifference(
              record.clock_in,
              record.clock_out,
            );

            const isEditing = editing?.id === record.id;

            return (
              <div
                key={record.id}
                className="border-b border-[#EDE9DF] last:border-0"
              >
                {!isEditing ? (
                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="w-28 shrink-0">
                      <div className="text-xs font-medium">
                        {fmtDate(record.date)}
                      </div>

                      <div className="text-[10px] text-[#9A9383] mt-0.5">
                        {record.clock_in ? "Present" : "Absent"}
                      </div>
                    </div>

                    <div className="font-mono text-xs">
                      {fmtTime(record.clock_in)}
                      <span className="mx-2 text-[#B6B0A2]">→</span>
                      {fmtTime(record.clock_out)}
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs font-medium">
                        {record.clock_out
                          ? formatDuration(worked)
                          : "In progress"}
                      </div>

                      <div
                        className={`font-mono text-[10px] ${
                          difference > 0
                            ? "text-[#6B8F71]"
                            : difference < 0
                              ? "text-[#B5563A]"
                              : "text-[#9A9383]"
                        }`}
                      >
                        {record.clock_out
                          ? difference > 0
                            ? `+${formatDuration(difference)}`
                            : difference < 0
                              ? `-${formatDuration(difference)}`
                              : "On target"
                          : ""}
                      </div>
                    </div>

                    <button
                      onClick={() => startEdit(record)}
                      className="p-2 rounded-lg hover:bg-[#F5F3EE]"
                      title="Edit attendance"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-4 bg-[#FAF9F6]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-semibold">
                        Edit attendance · {fmtDate(record.date)}
                      </div>

                      <div className="text-[10px] text-[#9A9383]">
                        Date cannot be changed
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <label className="text-[11px] text-[#7A7362]">
                        Clock in
                        <input
                          type="datetime-local"
                          value={editing.clockIn}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              clockIn: e.target.value,
                            })
                          }
                          className="mt-1 w-full border border-[#DDD8CB] rounded-lg px-3 py-2 text-xs"
                        />
                      </label>

                      <label className="text-[11px] text-[#7A7362]">
                        Clock out
                        <input
                          type="datetime-local"
                          value={editing.clockOut}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              clockOut: e.target.value,
                            })
                          }
                          className="mt-1 w-full border border-[#DDD8CB] rounded-lg px-3 py-2 text-xs"
                        />
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-[#3D6B7D] text-white text-xs font-medium disabled:opacity-40"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>

                      <button
                        onClick={() => setEditing(null)}
                        className="px-3 py-1.5 rounded-lg border border-[#DDD8CB] text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function EmployeeWorklog({ me }) {
  const { records } = useAttendance(me.id);

  const { entries, addEntry, updateEntry, deleteEntry } = useWorkLogs(me.id);

  const [text, setText] = useState("");

  const [selectedDate, setSelectedDate] = useState(todayISO());

  const [editingId, setEditingId] = useState(null);

  const [saving, setSaving] = useState(false);

  if (records === null || entries === null) {
    return null;
  }

  const dates = [
    ...new Set([...records.map((r) => r.date), ...entries.map((e) => e.date)]),
  ].sort((a, b) => new Date(b) - new Date(a));

  const saveEntry = async () => {
    const value = text.trim();

    if (!value) return;

    setSaving(true);

    try {
      if (editingId) {
        await updateEntry(editingId, value);
      } else {
        await addEntry(value, selectedDate);
      }

      setText("");
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (entry) => {
    setSelectedDate(entry.date);
    setEditingId(entry.id);
    setText(entry.entry_text);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Work Log</h1>

        <p className="text-xs text-[#7A7362] mt-1">
          What you worked on and how long you worked
        </p>
      </div>

      {/* ADD WORK */}

      <div className="bg-white border border-[#E4DFD3] rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-medium">
              {editingId ? "Edit work log" : "Add work"}
            </div>

            <div className="text-[10px] text-[#9A9383]">
              Log work against a specific day
            </div>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-[#DDD8CB] rounded-lg px-2 py-1.5 text-xs"
          />
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What did you work on?"
          rows={2}
          className="w-full border border-[#DDD8CB] rounded-lg px-3 py-2 text-sm resize-none"
        />

        <div className="flex gap-2 mt-2">
          <button
            onClick={saveEntry}
            disabled={!text.trim() || saving}
            className="px-3 py-1.5 rounded-lg bg-[#3D6B7D] text-white text-xs font-medium disabled:opacity-40"
          >
            {saving ? "Saving..." : editingId ? "Update" : "Add work"}
          </button>

          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setText("");
              }}
              className="px-3 py-1.5 rounded-lg border border-[#DDD8CB] text-xs"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* HISTORY */}

      <div className="space-y-3">
        {dates.map((date) => {
          const attendance = records.find((r) => r.date === date);

          const dayEntries = entries.filter((e) => e.date === date);

          const worked = attendance?.clock_out
            ? getWorkedMinutes(attendance.clock_in, attendance.clock_out)
            : 0;

          const difference = attendance?.clock_out
            ? getWorkDifference(attendance.clock_in, attendance.clock_out)
            : 0;

          return (
            <div
              key={date}
              className="bg-white border border-[#E4DFD3] rounded-xl overflow-hidden"
            >
              {/* DAY HEADER */}

              <div className="px-4 py-3 bg-[#FAF9F6] border-b border-[#EDE9DF] flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{fmtDate(date)}</div>

                  {attendance?.clock_in && (
                    <div className="text-[10px] text-[#8A8374] mt-0.5">
                      {fmtTime(attendance.clock_in)}
                      {" → "}
                      {fmtTime(attendance.clock_out)}
                    </div>
                  )}
                </div>

                {attendance?.clock_out && (
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">
                      {formatDuration(worked)}
                    </div>

                    <div
                      className={`font-mono text-[10px] ${
                        difference > 0
                          ? "text-[#6B8F71]"
                          : difference < 0
                            ? "text-[#B5563A]"
                            : "text-[#9A9383]"
                      }`}
                    >
                      {difference > 0
                        ? `+${formatDuration(difference)} OT`
                        : difference < 0
                          ? `-${formatDuration(difference)} under`
                          : "8h target"}
                    </div>
                  </div>
                )}
              </div>

              {/* WORK */}

              <div className="p-3">
                {dayEntries.length === 0 ? (
                  <div className="text-xs text-[#9A9383] py-2">
                    No work logged for this day.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="group flex items-start justify-between gap-3 px-2 py-2 rounded-lg hover:bg-[#F7F5F0]"
                      >
                        <div className="flex gap-2 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3D6B7D] mt-1.5 shrink-0" />

                          <span>{entry.entry_text}</span>
                        </div>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => startEdit(entry)}
                            className="p-1.5"
                          >
                            <Pencil size={12} />
                          </button>

                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1.5 text-[#B5563A]"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmployeeLeave({ me }) {
  const { requests, submit } = useLeaveRequests(me.id, "mine");

  const [type, setType] = useState("Annual");
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  if (requests === null) return null;

  // Automatically calculate the number of leave days
  const leaveDays = calculateLeaveDays(start, end);

  const balance = me.leave_balance?.[type] ?? 0;

  const doSubmit = async () => {
    setErr("");

    if (!start || !end) {
      return setErr("Please select the start and end date.");
    }

    if (end < start) {
      return setErr("End date can't be before start date.");
    }

    if (leaveDays <= 0) {
      return setErr("Please select valid leave dates.");
    }

    if (!reason.trim()) {
      return setErr("Please add a short reason.");
    }

    if (leaveDays > balance) {
      return setErr(
        `Not enough ${type} leave balance (have ${balance}, need ${leaveDays}).`,
      );
    }

    try {
      await submit({
        type,
        startDate: start,
        endDate: end,
        days: leaveDays,
        reason: reason.trim(),
      });

      // Reset form after successful submission
      setReason("");
      setStart(todayISO());
      setEnd(todayISO());
      setType("Annual");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-5">Leave requests</h1>

      {/* ---------------- NEW REQUEST ---------------- */}

      <Card title="New leave request">
        <div className="grid md:grid-cols-4 gap-3 mb-3">
          {/* TYPE */}

          <div>
            <label className="block text-[11px] uppercase text-[#7A7362] mb-1">
              Type
            </label>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-[#E4DFD3] rounded-lg px-2.5 py-2 text-sm"
            >
              <option value="Annual">Annual</option>

              <option value="Sick">Sick</option>
            </select>

            <div className="text-[10px] text-[#9A9383] mt-1">
              Available: {balance} day
              {balance !== 1 ? "s" : ""}
            </div>
          </div>

          {/* START DATE */}

          <div>
            <label className="block text-[11px] uppercase text-[#7A7362] mb-1">
              Start date
            </label>

            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full border border-[#E4DFD3] rounded-lg px-2.5 py-2 text-sm"
            />
          </div>

          {/* END DATE */}

          <div>
            <label className="block text-[11px] uppercase text-[#7A7362] mb-1">
              End date
            </label>

            <input
              type="date"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full border border-[#E4DFD3] rounded-lg px-2.5 py-2 text-sm"
            />
          </div>

          {/* DAYS */}

          <div>
            <label className="block text-[11px] uppercase text-[#7A7362] mb-1">
              Days
            </label>

            <div className="border border-[#E4DFD3] bg-[#F5F3EE] rounded-lg px-2.5 py-2 text-sm font-mono">
              {leaveDays}
            </div>

            {leaveDays > 0 && (
              <div
                className={`text-[10px] mt-1 ${
                  leaveDays > balance ? "text-[#B5563A]" : "text-[#7A7362]"
                }`}
              >
                {leaveDays > balance
                  ? `Exceeds balance by ${leaveDays - balance} day${
                      leaveDays - balance !== 1 ? "s" : ""
                    }`
                  : `${balance - leaveDays} day${
                      balance - leaveDays !== 1 ? "s" : ""
                    } remaining`}
              </div>
            )}
          </div>
        </div>

        {/* REASON */}

        <label className="block text-[11px] uppercase text-[#7A7362] mb-1">
          Reason
        </label>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-[#3D6B7D]"
          placeholder="Brief reason for HR"
        />

        {/* ERROR */}

        {err && (
          <p className="text-[12px] text-[#B5563A] mb-3 flex items-center gap-1">
            <AlertCircle size={13} />
            {err}
          </p>
        )}

        {/* SUBMIT */}

        <button
          onClick={doSubmit}
          disabled={leaveDays <= 0 || leaveDays > balance || !reason.trim()}
          className="px-4 py-2 rounded-lg bg-[#3D6B7D] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit request
        </button>
      </Card>

      {/* ---------------- MY REQUESTS ---------------- */}

      <Card title="My requests">
        {requests.length === 0 ? (
          <EmptyState text="No leave requests yet." />
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 border border-[#EEEAE0] rounded-lg px-3 py-2.5"
              >
                <div>
                  <div className="text-sm font-medium">
                    {r.type} leave · {r.days} day
                    {r.days > 1 ? "s" : ""}
                  </div>

                  <div className="text-[12px] text-[#7A7362] font-mono">
                    {fmtDate(r.start_date)} – {fmtDate(r.end_date)}
                  </div>

                  {r.reason && (
                    <div className="text-[11px] text-[#9A9383] mt-1">
                      {r.reason}
                    </div>
                  )}
                </div>

                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ================= Admin views ================= */
function AdminOverview() {
  const { employees } = useRoster();
  const { requests: allLeave } = useLeaveRequests(null, "org");

  if (employees === null || allLeave === null) return null;

  const pendingLeave = allLeave.filter((r) => r.status === "Pending");

  const approvedLeave = allLeave.filter((r) => r.status === "Approved");

  const today = todayISO();

  return (
    <div className="space-y-5">
      {/* HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#292722]">
            Team overview
          </h1>
          <p className="text-sm text-[#7A7362] mt-1">
            A quick look at your team's attendance and leave.
          </p>
        </div>

        <div className="text-xs font-mono text-[#7A7362]">{fmtDate(today)}</div>
      </div>

      {/* MAIN STATS */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBlock label="Employees" value={employees.length} />

        <StatBlock
          label="Pending leave"
          value={pendingLeave.length}
          accent={pendingLeave.length ? "text-[#7A5A17]" : undefined}
        />

        <StatBlock
          label="Admins"
          value={employees.filter((e) => e.role === "admin").length}
        />

        <StatBlock label="Approved leave" value={approvedLeave.length} />
      </div>

      {/* TWO COLUMN AREA */}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* PENDING LEAVE */}

        <Card
          title="Leave requiring attention"
          subtitle={`${pendingLeave.length} pending request${
            pendingLeave.length !== 1 ? "s" : ""
          }`}
        >
          {pendingLeave.length === 0 ? (
            <div className="py-6 text-center">
              <div className="text-2xl mb-1">✓</div>

              <div className="text-sm font-medium">All caught up</div>

              <div className="text-xs text-[#7A7362] mt-1">
                No leave requests need your attention.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingLeave.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F6F1] px-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {r.employeeName}
                    </div>

                    <div className="text-xs text-[#7A7362] mt-0.5">
                      {r.type} · {r.days} day
                      {r.days !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-mono text-[#7A7362]">
                      {fmtDate(r.start_date)}
                    </div>

                    <StatusPill status={r.status} />
                  </div>
                </div>
              ))}

              {pendingLeave.length > 5 && (
                <div className="text-center text-xs text-[#7A7362] pt-2">
                  + {pendingLeave.length - 5} more
                </div>
              )}
            </div>
          )}
        </Card>

        {/* TEAM */}

        <Card title="Team" subtitle={`${employees.length} people`}>
          {employees.length === 0 ? (
            <EmptyState text="No employees yet." />
          ) : (
            <div className="space-y-1">
              {employees.slice(0, 6).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-[#3D6B7D] text-white flex items-center justify-center text-[10px] font-medium">
                      {e.name.slice(0, 2).toUpperCase()}
                    </span>

                    <div>
                      <div className="text-sm font-medium">{e.name}</div>

                      <div className="text-[11px] text-[#7A7362]">
                        {e.title || "Employee"}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase tracking-wide text-[#7A7362]">
                    {e.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* QUICK INFO */}

      <Card title="Quick summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-[11px] uppercase text-[#7A7362]">
              Leave requests
            </div>

            <div className="text-xl font-semibold mt-1">{allLeave.length}</div>
          </div>

          <div>
            <div className="text-[11px] uppercase text-[#7A7362]">Pending</div>

            <div className="text-xl font-semibold mt-1 text-[#7A5A17]">
              {pendingLeave.length}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase text-[#7A7362]">Approved</div>

            <div className="text-xl font-semibold mt-1">
              {approvedLeave.length}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase text-[#7A7362]">
              Team size
            </div>

            <div className="text-xl font-semibold mt-1">{employees.length}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AdminAttendance() {
  const { employees } = useRoster();

  const [sel, setSel] = useState(null);

  const { records } = useAttendance(sel);

  useEffect(() => {
    if (!sel && employees?.length) {
      setSel(employees[0].id);
    }
  }, [employees, sel]);

  if (employees === null) return null;

  const selectedEmployee = employees.find((e) => e.id === sel) || employees[0];

  const selected = sel || employees[0]?.id || null;

  const today = todayISO();

  const todayRecord = (records || []).find((r) => r.date === today) || null;

  const workedMinutes = todayRecord
    ? getWorkedMinutes(todayRecord.clock_in, todayRecord.clock_out)
    : 0;

  const difference = todayRecord?.clock_out ? workedMinutes - 8 * 60 : 0;

  return (
    <div className="space-y-5">
      {/* HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>

          <p className="text-sm text-[#7A7362] mt-1">
            Monitor attendance and working hours.
          </p>
        </div>

        <select
          value={selected || ""}
          onChange={(e) => setSel(e.target.value)}
          className="border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm bg-white min-w-[180px]"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {!selected ? (
        <EmptyState text="No employees yet." />
      ) : records === null ? null : (
        <>
          {/* TODAY */}

          <Card
            title={
              selectedEmployee
                ? `${selectedEmployee.name}'s day`
                : "Today's attendance"
            }
            subtitle={fmtDate(today)}
          >
            {!todayRecord ? (
              <div className="py-8 text-center">
                <div className="text-sm font-medium">
                  No attendance recorded today
                </div>

                <div className="text-xs text-[#7A7362] mt-1">
                  This employee has not clocked in.
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* TIMES */}

                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <div className="text-[10px] uppercase text-[#7A7362] mb-1">
                      Clock in
                    </div>

                    <div className="text-xl font-mono font-semibold text-[#6B8F71]">
                      {fmtTime(todayRecord.clock_in)}
                    </div>
                  </div>

                  <div className="text-[#BDB7AA]">→</div>

                  <div>
                    <div className="text-[10px] uppercase text-[#7A7362] mb-1">
                      Clock out
                    </div>

                    <div className="text-xl font-mono font-semibold text-[#B5563A]">
                      {todayRecord.clock_out
                        ? fmtTime(todayRecord.clock_out)
                        : "Still working"}
                    </div>
                  </div>
                </div>

                {/* STATS */}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MiniStat
                    label="Worked"
                    value={
                      todayRecord.clock_out
                        ? formatDuration(workedMinutes)
                        : "—"
                    }
                  />

                  <MiniStat label="Expected" value="8h 00m" />

                  <MiniStat
                    label={difference >= 0 ? "Overtime" : "Undertime"}
                    value={
                      todayRecord.clock_out
                        ? difference >= 0
                          ? `+${formatDuration(difference)}`
                          : `-${formatDuration(difference)}`
                        : "—"
                    }
                  />

                  <MiniStat label="Lunch" value="1h" />
                </div>
              </div>
            )}
          </Card>

          {/* HISTORY */}

          <Card
            title="Attendance history"
            subtitle={`${records.length} record${
              records.length !== 1 ? "s" : ""
            }`}
          >
            {records.length === 0 ? (
              <EmptyState text="No attendance recorded for this employee." />
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[650px]">
                  <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-3 px-3 pb-2 text-[10px] uppercase tracking-wide text-[#8C8576]">
                    <span>Date</span>
                    <span>Clock in</span>
                    <span>Clock out</span>
                    <span>Worked</span>
                    <span>Difference</span>
                  </div>

                  <div className="divide-y divide-[#EEEAE0]">
                    {records.map((r) => {
                      const worked = r.clock_out
                        ? getWorkedMinutes(r.clock_in, r.clock_out)
                        : null;

                      const diff = worked !== null ? worked - 8 * 60 : null;

                      return (
                        <div
                          key={r.id}
                          className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-3 items-center px-3 py-3 text-sm"
                        >
                          <span className="font-mono text-[#7A7362]">
                            {fmtDate(r.date)}
                          </span>

                          <span className="font-mono text-[#6B8F71]">
                            {fmtTime(r.clock_in)}
                          </span>

                          <span className="font-mono text-[#B5563A]">
                            {fmtTime(r.clock_out)}
                          </span>

                          <span>
                            {worked !== null ? formatDuration(worked) : "—"}
                          </span>

                          <span
                            className={
                              diff === null
                                ? "text-[#7A7362]"
                                : diff >= 0
                                  ? "text-[#6B8F71]"
                                  : "text-[#B5563A]"
                            }
                          >
                            {diff === null
                              ? "—"
                              : diff >= 0
                                ? `+${formatDuration(diff)}`
                                : `-${formatDuration(diff)}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function AdminLeave({ me }) {
  const { requests, decide } = useLeaveRequests(null, "org");

  const { adjustBalance } = useRoster();

  if (requests === null) return null;

  const act = async (r, status) => {
    await decide(r.id, status, me.id);

    if (status === "Approved" && r.type !== "Unpaid") {
      await adjustBalance(r.employee_id, r.type, -r.days);
    }
  };

  const pending = requests.filter((r) => r.status === "Pending");

  const decided = requests.filter((r) => r.status !== "Pending");

  return (
    <div className="space-y-5">
      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-semibold">Leave approvals</h1>

        <p className="text-sm text-[#7A7362] mt-1">
          Review and manage employee leave requests.
        </p>
      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatBlock
          label="Pending"
          value={pending.length}
          accent={pending.length ? "text-[#7A5A17]" : undefined}
        />

        <StatBlock
          label="Approved"
          value={requests.filter((r) => r.status === "Approved").length}
        />

        <StatBlock
          label="Rejected"
          value={requests.filter((r) => r.status === "Rejected").length}
        />
      </div>

      {/* PENDING */}

      <Card
        title="Pending requests"
        subtitle={`${pending.length} awaiting review`}
      >
        {pending.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-2xl mb-1">✓</div>

            <div className="text-sm font-medium">Nothing to review</div>

            <div className="text-xs text-[#7A7362] mt-1">
              All leave requests have been handled.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div
                key={r.id}
                className="border border-[#E8E3D8] rounded-xl p-4 bg-[#FCFBF8]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#3D6B7D] text-white flex items-center justify-center text-xs font-medium shrink-0">
                      {r.employeeName?.slice(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="text-sm font-semibold">
                        {r.employeeName}
                      </div>

                      <div className="text-xs text-[#7A7362] mt-0.5">
                        {r.type} leave
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => act(r, "Approved")}
                      className="px-3 py-1.5 rounded-lg bg-[#6B8F71] text-white text-xs font-medium hover:opacity-90"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => act(r, "Rejected")}
                      className="px-3 py-1.5 rounded-lg bg-[#B5563A] text-white text-xs font-medium hover:opacity-90"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {/* DETAILS */}

                <div className="grid sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-[#EEEAE0]">
                  <div>
                    <div className="text-[10px] uppercase text-[#8C8576]">
                      Dates
                    </div>

                    <div className="text-sm font-mono mt-1">
                      {fmtDate(r.start_date)} – {fmtDate(r.end_date)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase text-[#8C8576]">
                      Duration
                    </div>

                    <div className="text-sm mt-1">
                      {r.days} day
                      {r.days !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase text-[#8C8576]">
                      Reason
                    </div>

                    <div className="text-sm mt-1 text-[#5E594E]">
                      {r.reason || "No reason provided"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* HISTORY */}

      <Card
        title="Decision history"
        subtitle={`${decided.length} completed request${
          decided.length !== 1 ? "s" : ""
        }`}
      >
        {decided.length === 0 ? (
          <EmptyState text="No decisions yet." />
        ) : (
          <div className="divide-y divide-[#EEEAE0]">
            {decided.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <div className="text-sm font-medium">
                    {r.employeeName}
                    <span className="text-[#7A7362]"> · {r.type}</span>
                  </div>

                  <div className="text-[11px] text-[#7A7362] font-mono mt-0.5">
                    {fmtDate(r.start_date)} – {fmtDate(r.end_date)} · {r.days}{" "}
                    day
                    {r.days !== 1 ? "s" : ""}
                  </div>
                </div>

                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminWorklogs() {
  const { employees } = useRoster();

  const [sel, setSel] = useState(null);

  const { entries } = useWorkLogs(sel);

  const { records } = useAttendance(sel);

  useEffect(() => {
    if (!sel && employees?.length) {
      setSel(employees[0].id);
    }
  }, [employees, sel]);

  if (employees === null) return null;

  const selected = sel || employees[0]?.id || null;

  const employee = employees.find((e) => e.id === selected);

  const grouped = (entries || []).reduce((acc, e) => {
    (acc[e.date] ||= []).push(e);
    return acc;
  }, {});

  const attendanceByDate = (records || []).reduce((acc, r) => {
    acc[r.date] = r;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Work logs</h1>

          <p className="text-sm text-[#7A7362] mt-1">
            See what each employee worked on and how long they worked.
          </p>
        </div>

        <select
          value={selected || ""}
          onChange={(e) => setSel(e.target.value)}
          className="border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm bg-white min-w-[180px]"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {!selected ? (
        <EmptyState text="No employees yet." />
      ) : (
        <Card
          title={employee ? employee.name : "Employee"}
          subtitle="Work history"
        >
          {Object.keys(grouped).length === 0 ? (
            <EmptyState text="No work logged by this employee yet." />
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([date, items]) => {
                const attendance = attendanceByDate[date];

                const worked = attendance?.clock_out
                  ? getWorkedMinutes(attendance.clock_in, attendance.clock_out)
                  : null;

                const difference = worked !== null ? worked - 8 * 60 : null;

                return (
                  <div
                    key={date}
                    className="border border-[#EEEAE0] rounded-xl overflow-hidden"
                  >
                    {/* DATE HEADER */}

                    <div className="bg-[#F8F6F1] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">
                          {fmtDate(date)}
                        </div>

                        <div className="text-[11px] text-[#7A7362] mt-0.5">
                          {items.length} work log
                          {items.length !== 1 ? "s" : ""}
                        </div>
                      </div>

                      {/* HOURS */}

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[9px] uppercase text-[#8C8576]">
                            Worked
                          </div>

                          <div className="font-mono text-sm font-semibold">
                            {worked !== null ? formatDuration(worked) : "—"}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[9px] uppercase text-[#8C8576]">
                            {difference !== null && difference >= 0
                              ? "OT"
                              : "Undertime"}
                          </div>

                          <div
                            className={`font-mono text-sm font-semibold ${
                              difference === null
                                ? "text-[#7A7362]"
                                : difference >= 0
                                  ? "text-[#6B8F71]"
                                  : "text-[#B5563A]"
                            }`}
                          >
                            {difference === null
                              ? "—"
                              : difference >= 0
                                ? `+${formatDuration(difference)}`
                                : `-${formatDuration(difference)}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* WORK */}

                    <div className="px-4 py-3">
                      <div className="text-[10px] uppercase tracking-wide text-[#8C8576] mb-2">
                        Work completed
                      </div>

                      <div className="space-y-2">
                        {items.map((it) => (
                          <div key={it.id} className="flex gap-2.5 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3D6B7D] mt-2 shrink-0" />

                            <span>{it.entry_text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

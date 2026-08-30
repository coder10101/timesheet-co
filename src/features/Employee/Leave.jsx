import { useState, useMemo } from "react";
import { useLeaveRequests } from "../../hooks/useOrgData";
import { calculateLeaveDays, fmtDate, todayISO } from "../../utils/workTime";
import {
  AlertCircle,
  Pencil,
  Trash2,
  Sun,
  HeartPulse,
  Send,
  Calendar,
  Clock,
  Check,
} from "lucide-react";
import { StatusPill } from "../../components/StatusPill";
import { COLORS } from "../../constants/colors";
import { NepaliDatePicker } from "../../components/NepaliDatePicker";

const LEAVE_TYPES = {
  Annual: {
    label: "Annual Leave",
    icon: Sun,
    color: COLORS.primary,
    max: 24,
  },
  Sick: {
    label: "Sick Leave",
    icon: HeartPulse,
    color: COLORS.alert,
    max: 6,
  },
};

export function EmployeeLeave({ me }) {
  const { requests, submit, updateRequest, deleteRequest } = useLeaveRequests(
    me.id,
    "mine",
  );

  const [type, setType] = useState("Annual");
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [reason, setReason] = useState("");

  const [activeTab, setActiveTab] = useState("all");
  const [editing, setEditing] = useState(null);

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const currentType = editing ? editing.type : type;
  const currentStart = editing ? editing.start_date : start;
  const currentEnd = editing ? editing.end_date : end;
  const currentReason = editing ? editing.reason : reason;

  const balance = me.leave_balance?.[currentType] ?? 0;
  const leaveDays = calculateLeaveDays(currentStart, currentEnd);
  const isOverQuota = Number(leaveDays) > balance;

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    if (activeTab === "all") return requests;
    return requests.filter((r) => r.status === activeTab);
  }, [requests, activeTab]);

  const pendingCount = (requests || []).filter(
    (r) => r.status === "Pending",
  ).length;
  const approvedCount = (requests || []).filter(
    (r) => r.status === "Approved",
  ).length;

  if (requests === null) return null;

  const doSubmit = async () => {
    setErr("");

    if (!start || !end) return setErr("Please select start and end dates.");
    if (end < start) return setErr("End date cannot be before start date.");
    if (!reason.trim())
      return setErr("Please provide a brief reason for your leave.");

    const editDays = calculateLeaveDays(start, end);
    if (editDays <= 0) return setErr("Please select valid weekdays (Sun-Fri).");

    try {
      setSaving(true);
      await submit({
        type,
        startDate: start,
        endDate: end,
        days: editDays,
        reason: reason.trim(),
      });

      setStart(todayISO());
      setEnd(todayISO());
      setReason("");
      setErr("");
    } catch (e) {
      setErr(e.message || "Failed to submit leave request.");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (request) => {
    setErr("");
    setEditing({
      id: request.id,
      type: request.type,
      start_date: request.start_date,
      end_date: request.end_date,
      reason: request.reason || "",
      status: request.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setErr("");

    if (editing.end_date < editing.start_date) {
      return setErr("End date cannot be before start date.");
    }

    const editDays = calculateLeaveDays(editing.start_date, editing.end_date);
    if (editDays <= 0) return setErr("Please select valid weekdays.");
    if (!editing.reason.trim()) return setErr("Please provide a reason.");

    try {
      setSaving(true);
      await updateRequest(editing.id, {
        type: editing.type,
        startDate: editing.start_date,
        endDate: editing.end_date,
        days: editDays,
        reason: editing.reason.trim(),
      });

      setEditing(null);
      setErr("");
    } catch (e) {
      setErr(e.message || "Failed to update leave request.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (request) => {
    if (request.status !== "Pending") return;
    if (!window.confirm(`Delete this ${request.type} leave request?`)) return;

    try {
      setErr("");
      await deleteRequest(request.id);
    } catch (e) {
      setErr(e.message || "Failed to delete leave request.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 fade-in">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Leave Requests</h1>
          <p className="text-xs text-text-muted">
            View your balance and request time off.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 bg-warning-light text-warning px-3 py-1.5 rounded-xl text-xs font-semibold border border-warning/20 shadow-2xs">
            <Clock size={13} />
            <span>{pendingCount} pending review</span>
          </div>
        )}
      </div>

      {err && (
        <div className="px-3.5 py-2 rounded-xl bg-alert-light text-alert text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle size={14} className="shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* MINIMALIST LEAVE BALANCE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(LEAVE_TYPES).map(([leaveKey, meta]) => {
          const val = me.leave_balance?.[leaveKey] ?? 0;
          const max = meta.max;
          const used = Math.max(0, max - val);
          const Icon = meta.icon;

          return (
            <div
              key={leaveKey}
              className="bg-white border border-border rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${meta.color}15`,
                    color: meta.color,
                  }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-text">
                    {meta.label}
                  </h4>
                  <p className="text-[11px] text-text-muted">
                    {used > 0 ? `${used} used` : "0 used"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono text-base sm:text-lg font-bold text-text">
                  {val} / {max}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CLEAN INLINE LEAVE REQUEST COMPOSER */}
      <div
        className={`bg-white border rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3 transition-all ${
          editing ? "border-primary ring-2 ring-primary/20" : "border-border"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            {editing ? "Edit Leave Request" : "New Leave Request"}
          </span>
          <span
            className={`text-xs font-mono font-bold ${
              isOverQuota ? "text-alert" : "text-primary"
            }`}
          >
            {leaveDays} working {leaveDays === 1 ? "day" : "days"} (Sun–Fri)
          </span>
        </div>

        {/* CONTROLS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <select
            value={currentType}
            onChange={(e) => {
              if (editing) setEditing({ ...editing, type: e.target.value });
              else setType(e.target.value);
            }}
            className="h-10 bg-white border border-border rounded-xl px-3 text-xs font-semibold text-text outline-none focus:border-primary cursor-pointer shadow-2xs"
          >
            <option value="Annual">Annual Leave</option>
            <option value="Sick">Sick Leave</option>
          </select>

          <NepaliDatePicker
            value={currentStart}
            onChange={(d) => {
              if (editing) {
                setEditing({
                  ...editing,
                  start_date: d,
                  end_date: editing.end_date < d ? d : editing.end_date,
                });
              } else {
                setStart(d);
                if (end < d) setEnd(d);
              }
            }}
            placeholder="Start date"
          />

          <NepaliDatePicker
            value={currentEnd}
            min={currentStart}
            onChange={(d) => {
              if (editing) setEditing({ ...editing, end_date: d });
              else setEnd(d);
            }}
            placeholder="End date"
          />
        </div>

        {/* REASON & SUBMIT ROW */}
        <div className="flex items-center gap-2.5">
          <input
            type="text"
            value={currentReason}
            onChange={(e) => {
              if (editing) setEditing({ ...editing, reason: e.target.value });
              else setReason(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (editing) saveEdit();
                else doSubmit();
              }
            }}
            placeholder="Brief reason / note for HR..."
            className="flex-1 h-10 bg-surface-muted/50 focus:bg-white border border-border-light focus:border-primary rounded-xl px-3.5 text-xs text-text outline-none transition-all"
          />

          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="h-10 px-3 text-xs text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            onClick={editing ? saveEdit : doSubmit}
            disabled={saving || !currentReason.trim()}
            className="h-10 px-4 flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-40 shrink-0 cursor-pointer"
          >
            {editing ? <Check size={13} /> : <Send size={13} />}
            <span>
              {saving
                ? "Saving..."
                : editing
                  ? "Update Request"
                  : "Submit Request"}
            </span>
          </button>
        </div>

        {isOverQuota && (
          <div className="text-[11px] text-alert font-medium flex items-center gap-1.5 pt-0.5">
            <AlertCircle size={13} />
            <span>
              Quota Warning: Exceeds your remaining {currentType.toLowerCase()}{" "}
              balance by {leaveDays - balance} day(s).
            </span>
          </div>
        )}
      </div>

      {/* LEAVE HISTORY LIST */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-2xs">
        {/* TABS HEADER */}
        <div className="px-4 py-3 border-b border-border-light flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Leave History
          </h3>

          <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-border-light text-xs">
            {["all", "Pending", "Approved", "Rejected"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  activeTab === tab
                    ? "bg-white text-text shadow-2xs font-semibold"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {tab === "all" ? "All" : tab}
              </button>
            ))}
          </div>
        </div>

        {/* LIST ENTRIES */}
        {filteredRequests.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-muted">
            {activeTab === "all"
              ? "No leave requests recorded yet."
              : `No ${activeTab.toLowerCase()} requests found.`}
          </div>
        ) : (
          <div className="divide-y divide-border-light">
            {filteredRequests.map((r) => {
              const meta = LEAVE_TYPES[r.type] || LEAVE_TYPES.Annual;
              const Icon = meta.icon;

              return (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: `${meta.color}15`,
                        color: meta.color,
                      }}
                    >
                      <Icon size={14} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text">
                          {r.type} Leave
                        </span>
                        <span className="text-[11px] font-mono text-text-muted">
                          ({r.days} {r.days === 1 ? "day" : "days"})
                        </span>
                        <span className="text-text-faint">·</span>
                        <span className="text-[11px] font-mono text-text-muted">
                          {fmtDate(r.start_date)}
                          {r.start_date !== r.end_date &&
                            ` → ${fmtDate(r.end_date)}`}
                        </span>
                      </div>

                      {r.reason && (
                        <p className="text-xs text-text-muted mt-0.5 italic truncate max-w-xl">
                          "{r.reason}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <StatusPill status={r.status} />

                    {r.status === "Pending" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(r)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors cursor-pointer"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-alert hover:bg-alert-light transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

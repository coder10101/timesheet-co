import { useState, useMemo } from "react";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { StatBlock } from "../../components/StatBlock";
import { StatusPill } from "../../components/StatusPill";
import { useLeaveRequests, useRoster } from "../../hooks/useOrgData";
import { fmtDate } from "../../utils/workTime";
import {
  Check,
  X,
  AlertCircle,
  Clock,
  Sun,
  HeartPulse,
  User,
  Calendar,
  Filter,
} from "lucide-react";

export function AdminLeave({ me }) {
  const { requests, decide } = useLeaveRequests(null, "org");
  const { employees } = useRoster();

  const [actingId, setActingId] = useState(null);
  const [historyTab, setHistoryTab] = useState("all"); // "all" | "Approved" | "Rejected"

  if (requests === null || employees === null) return null;

  const act = async (r, status) => {
    setActingId(r.id);
    try {
      await decide(r.id, status, me.id);
    } finally {
      setActingId(null);
    }
  };

  const pending = (requests || []).filter((r) => r.status === "Pending");
  const decided = (requests || []).filter((r) => r.status !== "Pending");

  const filteredDecided = decided.filter((r) => {
    if (historyTab === "all") return true;
    return r.status === historyTab;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5 fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Leave Approvals</h1>
          <p className="text-xs text-text-muted mt-1">
            Review incoming time-off requests and manage employee leave allowances.
          </p>
        </div>

        {pending.length > 0 && (
          <div className="flex items-center gap-1.5 bg-warning-light text-warning px-3 py-1.5 rounded-xl text-xs font-semibold border border-warning/20">
            <Clock size={13} />
            <span>{pending.length} pending approval{pending.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatBlock
          label="Pending Review"
          value={pending.length}
          accent={pending.length ? "text-warning" : undefined}
        />
        <StatBlock
          label="Approved Requests"
          value={requests.filter((r) => r.status === "Approved").length}
        />
        <StatBlock
          label="Rejected Requests"
          value={requests.filter((r) => r.status === "Rejected").length}
        />
      </div>

      {/* TWO COLUMN / MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 items-start">
        {/* LEFT COLUMN: PENDING APPROVALS QUEUE */}
        <div className="space-y-4">
          <Card
            title="Pending Requests"
            subtitle={`${pending.length} request${pending.length !== 1 ? "s" : ""} awaiting your decision`}
          >
            {pending.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                <div className="w-10 h-10 rounded-full bg-success-light text-success flex items-center justify-center mx-auto mb-2">
                  <Check size={18} strokeWidth={2.5} />
                </div>
                <p className="text-sm font-semibold text-text">Queue is clear</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  All employee leave requests have been addressed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((r) => {
                  const emp = employees.find((e) => e.id === r.employee_id);
                  const balanceForType = emp?.leave_balance?.[r.type];
                  const insufficientBalance =
                    typeof balanceForType === "number" && balanceForType < r.days;
                  const isProcessing = actingId === r.id;

                  return (
                    <div
                      key={r.id}
                      className="border border-border rounded-2xl p-4 bg-white shadow-xs space-y-3 hover:border-border-light transition-all"
                    >
                      {/* CARD HEADER */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {r.employeeName?.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-text truncate">
                              {r.employeeName}
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                              <span className="font-medium text-text">{r.type} Leave</span>
                              <span>·</span>
                              <span>
                                Available: <strong>{balanceForType ?? 0} days</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* APPROVE / REJECT BUTTONS */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => act(r, "Approved")}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success hover:bg-success-dark text-white text-xs font-semibold shadow-xs active:scale-95 transition-all disabled:opacity-40"
                          >
                            <Check size={13} strokeWidth={2.5} />
                            Approve
                          </button>
                          <button
                            onClick={() => act(r, "Rejected")}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-alert hover:bg-alert-dark text-white text-xs font-semibold shadow-xs active:scale-95 transition-all disabled:opacity-40"
                          >
                            <X size={13} strokeWidth={2.5} />
                            Reject
                          </button>
                        </div>
                      </div>

                      {/* INSUFFICIENT BALANCE WARNING */}
                      {insufficientBalance && (
                        <div className="p-2.5 rounded-xl bg-alert-light border border-alert/20 text-alert text-xs flex items-center gap-2">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>
                            <strong>Quota Exceeded:</strong> {r.employeeName} only has {balanceForType} {r.type.toLowerCase()} day{balanceForType !== 1 ? "s" : ""} left, but requested {r.days} days.
                          </span>
                        </div>
                      )}

                      {/* DETAILS GRID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border-light text-xs">
                        <div className="bg-surface-muted/50 p-2.5 rounded-xl border border-border-light">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-text-muted block">
                            Requested Duration
                          </span>
                          <span className="font-mono font-semibold text-text mt-0.5 block">
                            {fmtDate(r.start_date)} → {fmtDate(r.end_date)} ({r.days} day{r.days !== 1 ? "s" : ""})
                          </span>
                        </div>

                        <div className="bg-surface-muted/50 p-2.5 rounded-xl border border-border-light">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-text-muted block">
                            Employee Note
                          </span>
                          <span className="text-text-muted italic mt-0.5 block truncate">
                            {r.reason ? `"${r.reason}"` : "No note provided"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* DECISION HISTORY */}
          <Card
            title="Decision History"
            subtitle={`${decided.length} past decision${decided.length !== 1 ? "s" : ""}`}
            right={
              <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-border-light text-[11px]">
                <button
                  onClick={() => setHistoryTab("all")}
                  className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                    historyTab === "all"
                      ? "bg-white text-text shadow-xs"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  All ({decided.length})
                </button>
                <button
                  onClick={() => setHistoryTab("Approved")}
                  className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                    historyTab === "Approved"
                      ? "bg-white text-success shadow-xs"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setHistoryTab("Rejected")}
                  className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                    historyTab === "Rejected"
                      ? "bg-white text-alert shadow-xs"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Rejected
                </button>
              </div>
            }
          >
            {filteredDecided.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted">
                No past decisions in this category.
              </div>
            ) : (
              <div className="divide-y divide-border-light">
                {filteredDecided.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-text">
                        {r.employeeName}
                        <span className="font-normal text-text-muted"> · {r.type} Leave</span>
                      </div>
                      <div className="text-[11px] text-text-muted font-mono mt-0.5">
                        {fmtDate(r.start_date)} – {fmtDate(r.end_date)} · {r.days} day{r.days !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: LEAVE BALANCES OVERVIEW */}
        <div>
          <Card
            title="Team Leave Balances"
            subtitle="Remaining days per employee"
          >
            <div className="divide-y divide-border-light">
              {employees.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-2.5 gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary-light text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                      {e.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-text truncate">
                        {e.name}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        {e.role}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                    <span className="flex items-center gap-1 bg-surface-muted px-2 py-0.5 rounded-md border border-border-light text-text">
                      <span className="text-[10px] font-sans text-text-muted font-normal">Annual:</span>
                      <strong>{e.leave_balance?.Annual ?? 0}</strong>
                    </span>
                    <span className="flex items-center gap-1 bg-surface-muted px-2 py-0.5 rounded-md border border-border-light text-text">
                      <span className="text-[10px] font-sans text-text-muted font-normal">Sick:</span>
                      <strong>{e.leave_balance?.Sick ?? 0}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

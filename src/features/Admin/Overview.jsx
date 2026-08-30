import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { StatBlock } from "../../components/StatBlock";
import { StatusPill } from "../../components/StatusPill";
import { useLeaveRequests, useRoster } from "../../hooks/useOrgData";
import { fmtDate, todayISO } from "../../utils/workTime";
import { isoToBSLabel } from "../../utils/nepaliCalendar";
import { Users, Clock, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import { NavLink } from "react-router-dom";

export function AdminOverview() {
  const { employees } = useRoster();
  const { requests: allLeave } = useLeaveRequests(null, "org");

  if (employees === null || allLeave === null) return null;

  const pendingLeave = allLeave.filter((r) => r.status === "Pending");
  const approvedLeave = allLeave.filter((r) => r.status === "Approved");
  const today = todayISO();

  return (
    <div className="max-w-6xl mx-auto space-y-5 fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Team Overview</h1>
          <p className="text-xs text-text-muted mt-1">
            Real-time snapshot of your company's attendance, roster, and leave pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-xs font-semibold text-text">{isoToBSLabel(today)}</span>
            <span className="text-[11px] font-mono text-text-muted block">{fmtDate(today)}</span>
          </div>
        </div>
      </div>

      {/* MAIN STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBlock label="Team Members" value={employees.length} />
        <StatBlock
          label="Pending Leave"
          value={pendingLeave.length}
          accent={pendingLeave.length ? "text-warning" : undefined}
        />
        <StatBlock
          label="Admins"
          value={employees.filter((e) => e.role === "admin").length}
        />
        <StatBlock label="Approved Leaves" value={approvedLeave.length} />
      </div>

      {/* TWO COLUMN AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* PENDING LEAVE */}
        <Card
          title="Leave Requiring Attention"
          subtitle={`${pendingLeave.length} pending request${
            pendingLeave.length !== 1 ? "s" : ""
          }`}
          right={
            pendingLeave.length > 0 && (
              <NavLink
                to="/leave-approvals"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
              >
                <span>Review all</span>
                <ArrowRight size={12} />
              </NavLink>
            )
          }
        >
          {pendingLeave.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              <div className="w-10 h-10 rounded-full bg-success-light text-success flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={18} />
              </div>
              <div className="text-sm font-semibold text-text">All caught up</div>
              <div className="text-xs text-text-muted mt-0.5">
                No leave requests need your attention right now.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingLeave.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted/50 border border-border-light px-3.5 py-3 hover:bg-surface-muted transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {r.employeeName?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-text truncate">
                        {r.employeeName}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        {r.type} Leave · {r.days} day{r.days !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-mono text-text-muted mb-1">
                      {fmtDate(r.start_date)}
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                </div>
              ))}

              {pendingLeave.length > 5 && (
                <div className="text-center text-xs text-text-muted pt-1">
                  + {pendingLeave.length - 5} more awaiting review
                </div>
              )}
            </div>
          )}
        </Card>

        {/* TEAM */}
        <Card
          title="Team Members"
          subtitle={`${employees.length} people registered`}
          right={
            <NavLink
              to="/team"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              <span>Manage team</span>
              <ArrowRight size={12} />
            </NavLink>
          }
        >
          {employees.length === 0 ? (
            <EmptyState text="No employees registered yet." />
          ) : (
            <div className="divide-y divide-border-light">
              {employees.slice(0, 6).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                      {e.name?.slice(0, 2).toUpperCase()}
                    </span>

                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-text truncate">
                        {e.name}
                      </div>
                      <div className="text-[11px] text-text-muted">
                        {e.title || "Team member"}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-md bg-surface-muted text-text-muted border border-border-light shrink-0">
                    {e.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* QUICK STATS */}
      <Card title="Quick Pipeline Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-muted/40 p-3 rounded-xl border border-border-light">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-text-muted">
              Total Requests
            </div>
            <div className="text-xl font-bold text-text mt-1">{allLeave.length}</div>
          </div>

          <div className="bg-warning-light/30 p-3 rounded-xl border border-warning/20">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-warning">
              Pending Action
            </div>
            <div className="text-xl font-bold text-warning mt-1">
              {pendingLeave.length}
            </div>
          </div>

          <div className="bg-success-light/30 p-3 rounded-xl border border-success/20">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-success">
              Approved
            </div>
            <div className="text-xl font-bold text-success mt-1">
              {approvedLeave.length}
            </div>
          </div>

          <div className="bg-surface-muted/40 p-3 rounded-xl border border-border-light">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-text-muted">
              Active Roster
            </div>
            <div className="text-xl font-bold text-text mt-1">{employees.length}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

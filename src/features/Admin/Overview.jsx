import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { StatBlock } from "../../components/StatBlock";
import { StatusPill } from "../../components/StatusPill";
import { useLeaveRequests, useRoster } from "../../hooks/useOrgData";
import { fmtDate, todayISO } from "../../utils/workTime";

export function AdminOverview() {
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
          <h1 className="text-2xl font-semibold text-text">Team overview</h1>
          <p className="text-sm text-text-muted mt-1">
            A quick look at your team's attendance and leave.
          </p>
        </div>

        <div className="text-xs font-mono text-text-muted">
          {fmtDate(today)}
        </div>
      </div>

      {/* MAIN STATS */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBlock label="Employees" value={employees.length} />

        <StatBlock
          label="Pending leave"
          value={pendingLeave.length}
          accent={pendingLeave.length ? "text-warning" : undefined}
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

              <div className="text-xs text-text-muted mt-1">
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

                    <div className="text-xs text-text-muted mt-0.5">
                      {r.type} · {r.days} day
                      {r.days !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-mono text-text-muted">
                      {fmtDate(r.start_date)}
                    </div>

                    <StatusPill status={r.status} />
                  </div>
                </div>
              ))}

              {pendingLeave.length > 5 && (
                <div className="text-center text-xs text-text-muted pt-2">
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
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-medium">
                      {e.name.slice(0, 2).toUpperCase()}
                    </span>

                    <div>
                      <div className="text-sm font-medium">{e.name}</div>

                      <div className="text-[11px] text-text-muted">
                        {e.title || "Employee"}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase tracking-wide text-text-muted">
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
            <div className="text-[11px] uppercase text-text-muted">
              Leave requests
            </div>

            <div className="text-xl font-semibold mt-1">{allLeave.length}</div>
          </div>

          <div>
            <div className="text-[11px] uppercase text-text-muted">Pending</div>

            <div className="text-xl font-semibold mt-1 text-warning">
              {pendingLeave.length}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase text-text-muted">
              Approved
            </div>

            <div className="text-xl font-semibold mt-1">
              {approvedLeave.length}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase text-text-muted">
              Team size
            </div>

            <div className="text-xl font-semibold mt-1">{employees.length}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

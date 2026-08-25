import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { StatBlock } from "../../components/StatBlock";
import { StatusPill } from "../../components/StatusPill";
import { useLeaveRequests, useRoster } from "../../hooks/useOrgData";
import { fmtDate } from "../../utils/workTime";

export function AdminLeave({ me }) {
  const { requests, decide } = useLeaveRequests(null, "org");
  const { employees } = useRoster();

  if (requests === null || employees === null) return null;

  const act = async (r, status) => {
    await decide(r.id, status, me.id);
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

      {/* BALANCES */}
      <Card title="Leave balances" subtitle="Leave remaining per employee">
        <div className="divide-y divide-[#EEEAE0]">
          {employees
            .filter((e) => e.role !== "admin" || true) // keep everyone visible; drop the `|| true` if admins should be excluded
            .map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-medium shrink-0">
                    {e.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-sm font-medium">{e.name}</div>
                </div>
                <div className="flex gap-4 text-sm font-mono">
                  <span title="Annual leave remaining">
                    <span className="text-[#7A7362] text-xs mr-1">Annual</span>
                    {e.leave_balance?.Annual ?? 0}
                  </span>
                  <span title="Sick leave remaining">
                    <span className="text-[#7A7362] text-xs mr-1">Sick</span>
                    {e.leave_balance?.Sick ?? 0}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </Card>

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
            {pending.map((r) => {
              const emp = employees.find((e) => e.id === r.employee_id);
              const balanceForType = emp?.leave_balance?.[r.type];
              const insufficientBalance =
                typeof balanceForType === "number" && balanceForType < r.days;

              return (
                <div
                  key={r.id}
                  className="border border-[#E8E3D8] rounded-xl p-4 bg-[#FCFBF8]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium shrink-0">
                        {r.employeeName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">
                          {r.employeeName}
                        </div>
                        <div className="text-xs text-[#7A7362] mt-0.5">
                          {r.type} leave
                          {typeof balanceForType === "number" && (
                            <span className="ml-1.5">
                              · {balanceForType} day
                              {balanceForType !== 1 ? "s" : ""} left
                            </span>
                          )}
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

                  {insufficientBalance && (
                    <div className="mt-3 text-xs text-[#8C3A20] bg-[#F1DAD2] border border-[#B5563A] rounded-lg px-3 py-2">
                      Heads up: {r.employeeName} only has {balanceForType}{" "}
                      {r.type} day
                      {balanceForType !== 1 ? "s" : ""} left, but this request
                      is for {r.days}.
                    </div>
                  )}

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
                        {r.days} day{r.days !== 1 ? "s" : ""}
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
              );
            })}
          </div>
        )}
      </Card>

      {/* HISTORY */}
      <Card
        title="Decision history"
        subtitle={`${decided.length} completed request${decided.length !== 1 ? "s" : ""}`}
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
                    day{r.days !== 1 ? "s" : ""}
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

import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  Check,
  X,
  ArrowRight,
  Clock,
  CalendarDays,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { getEmployeeColor } from "../../constants/colors";
import { isoToBS, NEPALI_MONTHS } from "../../utils/nepaliCalendar";
import { fmtDate } from "../../utils/workTime";

export function OverviewLeaveCard({ requests, employees, onDecide, actingId }) {
  const pendingRequests = useMemo(() => {
    return (requests || []).filter((r) => r.status === "Pending");
  }, [requests]);

  return (
    <div className="w-full bg-white border border-border rounded-2xl p-3 sm:px-3.5 sm:py-2.5 shadow-2xs space-y-2">
      {/* 1. HEADER */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border-light">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-xs font-bold text-text">
              Leave Requests
            </h3>
            <p className="text-[10px] text-text-muted">
              Pending time-off applications
            </p>
          </div>
          {pendingRequests.length > 0 && (
            <span className="text-[10px] font-mono font-bold text-warning bg-warning-light border border-warning/30 px-2 py-0.2 rounded-full">
              {pendingRequests.length} Pending
            </span>
          )}
        </div>

        <NavLink
          to="/leave-approvals"
          className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 shrink-0"
        >
          <span>View all</span>
          <ArrowRight size={12} />
        </NavLink>
      </div>

      {/* 2. BODY CONTENT: PENDING LIST OR ALL CAUGHT UP */}
      {pendingRequests.length === 0 ? (
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-surface-muted/30 border border-dashed border-border-light text-center">
          <CheckCircle2 size={15} className="text-success shrink-0" />
          <span className="text-xs font-semibold text-text">All Caught Up</span>
          <span className="text-[11px] text-text-muted">· No pending leave reviews</span>
        </div>
      ) : (
        <div className="overflow-y-auto space-y-2 max-h-[140px] pr-1 my-0.5">
          {pendingRequests.map((r) => {
            const isProcessing = actingId === r.id;
            const bsStart = r.start_date ? isoToBS(r.start_date) : null;
            const bsEnd = r.end_date ? isoToBS(r.end_date) : null;
            const emp = (employees || []).find((e) => e.id === r.employee_id);
            const maxQuota = r.type === "Sick" ? 6 : 24;
            const balance = emp?.leave_balance?.[r.type] ?? maxQuota;
            const remainingDays = Math.max(0, balance);

            return (
              <div
                key={r.id}
                className="p-2 rounded-xl bg-surface-muted/40 border border-border-light space-y-1.5 hover:border-border transition-all"
              >
                {/* APPLICANT HEADER & LEAVE TYPE */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold shrink-0 shadow-xs"
                      style={{
                        backgroundColor: getEmployeeColor(
                          r.employee_id,
                          r.employeeName,
                        ),
                      }}
                    >
                      {r.employeeName?.slice(0, 2).toUpperCase() || "EM"}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-text truncate leading-tight">
                        {r.employeeName || "Staff Member"}
                      </h4>
                      <p className="text-[9px] text-text-muted truncate">
                        {emp?.title || emp?.role || "Staff"}
                        {emp?.department ? ` · ${emp.department}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* LEAVE TYPE PILL */}
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                      r.type === "Sick"
                        ? "bg-alert-light text-alert border border-alert/20"
                        : "bg-primary-light text-primary border border-primary/20"
                    }`}
                  >
                    {r.type}
                  </span>
                </div>

                {/* DATES & DURATION */}
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <div className="flex items-center gap-1 text-text font-medium min-w-0">
                    <CalendarDays
                      size={11}
                      className="text-text-muted shrink-0"
                    />
                    <span className="truncate">
                      {bsStart
                        ? `${bsStart.day} ${NEPALI_MONTHS[bsStart.month - 1]}`
                        : fmtDate(r.start_date)}
                      {r.end_date && r.end_date !== r.start_date && (
                        <span>
                          {" → "}
                          {bsEnd
                            ? `${bsEnd.day} ${NEPALI_MONTHS[bsEnd.month - 1]}`
                            : fmtDate(r.end_date)}
                        </span>
                      )}
                    </span>
                    <span className="text-text-muted font-normal shrink-0">
                      ({r.days}d)
                    </span>
                  </div>

                  <span className="text-[9px] font-mono text-text-muted shrink-0">
                    {remainingDays}d quota left
                  </span>
                </div>

                {/* REASON IF PROVIDED */}
                {r.reason && (
                  <p className="text-[10px] text-text-muted italic truncate leading-tight">
                    "{r.reason}"
                  </p>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border-light/60">
                  <button
                    type="button"
                    onClick={() => onDecide(r.id, "Rejected")}
                    disabled={isProcessing}
                    className="px-2 py-0.5 rounded-md bg-alert-light hover:bg-alert/20 text-alert border border-alert/30 text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1 shrink-0"
                    title="Reject Leave"
                  >
                    {isProcessing ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <X size={11} strokeWidth={2.5} />
                    )}
                    <span>{isProcessing ? "..." : "Reject"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDecide(r.id, "Approved")}
                    disabled={isProcessing}
                    className="px-2 py-0.5 rounded-md bg-success-light hover:bg-success/20 text-success border border-success/30 text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1 shrink-0"
                    title="Approve Leave"
                  >
                    {isProcessing ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Check size={11} strokeWidth={2.5} />
                    )}
                    <span>{isProcessing ? "..." : "Approve"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. FOOTER */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-light text-[9px] text-text-muted">
        <span className="flex items-center gap-1">
          <Clock size={11} className="text-text-muted" />
          <span>Quick actions update roster & balance</span>
        </span>
      </div>
    </div>
  );
}

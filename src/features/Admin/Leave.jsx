import { useState, useMemo } from "react";
import { useLeaveRequests, useRoster } from "../../hooks/useOrgData";
import { fmtDate } from "../../utils/workTime";
import { isoToBS, NEPALI_MONTHS } from "../../utils/nepaliCalendar";
import {
  Check,
  X,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  CalendarDays,
  Sun,
  HeartPulse,
  Info,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getEmployeeColor, COLORS } from "../../constants/colors";

export function AdminLeave({ me }) {
  const { requests, decide } = useLeaveRequests(null, "org");
  const { employees } = useRoster();

  const [actingId, setActingId] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "Pending" | "Approved" | "Rejected"
  const [search, setSearch] = useState("");

  if (requests === null || employees === null) return null;

  const act = async (r, status) => {
    setActingId(r.id);
    try {
      await decide(r.id, status, me.id);
    } finally {
      setActingId(null);
    }
  };

  const pendingList = (requests || []).filter((r) => r.status === "Pending");
  const approvedList = (requests || []).filter((r) => r.status === "Approved");
  const rejectedList = (requests || []).filter((r) => r.status === "Rejected");

  const filteredRequests = (requests || []).filter((r) => {
    if (activeTab !== "all" && r.status !== activeTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.employeeName?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-4 fade-in pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Leave Approvals</h1>
          <p className="text-xs text-text-muted">
            Review incoming employee leave requests, check quota balances, and manage decisions.
          </p>
        </div>
      </div>

      {/* TOP 4 STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* TOTAL REQUESTS */}
        <div className="bg-white border border-border rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted">Total Requests</p>
            <p className="text-2xl font-bold text-text font-mono mt-0.5">{requests.length}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-primary-light/60 flex items-center justify-center text-primary">
            <CalendarDays size={16} />
          </div>
        </div>

        {/* PENDING */}
        <div className="bg-white border border-border rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted">Pending Review</p>
            <p className="text-2xl font-bold text-warning font-mono mt-0.5">{pendingList.length}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-warning-light/60 flex items-center justify-center text-warning">
            <Clock size={16} />
          </div>
        </div>

        {/* APPROVED */}
        <div className="bg-white border border-border rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted">Approved</p>
            <p className="text-2xl font-bold text-success font-mono mt-0.5">{approvedList.length}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-success-light/60 flex items-center justify-center text-success">
            <CheckCircle2 size={16} />
          </div>
        </div>

        {/* REJECTED */}
        <div className="bg-white border border-border rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted">Rejected</p>
            <p className="text-2xl font-bold text-alert font-mono mt-0.5">{rejectedList.length}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-alert-light/60 flex items-center justify-center text-alert">
            <X size={16} />
          </div>
        </div>
      </div>

      {/* 2-COLUMN MAIN CONTENT: REQUESTS GRID + INFORMATION PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (8 COLS): REQUESTS WITH ESSENTIAL APPROVAL METRICS */}
        <div className="lg:col-span-8 space-y-3.5">
          {/* FILTER BUTTONS & SEARCH */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1 bg-white border border-border p-1 rounded-xl shadow-2xs">
              {[
                { id: "all", label: `All (${requests.length})` },
                { id: "Pending", label: `Pending (${pendingList.length})` },
                { id: "Approved", label: `Approved (${approvedList.length})` },
                { id: "Rejected", label: `Rejected (${rejectedList.length})` },
              ].map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-primary text-white shadow-2xs font-bold"
                        : "text-text-muted hover:text-text hover:bg-surface-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* SEARCH */}
            <div className="relative w-full sm:w-52">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 bg-white border border-border rounded-xl pl-7 pr-2.5 text-xs text-text placeholder:text-text-faint focus:border-primary outline-none transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* LEAVE REQUESTS LIST */}
          {filteredRequests.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-12 text-center text-xs text-text-muted shadow-2xs">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-success" />
              <p className="font-semibold text-text">No leave requests found</p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {search ? "No applications match your search query." : "No requests in this status."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((r) => {
                const isProcessing = actingId === r.id;
                const bsStart = r.start_date ? isoToBS(r.start_date) : null;
                const bsEnd = r.end_date ? isoToBS(r.end_date) : null;
                const emp = (employees || []).find((e) => e.id === r.employee_id);
                const maxQuota = r.type === "Sick" ? 6 : 24;
                const balance = emp?.leave_balance?.[r.type] ?? maxQuota;
                const usedDays = Math.max(0, maxQuota - balance);
                const remainingDays = Math.max(0, balance);
                const isExceeding = Number(r.days) > remainingDays;

                return (
                  <div
                    key={r.id}
                    className="bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-3 hover:border-border-light transition-all"
                  >
                    {/* 1. APPLICANT & STATUS HEADER */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                          style={{ backgroundColor: getEmployeeColor(r.employee_id, r.employeeName) }}
                        >
                          {r.employeeName?.slice(0, 2).toUpperCase() || "EM"}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-text truncate">
                            {r.employeeName || "Staff Member"}
                          </h4>
                          <p className="text-xs text-text-muted truncate">
                            {emp?.title || emp?.role || "Staff"} {emp?.department && `· ${emp.department}`}
                          </p>
                        </div>
                      </div>

                      {/* STATUS BADGE */}
                      <div>
                        {r.status === "Pending" && (
                          <span className="px-2.5 py-1 rounded-lg bg-warning-light text-warning border border-warning/30 text-xs font-semibold">
                            Pending Review
                          </span>
                        )}
                        {r.status === "Approved" && (
                          <span className="px-2.5 py-1 rounded-lg bg-success-light text-success border border-success/30 text-xs font-semibold">
                            Approved
                          </span>
                        )}
                        {r.status === "Rejected" && (
                          <span className="px-2.5 py-1 rounded-lg bg-alert-light text-alert border border-alert/30 text-xs font-semibold">
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. CORE DECISION FACTORS (DATES, QUOTA, CONFLICTS) */}
                    <div className="bg-surface-muted/40 p-3 rounded-xl border border-border-light space-y-2 text-xs">
                      {/* DATE & LEAVE TYPE ROW */}
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-bold text-text">
                          {r.type} Leave · {r.days} working {r.days === 1 ? "day" : "days"}
                        </span>
                        <span className="font-mono text-xs text-text font-semibold">
                          {bsStart ? `${bsStart.day} ${NEPALI_MONTHS[bsStart.month - 1]}` : fmtDate(r.start_date)}
                          {r.end_date && r.end_date !== r.start_date && (
                            <span> → {bsEnd ? `${bsEnd.day} ${NEPALI_MONTHS[bsEnd.month - 1]}` : fmtDate(r.end_date)}</span>
                          )}
                        </span>
                      </div>

                      {/* QUOTA PREVIEW */}
                      <div className="pt-1 border-t border-border-light/70 flex items-center justify-between text-[11px]">
                        <span className="text-text-muted">Quota Balance</span>
                        <span className={`font-mono font-bold ${isExceeding ? "text-alert" : "text-text"}`}>
                          {usedDays} used · {remainingDays} remaining of {maxQuota}d
                        </span>
                      </div>
                    </div>

                    {/* 3. REASON NOTE */}
                    <div className="text-xs text-text-muted">
                      <span className="font-bold text-text">Reason:</span>{" "}
                      <span className="italic">{r.reason ? `"${r.reason}"` : "No description provided."}</span>
                    </div>

                    {/* 4. APPROVE / REJECT ACTIONS */}
                    {r.status === "Pending" && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border-light">
                        <button
                          onClick={() => act(r, "Approved")}
                          disabled={isProcessing}
                          className="flex-1 py-2 rounded-xl bg-success-light hover:bg-success-light/80 text-success border border-success/30 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Check size={14} strokeWidth={2.5} />
                          <span>{isProcessing ? "Processing..." : "Approve Leave"}</span>
                        </button>
                        <button
                          onClick={() => act(r, "Rejected")}
                          disabled={isProcessing}
                          className="flex-1 py-2 rounded-xl bg-alert-light hover:bg-alert-light/80 text-alert border border-alert/30 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <X size={14} strokeWidth={2.5} />
                          <span>{isProcessing ? "Processing..." : "Reject"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (4 COLS): SEPARATE LEAVE POLICY & INFORMATION CARD */}
        <div className="lg:col-span-4 space-y-3.5">
          {/* LEAVE POLICY GUIDELINES */}
          <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border-light">
              <ShieldCheck size={16} className="text-primary" />
              <h3 className="text-xs sm:text-sm font-bold text-text">Leave Policy & Quotas</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-surface-muted/50 border border-border-light space-y-1">
                <div className="flex items-center justify-between font-bold text-text">
                  <span>Annual Leave</span>
                  <span className="font-mono text-primary">24 Days / Year</span>
                </div>
                <p className="text-[11px] text-text-muted leading-tight">
                  For vacation, travel, and personal commitments.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-muted/50 border border-border-light space-y-1">
                <div className="flex items-center justify-between font-bold text-text">
                  <span>Sick Leave</span>
                  <span className="font-mono text-alert">6 Days / Year</span>
                </div>
                <p className="text-[11px] text-text-muted leading-tight">
                  For medical recovery and emergencies.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-muted/50 border border-border-light space-y-1">
                <div className="flex items-center justify-between font-bold text-text">
                  <span>Weekly Holiday</span>
                  <span className="font-mono text-text-muted">Saturdays</span>
                </div>
                <p className="text-[11px] text-text-muted leading-tight">
                  Saturdays are non-working days and are not deducted from leave balances.
                </p>
              </div>
            </div>
          </div>

          {/* MANAGER APPROVAL TIPS */}
          <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-2 text-xs">
            <div className="flex items-center gap-2 pb-1.5 border-b border-border-light">
              <Info size={15} className="text-primary" />
              <h4 className="font-bold text-text">Approval Workflow</h4>
            </div>
            <ul className="space-y-1.5 text-[11px] text-text-muted list-disc list-inside">
              <li>Review team overlap to maintain office coverage.</li>
              <li>Approving deducts the days directly from quota.</li>
              <li>Employees are immediately updated in real-time.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

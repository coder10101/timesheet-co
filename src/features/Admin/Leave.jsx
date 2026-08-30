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
} from "lucide-react";
import { getEmployeeColor } from "../../constants/colors";

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
    <div className="max-w-6xl mx-auto space-y-4 fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Leave Approvals</h1>
          <p className="text-xs text-text-muted">
            Review incoming employee leave applications, approve quotas, and track history.
          </p>
        </div>
      </div>

      {/* TOP 4 STAT CARDS (REFERENCE IMAGE 4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* TOTAL REQUESTS */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-semibold text-text-muted mb-1.5">
            Total Requests
          </div>
          <p className="text-2xl font-bold text-primary">{requests.length}</p>
        </div>

        {/* PENDING */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-semibold text-text-muted mb-1.5">
            Pending
          </div>
          <p className="text-2xl font-bold text-warning">{pendingList.length}</p>
        </div>

        {/* APPROVED */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-semibold text-text-muted mb-1.5">
            Approved
          </div>
          <p className="text-2xl font-bold text-success">{approvedList.length}</p>
        </div>

        {/* REJECTED */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-semibold text-text-muted mb-1.5">
            Rejected
          </div>
          <p className="text-2xl font-bold text-alert">{rejectedList.length}</p>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab("all")}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-primary text-white shadow-2xs"
                : "bg-white border border-border text-text-muted hover:text-text hover:bg-surface-muted"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("Pending")}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "Pending"
                ? "bg-primary text-white shadow-2xs"
                : "bg-white border border-border text-text-muted hover:text-text hover:bg-surface-muted"
            }`}
          >
            <span>Pending</span>
            {pendingList.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-warning text-white text-[10px] flex items-center justify-center font-bold">
                {pendingList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("Approved")}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "Approved"
                ? "bg-primary text-white shadow-2xs"
                : "bg-white border border-border text-text-muted hover:text-text hover:bg-surface-muted"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setActiveTab("Rejected")}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "Rejected"
                ? "bg-primary text-white shadow-2xs"
                : "bg-white border border-border text-text-muted hover:text-text hover:bg-surface-muted"
            }`}
          >
            Rejected
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full sm:w-64">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <input
            type="text"
            placeholder="Search by name, department, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 bg-white border border-border rounded-xl pl-8 pr-3 text-xs text-text placeholder:text-text-faint focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
          />
        </div>
      </div>

      {/* REQUESTS LIST */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center text-xs text-text-muted shadow-2xs">
          <FileText size={32} className="mx-auto mb-2 text-text-faint" />
          <p className="font-semibold text-text">No leave requests found</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {search ? "Try adjusting your search query." : "No requests in this category."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredRequests.map((r) => {
            const isProcessing = actingId === r.id;
            const bs = r.start_date ? isoToBS(r.start_date) : null;

            return (
              <div
                key={r.id}
                className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5 hover:border-border-light hover:shadow-xs transition-all flex flex-col justify-between"
              >
                {/* CARD HEADER: EMPLOYEE INFO & STATUS BADGE */}
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
                        {r.employeeName || "Unknown Member"}
                      </h4>
                      <p className="text-xs text-text-muted truncate">
                        ID: L{r.id.slice(0, 4).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* STATUS BADGE */}
                  <div>
                    {r.status === "Pending" && (
                      <span className="px-2.5 py-1 rounded-lg bg-warning-light text-warning border border-warning/30 text-xs font-semibold">
                        Pending
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

                {/* 3-COLUMN STRUCTURED METADATA */}
                <div className="grid grid-cols-3 gap-2 bg-surface-muted/50 p-2.5 rounded-xl border border-border-light text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                      Type
                    </span>
                    <span className="text-xs font-bold text-text mt-0.5 block">
                      {r.type}
                    </span>
                  </div>

                  <div className="border-x border-border-light px-1">
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                      Duration
                    </span>
                    <span className="text-xs font-bold text-text mt-0.5 block">
                      {r.days} {r.days === 1 ? "day" : "days"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                      From
                    </span>
                    <span className="text-xs font-bold text-text mt-0.5 block truncate">
                      {bs ? `${bs.day} ${NEPALI_MONTHS[bs.month - 1]}` : fmtDate(r.start_date)}
                    </span>
                  </div>
                </div>

                {/* REASON */}
                <div className="text-xs text-text-muted">
                  <span className="font-bold text-text">Reason:</span>{" "}
                  <span className="italic">{r.reason || "No description given."}</span>
                </div>

                {/* INTERACTIVE ACTION BUTTONS */}
                {r.status === "Pending" && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border-light">
                    <button
                      onClick={() => act(r, "Approved")}
                      disabled={isProcessing}
                      className="flex-1 py-2 rounded-xl bg-success-light hover:bg-success-light/80 text-success border border-success/30 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check size={13} strokeWidth={2.5} />
                      <span>{isProcessing ? "Processing..." : "Approve"}</span>
                    </button>
                    <button
                      onClick={() => act(r, "Rejected")}
                      disabled={isProcessing}
                      className="flex-1 py-2 rounded-xl bg-alert-light hover:bg-alert-light/80 text-alert border border-alert/30 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <X size={13} strokeWidth={2.5} />
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
  );
}

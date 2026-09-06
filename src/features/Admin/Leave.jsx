import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  User,
  ArrowRight,
} from "lucide-react";
import { getEmployeeColor, COLORS } from "../../constants/colors";
import {
  isHalfDayLeave,
  getHalfDaySession,
  formatLeaveDays,
  formatLeaveBalance,
  cleanLeaveReason,
  SESSION_SHORT_LABELS,
} from "../../utils/leaveUtils";
import { StatusPill } from "../../components/StatusPill";

export function AdminLeave({ me }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const urlEmpId = searchParams.get("empId");

  const [viewMode, setViewMode] = useState(
    urlTab === "employee" ? "employee" : "queue",
  ); // "queue" | "employee"

  const { requests, decide } = useLeaveRequests(null, "org");
  const { employees, staff } = useRoster();

  const staffMembers = useMemo(() => {
    if (staff && staff.length > 0) return staff;
    return employees || [];
  }, [staff, employees]);

  const [actingId, setActingId] = useState(null);

  // Queue View Filters
  const [activeTab, setActiveTab] = useState("all"); // "all" | "Pending" | "Approved" | "Rejected"
  const [search, setSearch] = useState("");
  const [queueEmpFilter, setQueueEmpFilter] = useState("all");

  // Employee View State
  const [selectedEmpId, setSelectedEmpId] = useState(urlEmpId || null);
  const [empSearch, setEmpSearch] = useState("");
  const [empTab, setEmpTab] = useState("all"); // "all" | "Approved" | "Pending" | "Rejected"
  const [empRecordSearch, setEmpRecordSearch] = useState("");

  const adminIds = useMemo(() => {
    const set = new Set();
    (employees || []).forEach((e) => {
      if (e.role?.toLowerCase() === "admin" || e.title?.toLowerCase() === "admin") {
        set.add(e.id);
      }
    });
    return set;
  }, [employees]);

  // Filter requests to regular staff only (excludes admins)
  const staffRequests = useMemo(() => {
    return (requests || []).filter((r) => {
      if (adminIds.has(r.employee_id)) return false;
      const role = r.employeeRole?.toLowerCase() || r.profiles?.role?.toLowerCase();
      const title = r.profiles?.title?.toLowerCase();
      if (role === "admin" || title === "admin") return false;
      return true;
    });
  }, [requests, adminIds]);

  if (requests === null || employees === null) return null;

  const act = async (r, status) => {
    setActingId(r.id);
    try {
      await decide(r.id, status, me?.id);
    } finally {
      setActingId(null);
    }
  };

  const pendingList = staffRequests.filter((r) => r.status === "Pending");
  const approvedList = staffRequests.filter((r) => r.status === "Approved");
  const rejectedList = staffRequests.filter((r) => r.status === "Rejected");

  // Filtered requests in Queue View
  const filteredQueueRequests = staffRequests.filter((r) => {
    if (queueEmpFilter !== "all" && r.employee_id !== queueEmpFilter) return false;
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

  // Selected employee in By Employee View
  const activeSelectedEmpId =
    selectedEmpId && (staffMembers || []).some((e) => e.id === selectedEmpId)
      ? selectedEmpId
      : staffMembers?.[0]?.id || null;

  const selectedEmployee =
    (staffMembers || []).find((e) => e.id === activeSelectedEmpId) || null;

  // Filtered employees in left roster
  const filteredEmployees = (staffMembers || []).filter((e) => {
    if (!empSearch.trim()) return true;
    const q = empSearch.toLowerCase();
    return (
      e.name?.toLowerCase().includes(q) ||
      e.role?.toLowerCase().includes(q) ||
      e.title?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  });

  // Employee stats map for quick counts in roster
  const employeeStatsMap = new Map();
  (staffMembers || []).forEach((emp) => {
    const empReqs = staffRequests.filter((r) => r.employee_id === emp.id);
    const pendingCount = empReqs.filter((r) => r.status === "Pending").length;
    const approvedCount = empReqs.filter((r) => r.status === "Approved").length;
    const annualBal = emp.leave_balance?.Annual ?? 24;
    const sickBal = emp.leave_balance?.Sick ?? 6;
    employeeStatsMap.set(emp.id, {
      annualBal,
      sickBal,
      pendingCount,
      approvedCount,
    });
  });

  // Selected employee's requests
  const selectedEmpRequests = staffRequests.filter(
    (r) => selectedEmployee && r.employee_id === selectedEmployee.id,
  );
  const selectedEmpPending = selectedEmpRequests.filter((r) => r.status === "Pending");
  const selectedEmpApproved = selectedEmpRequests.filter((r) => r.status === "Approved");
  const selectedEmpRejected = selectedEmpRequests.filter((r) => r.status === "Rejected");

  // Selected employee's quota stats
  const annualAllowance = 24;
  const sickAllowance = 6;
  const selectedAnnualBal = selectedEmployee?.leave_balance?.Annual ?? annualAllowance;
  const selectedSickBal = selectedEmployee?.leave_balance?.Sick ?? sickAllowance;
  const selectedAnnualUsed = Math.max(0, annualAllowance - selectedAnnualBal);
  const selectedSickUsed = Math.max(0, sickAllowance - selectedSickBal);
  const selectedAnnualUsedPct = Math.min(
    100,
    Math.round((selectedAnnualUsed / annualAllowance) * 100),
  );
  const selectedSickUsedPct = Math.min(
    100,
    Math.round((selectedSickUsed / sickAllowance) * 100),
  );

  const totalApprovedDays = selectedEmpApproved.reduce(
    (acc, r) => acc + (Number(r.days) || 1),
    0,
  );
  const pendingAnnualDays = selectedEmpPending
    .filter((r) => r.type === "Annual")
    .reduce((acc, r) => acc + (Number(r.days) || 1), 0);
  const pendingSickDays = selectedEmpPending
    .filter((r) => r.type === "Sick")
    .reduce((acc, r) => acc + (Number(r.days) || 1), 0);

  // Filtered requests inside selected employee's ledger
  const filteredSelectedEmpRequests = selectedEmpRequests.filter((r) => {
    if (empTab !== "all" && r.status !== empTab) return false;
    if (empRecordSearch.trim()) {
      const q = empRecordSearch.toLowerCase();
      return (
        r.type?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.start_date?.toLowerCase().includes(q) ||
        r.end_date?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleViewChange = (mode) => {
    setViewMode(mode);
    setSearchParams(mode === "employee" ? { tab: "employee" } : {});
  };

  const handleInspectEmployee = (empId) => {
    setSelectedEmpId(empId);
    setViewMode("employee");
    setSearchParams({ tab: "employee", empId });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 fade-in pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">
            {viewMode === "queue" ? "Leave Approvals" : "Employee Leave Records"}
          </h1>
          <p className="text-xs text-text-muted">
            {viewMode === "queue"
              ? "Review incoming employee leave requests, check quota balances, and manage decisions."
              : "Inspect individual employee leave counts, quota balances, and personal leave history."}
          </p>
        </div>

        {/* VIEW SELECTOR: APPROVALS QUEUE vs BY EMPLOYEE */}
        <div className="flex items-center gap-1 bg-white border border-border p-1 rounded-xl shadow-2xs self-start sm:self-auto shrink-0">
          <button
            onClick={() => handleViewChange("queue")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "queue"
                ? "bg-primary text-white shadow-2xs font-bold"
                : "text-text-muted hover:text-text hover:bg-surface-muted"
            }`}
          >
            <Clock size={14} />
            <span>Approvals Queue</span>
            {pendingList.length > 0 && (
              <span
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  viewMode === "queue"
                    ? "bg-white text-primary"
                    : "bg-warning text-white"
                }`}
              >
                {pendingList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleViewChange("employee")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "employee"
                ? "bg-primary text-white shadow-2xs font-bold"
                : "text-text-muted hover:text-text hover:bg-surface-muted"
            }`}
          >
            <Users size={14} />
            <span>By Employee</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. APPROVALS QUEUE VIEW */}
      {/* ============================================================ */}
      {viewMode === "queue" ? (
        <div className="space-y-4 fade-in">
          {/* TOP 4 STAT CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* TOTAL REQUESTS */}
            <div className="bg-white border border-border rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-muted">Total Requests</p>
                <p className="text-2xl font-bold text-text font-mono mt-0.5">{staffRequests.length}</p>
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
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-white border border-border p-1 rounded-xl shadow-2xs">
                    {[
                      { id: "all", label: `All (${staffRequests.length})` },
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

                  {/* EMPLOYEE SELECTOR DROPDOWN IN QUEUE */}
                  <select
                    value={queueEmpFilter}
                    onChange={(e) => setQueueEmpFilter(e.target.value)}
                    className="h-8 bg-white border border-border rounded-xl px-2.5 text-xs text-text outline-none focus:border-primary cursor-pointer shadow-2xs"
                  >
                    <option value="all">All Staff</option>
                    {staffMembers.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SEARCH */}
                <div className="relative w-full sm:w-48">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-8 bg-white border border-border rounded-xl pl-7 pr-2.5 text-xs text-text placeholder:text-text-faint focus:border-primary outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* LEAVE REQUESTS LIST */}
              {filteredQueueRequests.length === 0 ? (
                <div className="bg-white border border-border rounded-2xl p-12 text-center text-xs text-text-muted shadow-2xs">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-success" />
                  <p className="font-semibold text-text">No leave requests found</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {search || queueEmpFilter !== "all"
                      ? "No applications match your filter query."
                      : "No requests in this status."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQueueRequests.map((r) => {
                    const isProcessing = actingId === r.id;
                    const isHalf = isHalfDayLeave(r);
                    const session = getHalfDaySession(r);
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
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-text truncate">
                                  {r.employeeName || "Staff Member"}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => handleInspectEmployee(r.employee_id)}
                                  className="text-[11px] text-primary hover:text-primary-dark font-medium flex items-center gap-0.5 transition-colors cursor-pointer"
                                  title="Inspect employee leave counts and records"
                                >
                                  <span>View Balances</span>
                                  <ArrowRight size={11} />
                                </button>
                              </div>
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-text">
                                {r.type} Leave · {formatLeaveDays(r.days)}
                              </span>
                              {isHalf && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                  {SESSION_SHORT_LABELS[session] || "Half Day"}
                                </span>
                              )}
                            </div>
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
                              {formatLeaveBalance(usedDays)} used · {formatLeaveBalance(remainingDays)} remaining of {maxQuota}d
                            </span>
                          </div>
                        </div>

                        {/* 3. REASON NOTE */}
                        <div className="text-xs text-text-muted">
                          <span className="font-bold text-text">Reason:</span>{" "}
                          <span className="italic">
                            {cleanLeaveReason(r.reason)
                              ? `"${cleanLeaveReason(r.reason)}"`
                              : "No description provided."}
                          </span>
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
                      <span>Half-Day Leaves</span>
                      <span className="font-mono text-primary">0.5 Day</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-tight">
                      Available in Morning (10 AM–2 PM) or Afternoon (2 PM–6 PM) shifts with a 4-hour target.
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
      ) : (
        /* ============================================================ */
        /* 2. BY EMPLOYEE (INDIVIDUAL LEAVE COUNTS & HISTORY) VIEW */
        /* ============================================================ */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start fade-in">
          {/* LEFT COLUMN: EMPLOYEES ROSTER (4 COLS) */}
          <div className="lg:col-span-4 bg-white border border-border rounded-2xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Employees
              </span>
              <span className="text-[11px] text-text-muted font-mono font-medium">
                {staffMembers.length} staff
              </span>
            </div>

            {/* SEARCH */}
            <div className="h-9 flex items-center gap-1.5 bg-surface-muted border border-border-light rounded-xl px-2.5 text-xs focus-within:border-primary">
              <Search size={13} className="text-text-muted shrink-0" />
              <input
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                placeholder="Search team..."
                className="w-full bg-transparent outline-none text-text text-xs placeholder:text-text-faint"
              />
            </div>

            {/* EMPLOYEE LIST */}
            <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-0.5">
              {filteredEmployees.map((emp) => {
                const isSelected = emp.id === activeSelectedEmpId;
                const stats = employeeStatsMap.get(emp.id) || {
                  annualBal: 24,
                  sickBal: 6,
                  pendingCount: 0,
                };

                return (
                  <button
                    key={emp.id}
                    onClick={() => handleInspectEmployee(emp.id)}
                    className={`w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-white hover:bg-surface-muted/60 border-border-light text-text"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs ${
                          isSelected ? "ring-2 ring-white/30" : ""
                        }`}
                        style={{
                          backgroundColor: getEmployeeColor(emp.id, emp.name),
                        }}
                      >
                        {emp.name?.slice(0, 2).toUpperCase() || "EM"}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-bold truncate leading-tight ${
                            isSelected ? "text-white" : "text-text"
                          }`}
                        >
                          {emp.name}
                        </p>
                        <p
                          className={`text-[10px] truncate mt-0.5 ${
                            isSelected ? "text-white/70" : "text-text-muted"
                          }`}
                        >
                          {emp.title || emp.role || "Staff"}
                          {emp.department && ` · ${emp.department}`}
                        </p>
                      </div>
                    </div>

                    {/* RIGHT BADGES: QUOTA BALANCE & PENDING INDICATOR */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? "bg-white/20 text-white font-bold"
                            : "bg-surface-muted text-text-muted border border-border-light"
                        }`}
                      >
                        {stats.annualBal}A · {stats.sickBal}S
                      </span>
                      {stats.pendingCount > 0 && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? "bg-warning text-[#011E26]"
                              : "bg-warning-light text-warning border border-warning/30"
                          }`}
                        >
                          {stats.pendingCount} pending
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: SELECTED EMPLOYEE'S LEAVE COUNT & LEDGER (8 COLS) */}
          <div className="lg:col-span-8 space-y-3.5">
            {!selectedEmployee ? (
              <div className="bg-white border border-border rounded-2xl p-12 text-center text-xs text-text-muted shadow-2xs">
                <Users size={32} className="mx-auto mb-2 text-text-faint" />
                <p className="font-semibold text-text">Select an employee</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Choose a team member from the roster to view their leave count and records.
                </p>
              </div>
            ) : (
              <>
                {/* 1. EMPLOYEE SUMMARY HEADER */}
                <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-xs"
                      style={{
                        backgroundColor: getEmployeeColor(
                          selectedEmployee.id,
                          selectedEmployee.name,
                        ),
                      }}
                    >
                      {selectedEmployee.name?.slice(0, 2).toUpperCase() || "EM"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-text truncate">
                          {selectedEmployee.name}
                        </h2>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-muted border border-border-light text-text-muted capitalize">
                          {selectedEmployee.role || "Staff"}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {selectedEmployee.title || selectedEmployee.role || "Staff"}
                        {selectedEmployee.department && ` · ${selectedEmployee.department}`}
                        {selectedEmployee.email && ` · ${selectedEmployee.email}`}
                      </p>
                    </div>
                  </div>

                  {/* QUICK STATS */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-surface-muted/60 border border-border-light text-right">
                      <p className="text-[10px] text-text-muted font-medium">Total Approved</p>
                      <p className="text-xs font-bold text-text font-mono">
                        {formatLeaveBalance(totalApprovedDays)} days taken
                      </p>
                    </div>
                    {selectedEmpPending.length > 0 && (
                      <div className="px-3 py-1.5 rounded-xl bg-warning-light/60 border border-warning/30 text-right">
                        <p className="text-[10px] text-warning font-medium">Pending Review</p>
                        <p className="text-xs font-bold text-warning font-mono">
                          {selectedEmpPending.length} request(s)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. LEAVE COUNT & QUOTA CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* ANNUAL LEAVE CARD */}
                  <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary-light/60 text-primary flex items-center justify-center">
                          <Sun size={17} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-text">Annual Leave</h3>
                          <p className="text-[10px] text-text-muted">Quota: {annualAllowance} days / year</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold font-mono text-primary">
                          {formatLeaveBalance(selectedAnnualBal)}
                        </span>
                        <span className="text-xs font-semibold text-text-muted"> / {annualAllowance}d</span>
                        <p className="text-[9px] uppercase tracking-wider text-text-muted font-medium">Available</p>
                      </div>
                    </div>

                    {/* PROGRESS BAR & STATS */}
                    <div className="space-y-1.5 pt-1">
                      <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${selectedAnnualUsedPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
                        <span>{formatLeaveBalance(selectedAnnualUsed)}d used ({selectedAnnualUsedPct}%)</span>
                        {pendingAnnualDays > 0 ? (
                          <span className="text-warning font-semibold">+{formatLeaveBalance(pendingAnnualDays)}d pending</span>
                        ) : (
                          <span>{formatLeaveBalance(selectedAnnualBal)}d remaining</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SICK LEAVE CARD */}
                  <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-alert-light/60 text-alert flex items-center justify-center">
                          <HeartPulse size={17} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-text">Sick Leave</h3>
                          <p className="text-[10px] text-text-muted">Quota: {sickAllowance} days / year</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold font-mono text-alert">
                          {formatLeaveBalance(selectedSickBal)}
                        </span>
                        <span className="text-xs font-semibold text-text-muted"> / {sickAllowance}d</span>
                        <p className="text-[9px] uppercase tracking-wider text-text-muted font-medium">Available</p>
                      </div>
                    </div>

                    {/* PROGRESS BAR & STATS */}
                    <div className="space-y-1.5 pt-1">
                      <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-alert rounded-full transition-all duration-300"
                          style={{ width: `${selectedSickUsedPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
                        <span>{formatLeaveBalance(selectedSickUsed)}d used ({selectedSickUsedPct}%)</span>
                        {pendingSickDays > 0 ? (
                          <span className="text-warning font-semibold">+{formatLeaveBalance(pendingSickDays)}d pending</span>
                        ) : (
                          <span>{formatLeaveBalance(selectedSickBal)}d remaining</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. SELECTED EMPLOYEE'S LEAVE RECORDS & HISTORY */}
                <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-2xs">
                  {/* TABS & SEARCH HEADER */}
                  <div className="p-3 sm:p-3.5 border-b border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-border-light text-xs overflow-x-auto max-w-full">
                      {[
                        { id: "all", label: `All (${selectedEmpRequests.length})` },
                        { id: "Approved", label: `Approved (${selectedEmpApproved.length})` },
                        { id: "Pending", label: `Pending (${selectedEmpPending.length})` },
                        { id: "Rejected", label: `Rejected (${selectedEmpRejected.length})` },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setEmpTab(tab.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            empTab === tab.id
                              ? "bg-white text-text shadow-2xs font-bold"
                              : "text-text-muted hover:text-text"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-48">
                      <Search
                        size={12}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                      />
                      <input
                        type="text"
                        placeholder="Filter records..."
                        value={empRecordSearch}
                        onChange={(e) => setEmpRecordSearch(e.target.value)}
                        className="w-full h-8 bg-surface-muted/40 border border-border-light rounded-xl pl-7 pr-2.5 text-xs text-text placeholder:text-text-faint focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* LIST OF LEAVE RECORDS */}
                  {filteredSelectedEmpRequests.length === 0 ? (
                    <div className="p-10 text-center text-xs text-text-muted">
                      <CalendarDays size={28} className="mx-auto mb-2 text-text-faint opacity-60" />
                      <p className="font-semibold text-text">No leave records found</p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {empRecordSearch
                          ? "No records match your filter criteria."
                          : empTab === "all"
                            ? `${selectedEmployee.name} has not submitted any leave applications yet.`
                            : `No ${empTab.toLowerCase()} leave records for this employee.`}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border-light">
                      {filteredSelectedEmpRequests.map((r) => {
                        const isProcessing = actingId === r.id;
                        const isHalf = isHalfDayLeave(r);
                        const session = getHalfDaySession(r);
                        const bsStart = r.start_date ? isoToBS(r.start_date) : null;
                        const bsEnd = r.end_date ? isoToBS(r.end_date) : null;

                        return (
                          <div
                            key={r.id}
                            className="p-3.5 sm:p-4 hover:bg-surface-muted/20 transition-colors space-y-2.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              {/* TYPE & DATES */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-text">
                                  {r.type} Leave
                                </span>
                                <span className="text-xs font-mono font-semibold text-text-muted">
                                  ({formatLeaveDays(r.days)})
                                </span>
                                {isHalf && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                    {SESSION_SHORT_LABELS[session] || "Half Day"}
                                  </span>
                                )}
                                <span className="text-text-faint">·</span>
                                <span className="font-mono text-xs text-text font-semibold">
                                  {bsStart ? `${bsStart.day} ${NEPALI_MONTHS[bsStart.month - 1]}` : fmtDate(r.start_date)}
                                  {r.end_date && r.end_date !== r.start_date && (
                                    <span> → {bsEnd ? `${bsEnd.day} ${NEPALI_MONTHS[bsEnd.month - 1]}` : fmtDate(r.end_date)}</span>
                                  )}
                                </span>
                                <span className="text-[11px] font-mono text-text-muted">
                                  ({fmtDate(r.start_date)}
                                  {r.end_date && r.end_date !== r.start_date && ` - ${fmtDate(r.end_date)}`})
                                </span>
                              </div>

                              {/* STATUS PILL */}
                              <div className="shrink-0">
                                <StatusPill status={r.status} />
                              </div>
                            </div>

                            {/* REASON */}
                            {cleanLeaveReason(r.reason) && (
                              <p className="text-xs text-text-muted italic bg-surface-muted/40 p-2 rounded-xl border border-border-light">
                                "{cleanLeaveReason(r.reason)}"
                              </p>
                            )}

                            {/* ACTION BUTTONS IF PENDING */}
                            {r.status === "Pending" && (
                              <div className="flex items-center gap-2 pt-1 border-t border-border-light">
                                <button
                                  onClick={() => act(r, "Approved")}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 rounded-xl bg-success-light hover:bg-success-light/80 text-success border border-success/30 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                                >
                                  <Check size={13} strokeWidth={2.5} />
                                  <span>{isProcessing ? "Processing..." : "Approve Leave"}</span>
                                </button>
                                <button
                                  onClick={() => act(r, "Rejected")}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 rounded-xl bg-alert-light hover:bg-alert-light/80 text-alert border border-alert/30 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1"
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

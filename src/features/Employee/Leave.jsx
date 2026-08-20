import { useState } from "react";
import { useLeaveRequests } from "../../hooks/useOrgData";
import { calculateLeaveDays, fmtDate, todayISO } from "../../utils/workTime";
import { AlertCircle } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { StatusPill } from "../../components/StatusPill";

export function EmployeeLeave({ me }) {
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

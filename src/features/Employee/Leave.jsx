import { useState } from "react";
import { useLeaveRequests } from "../../hooks/useOrgData";
import { calculateLeaveDays, fmtDate, todayISO } from "../../utils/workTime";
import { AlertCircle, Pencil, Trash2, X } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { StatusPill } from "../../components/StatusPill";

export function EmployeeLeave({ me }) {
  const { requests, submit, updateRequest, deleteRequest } = useLeaveRequests(
    me.id,
    "mine",
  );

  const [type, setType] = useState("Annual");
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [reason, setReason] = useState("");

  const [editing, setEditing] = useState(null);

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  if (requests === null) return null;

  const balance = me.leave_balance?.[type] ?? 0;
  const leaveDays = calculateLeaveDays(start, end);

  // ------------------------------------------
  // SUBMIT
  // ------------------------------------------

  const doSubmit = async () => {
    setErr("");

    if (!start || !end) {
      return setErr("Please select the start and end date.");
    }

    if (end < start) {
      return setErr("End date can't be before start date.");
    }

    if (!reason.trim()) {
      return setErr("Please add a short reason.");
    }

    const editDays = calculateLeaveDays(start, end);

    try {
      setSaving(true);

      await submit({
        type,
        startDate: start,
        endDate: end,
        days: editDays,
        reason: reason.trim(),
      });

      setType("Annual");
      setStart(todayISO());
      setEnd(todayISO());
      setReason("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------
  // OPEN EDIT
  // ------------------------------------------

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
  };

  // ------------------------------------------
  // SAVE EDIT
  // ------------------------------------------

  const saveEdit = async () => {
    if (!editing) return;

    setErr("");

    const editDays = calculateLeaveDays(editing.start_date, editing.end_date);

    console.log("SAVING EDIT:", {
      id: editing.id,
      start_date: editing.start_date,
      end_date: editing.end_date,
      days: editDays,
    });

    if (editing.end_date < editing.start_date) {
      return setErr("End date can't be before start date.");
    }

    if (editDays <= 0) {
      return setErr("Please select valid leave dates.");
    }

    if (!editing.reason.trim()) {
      return setErr("Please add a short reason.");
    }

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
      console.error("SAVE EDIT ERROR:", e);
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------
  // DELETE
  // ------------------------------------------

  const handleDelete = async (request) => {
    if (request.status !== "Pending") {
      return;
    }

    const confirmed = window.confirm(
      `Delete this ${request.type} leave request?`,
    );

    if (!confirmed) return;

    try {
      setErr("");

      await deleteRequest(request.id);
    } catch (e) {
      setErr(e.message);
    }
  };
  return (
    <div className="space-y-5">
      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-semibold">Leave requests</h1>

        <p className="text-sm text-[#7A7362] mt-1">
          Request time off and manage your leave.
        </p>
      </div>

      {/* ======================================
          NEW REQUEST
      ====================================== */}

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
              className="w-full border border-[#E4DFD3] rounded-lg px-2.5 py-2 text-sm bg-white"
            >
              <option value="Annual">Annual</option>

              <option value="Sick">Sick</option>
            </select>

            <div className="text-[10px] text-[#7A7362] mt-1">
              {Number(leaveDays) > balance ? "Extra leave:" : "Available:"}
              <span className="font-medium text-[#292722]">
                {balance} day
                {balance !== 1 ? "s" : ""}
              </span>
            </div>
            {Number(leaveDays) > balance && (
              <p className="text-[11px] text-alert mt-2 flex items-center gap-1">
                <AlertCircle size={12} />
                This exceeds your available {type} balance — it'll go negative
                if approved.
              </p>
            )}
          </div>

          {/* START */}

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

          {/* END */}

          <div>
            <label className="block text-[11px] uppercase text-[#7A7362] mb-1">
              End date
            </label>

            <input
              type="date"
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full border border-[#E4DFD3] rounded-lg px-2.5 py-2 text-sm"
            />
          </div>

          {/* DAYS */}
          <div>
            <label className="block text-[11px] uppercase text-[#7A7362] mb-1">
              Days
            </label>

            <div className="border border-[#E4DFD3] bg-[#F5F3EE] rounded-lg px-2.5 py-2 text-sm font-mono text-[#6B6A62] cursor-not-allowed">
              {leaveDays}
            </div>
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
          className="w-full border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-primary"
          placeholder="Brief reason for HR"
        />

        {/* ERROR */}

        {err && (
          <p className="text-[12px] text-alert mb-3 flex items-center gap-1">
            <AlertCircle size={13} />
            {err}
          </p>
        )}

        {/* SUBMIT */}

        <button
          onClick={doSubmit}
          disabled={saving || !reason.trim()}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Submitting..." : "Submit request"}
        </button>
      </Card>

      {/* ======================================
          REQUEST HISTORY
      ====================================== */}

      <Card
        title="My requests"
        subtitle={`${requests.length} request${
          requests.length !== 1 ? "s" : ""
        }`}
      >
        {requests.length === 0 ? (
          <EmptyState text="No leave requests yet." />
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-[#EEEAE0] rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {r.type} leave · {r.days} day
                    {r.days !== 1 ? "s" : ""}
                  </div>

                  <div className="text-[12px] text-[#7A7362] font-mono mt-0.5">
                    {fmtDate(r.start_date)} – {fmtDate(r.end_date)}
                  </div>

                  {r.reason && (
                    <div className="text-[11px] text-[#9A9383] mt-1">
                      {r.reason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <StatusPill status={r.status} />

                  {r.status === "Pending" && (
                    <>
                      <button
                        onClick={() => openEdit(r)}
                        title="Edit request"
                        className="p-1.5 rounded-lg text-[#6B6A62] hover:bg-[#F5F3EE]"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        onClick={() => handleDelete(r)}
                        title="Delete request"
                        className="p-1.5 rounded-lg text-alert hover:bg-[#FDEDEA]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ======================================
          EDIT MODAL
      ====================================== */}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Edit leave request</h2>

                <p className="text-xs text-[#7A7362] mt-1">
                  Only pending requests can be edited.
                </p>
              </div>

              <button
                onClick={() => setEditing(null)}
                className="p-1 rounded-lg hover:bg-[#F5F3EE]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* TYPE */}

              <div>
                <label className="block text-[11px] uppercase text-[#7A7362] mb-1">
                  Type
                </label>

                <select
                  value={editing.type}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      type: e.target.value,
                    })
                  }
                  className="w-full border border-[#E4DFD3] rounded-lg px-2.5 py-2 text-sm bg-white"
                >
                  <option value="Annual">Annual</option>

                  <option value="Sick">Sick</option>
                </select>
              </div>

              {/* DAYS */}

              <div>
                <label className="block text-[11px] uppercase text-[#7A7362] mb-1">
                  Days
                </label>

                <div className="border border-[#E4DFD3] bg-[#F5F3EE] rounded-lg px-2.5 py-2 text-sm font-mono text-[#6B6A62] cursor-not-allowed">
                  {calculateLeaveDays(editing.start_date, editing.end_date)}
                </div>
              </div>

              {/* START */}

              <div>
                <label className="block text-[11px] uppercase text-[#7A7362] mb-1">
                  Start date
                </label>

                <input
                  type="date"
                  value={editing.start_date}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      start_date: e.target.value,
                    })
                  }
                  className="w-full border border-[#E4DFD3] rounded-lg px-2.5 py-2 text-sm"
                />
              </div>

              {/* END */}

              <div>
                <label className="block text-[11px] uppercase text-[#7A7362] mb-1">
                  End date
                </label>

                <input
                  type="date"
                  min={editing.start_date}
                  value={editing.end_date}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      end_date: e.target.value,
                    })
                  }
                  className="w-full border border-[#E4DFD3] rounded-lg px-2.5 py-2 text-sm"
                />
              </div>
            </div>

            {/* REASON */}

            <label className="block text-[11px] uppercase text-[#7A7362] mb-1 mt-3">
              Reason
            </label>

            <textarea
              value={editing.reason || ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  reason: e.target.value,
                })
              }
              rows={3}
              className="w-full border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
            />

            {err && (
              <p className="text-[12px] text-alert mt-3 flex items-center gap-1">
                <AlertCircle size={13} />
                {err}
              </p>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-2 rounded-lg border border-[#E4DFD3] text-sm"
              >
                Cancel
              </button>

              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

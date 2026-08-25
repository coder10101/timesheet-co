import { useState } from "react";
import { useAttendance } from "../../hooks/useOrgData";
import {
  fmtDate,
  fmtTime,
  formatDuration,
  getWorkDifference,
  getWorkedMinutes,
} from "../../utils/workTime";
import { toNepalDateTimeLocal } from "../../utils/timezone";
import { MiniStat } from "../../components/MiniStat";
import { Pencil } from "lucide-react";

export function EmployeeAttendance({ me }) {
  const { records, updateAttendance } = useAttendance(me.id);

  const [editing, setEditing] = useState(null);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  if (records === null) {
    return null;
  }

  const presentRecords = records.filter((r) => r.clock_in);

  const totalWorked = presentRecords.reduce(
    (sum, record) => sum + getWorkedMinutes(record.clock_in, record.clock_out),
    0,
  );

  const totalDifference = presentRecords.reduce((sum, record) => {
    if (!record.clock_in || !record.clock_out) {
      return sum;
    }

    const difference = getWorkDifference(record.clock_in, record.clock_out);

    if (Number.isNaN(difference)) {
      return sum;
    }

    return sum + difference;
  }, 0);

  const startEdit = (record) => {
    setError("");

    setEditing({
      id: record.id,

      clockIn: toNepalDateTimeLocal(record.clock_in),

      clockOut: toNepalDateTimeLocal(record.clock_out),
    });
  };

  const saveEdit = async () => {
    setSaving(true);
    setError("");

    try {
      await updateAttendance(editing.id, {
        clockIn: editing.clockIn,
        clockOut: editing.clockOut,
      });

      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Attendance</h1>

        <p className="text-xs text-[#7A7362] mt-1">
          Your attendance and working hours
        </p>
      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-3 gap-3 mb-5">
        <MiniStat label="Days present" value={presentRecords.length} />

        <MiniStat label="Hours worked" value={formatDuration(totalWorked)} />

        <MiniStat
          label={totalDifference >= 0 ? "Overtime" : "Undertime"}
          value={
            totalDifference >= 0
              ? `+${formatDuration(totalDifference)}`
              : `-${formatDuration(totalDifference)}`
          }
        />
      </div>

      {/* NOTE */}

      <div className="mb-4 px-3 py-2 rounded-lg bg-[#F5F3EE] text-[11px] text-[#7A7362]">
        Working hours are calculated from clock-in to clock-out, with a 1-hour
        lunch automatically deducted.
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-alert-light text-alert text-xs">
          {error}
        </div>
      )}

      {/* RECORDS */}

      <div className="bg-white border border-[#E4DFD3] rounded-xl overflow-hidden">
        {records.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#7A7362]">
            No attendance records yet.
          </div>
        ) : (
          records.map((record) => {
            const worked = getWorkedMinutes(record.clock_in, record.clock_out);

            const difference = getWorkDifference(
              record.clock_in,
              record.clock_out,
            );

            const isEditing = editing?.id === record.id;

            return (
              <div
                key={record.id}
                className="border-b border-[#EDE9DF] last:border-0"
              >
                {!isEditing ? (
                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="w-28 shrink-0">
                      <div className="text-xs font-medium">
                        {fmtDate(record.date)}
                      </div>

                      <div className="text-[10px] text-[#9A9383] mt-0.5">
                        {record.clock_in ? "Present" : "Absent"}
                      </div>
                    </div>

                    <div className="font-mono text-xs">
                      {fmtTime(record.clock_in)}
                      <span className="mx-2 text-[#B6B0A2]">→</span>
                      {fmtTime(record.clock_out)}
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs font-medium">
                        {record.clock_out
                          ? formatDuration(worked)
                          : "In progress"}
                      </div>

                      <div
                        className={`font-mono text-[10px] ${
                          difference > 0
                            ? "text-success"
                            : difference < 0
                              ? "text-alert"
                              : "text-[#9A9383]"
                        }`}
                      >
                        {record.clock_out
                          ? difference > 0
                            ? `+${formatDuration(difference)}`
                            : difference < 0
                              ? `-${formatDuration(difference)}`
                              : "On target"
                          : ""}
                      </div>
                    </div>

                    <button
                      onClick={() => startEdit(record)}
                      className="p-2 rounded-lg hover:bg-[#F5F3EE]"
                      title="Edit attendance"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-4 bg-[#FAF9F6]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-semibold">
                        Edit attendance · {fmtDate(record.date)}
                      </div>

                      <div className="text-[10px] text-[#9A9383]">
                        Date cannot be changed
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <label className="text-[11px] text-[#7A7362]">
                        Clock in
                        <input
                          type="datetime-local"
                          value={editing.clockIn}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              clockIn: e.target.value,
                            })
                          }
                          className="mt-1 w-full border border-[#DDD8CB] rounded-lg px-3 py-2 text-xs"
                        />
                      </label>

                      <label className="text-[11px] text-[#7A7362]">
                        Clock out
                        <input
                          type="datetime-local"
                          value={editing.clockOut}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              clockOut: e.target.value,
                            })
                          }
                          className="mt-1 w-full border border-[#DDD8CB] rounded-lg px-3 py-2 text-xs"
                        />
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-40"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>

                      <button
                        onClick={() => setEditing(null)}
                        className="px-3 py-1.5 rounded-lg border border-[#DDD8CB] text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

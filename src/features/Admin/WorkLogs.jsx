import { useEffect, useState } from "react";
import { useAttendance, useRoster, useWorkLogs } from "../../hooks/useOrgData";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import {
  fmtDate,
  formatDuration,
  getWorkedMinutes,
} from "../../utils/workTime";

export function AdminWorklogs() {
  const { employees } = useRoster();

  const [sel, setSel] = useState(null);

  const { entries } = useWorkLogs(sel);

  const { records } = useAttendance(sel);

  useEffect(() => {
    if (!sel && employees?.length) {
      setSel(employees[0].id);
    }
  }, [employees, sel]);

  if (employees === null) return null;

  const selected = sel || employees[0]?.id || null;

  const employee = employees.find((e) => e.id === selected);

  const grouped = (entries || []).reduce((acc, e) => {
    (acc[e.date] ||= []).push(e);
    return acc;
  }, {});

  const attendanceByDate = (records || []).reduce((acc, r) => {
    acc[r.date] = r;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Work logs</h1>

          <p className="text-sm text-text-muted mt-1">
            See what each employee worked on and how long they worked.
          </p>
        </div>

        <select
          value={selected || ""}
          onChange={(e) => setSel(e.target.value)}
          className="border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm bg-white min-w-[180px]"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {!selected ? (
        <EmptyState text="No employees yet." />
      ) : (
        <Card
          title={employee ? employee.name : "Employee"}
          subtitle="Work history"
        >
          {Object.keys(grouped).length === 0 ? (
            <EmptyState text="No work logged by this employee yet." />
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([date, items]) => {
                const attendance = attendanceByDate[date];

                const worked = attendance?.clock_out
                  ? getWorkedMinutes(attendance.clock_in, attendance.clock_out)
                  : null;

                const difference = worked !== null ? worked - 8 * 60 : null;

                return (
                  <div
                    key={date}
                    className="border border-border rounded-xl overflow-hidden"
                  >
                    {/* DATE HEADER */}

                    <div className="bg-[#F8F6F1] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">
                          {fmtDate(date)}
                        </div>

                        <div className="text-[11px] text-text-muted mt-0.5">
                          {items.length} work log
                          {items.length !== 1 ? "s" : ""}
                        </div>
                      </div>

                      {/* HOURS */}

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[9px] uppercase text-[#8C8576]">
                            Worked
                          </div>

                          <div className="font-mono text-sm font-semibold">
                            {worked !== null ? formatDuration(worked) : "—"}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[9px] uppercase text-[#8C8576]">
                            {difference !== null && difference >= 0
                              ? "OT"
                              : "Undertime"}
                          </div>

                          <div
                            className={`font-mono text-sm font-semibold ${
                              difference === null
                                ? "text-text-muted"
                                : difference >= 0
                                  ? "text-success"
                                  : "text-alert"
                            }`}
                          >
                            {difference === null
                              ? "—"
                              : difference >= 0
                                ? `+${formatDuration(difference)}`
                                : `-${formatDuration(difference)}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* WORK */}

                    <div className="px-4 py-3">
                      <div className="text-[10px] uppercase tracking-wide text-[#8C8576] mb-2">
                        Work completed
                      </div>

                      <div className="space-y-2">
                        {items.map((it) => (
                          <div key={it.id} className="flex gap-2.5 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />

                            <span>{it.entry_text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

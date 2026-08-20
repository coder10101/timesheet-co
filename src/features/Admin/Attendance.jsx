import { useEffect, useState } from "react";
import { useRoster, useAttendance } from "../../hooks/useOrgData";
import {
  fmtDate,
  fmtTime,
  formatDuration,
  getWorkedMinutes,
  todayISO,
} from "../../utils/workTime";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { MiniStat } from "../../components/MiniStat";

export function AdminAttendance() {
  const { employees } = useRoster();

  const [sel, setSel] = useState(null);

  const { records } = useAttendance(sel);

  useEffect(() => {
    if (!sel && employees?.length) {
      setSel(employees[0].id);
    }
  }, [employees, sel]);

  if (employees === null) return null;

  const selectedEmployee = employees.find((e) => e.id === sel) || employees[0];

  const selected = sel || employees[0]?.id || null;

  const today = todayISO();

  const todayRecord = (records || []).find((r) => r.date === today) || null;

  const workedMinutes = todayRecord
    ? getWorkedMinutes(todayRecord.clock_in, todayRecord.clock_out)
    : 0;

  const difference = todayRecord?.clock_out ? workedMinutes - 8 * 60 : 0;

  return (
    <div className="space-y-5">
      {/* HEADER */}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>

          <p className="text-sm text-[#7A7362] mt-1">
            Monitor attendance and working hours.
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
      ) : records === null ? null : (
        <>
          {/* TODAY */}

          <Card
            title={
              selectedEmployee
                ? `${selectedEmployee.name}'s day`
                : "Today's attendance"
            }
            subtitle={fmtDate(today)}
          >
            {!todayRecord ? (
              <div className="py-8 text-center">
                <div className="text-sm font-medium">
                  No attendance recorded today
                </div>

                <div className="text-xs text-[#7A7362] mt-1">
                  This employee has not clocked in.
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* TIMES */}

                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <div className="text-[10px] uppercase text-[#7A7362] mb-1">
                      Clock in
                    </div>

                    <div className="text-xl font-mono font-semibold text-[#6B8F71]">
                      {fmtTime(todayRecord.clock_in)}
                    </div>
                  </div>

                  <div className="text-[#BDB7AA]">→</div>

                  <div>
                    <div className="text-[10px] uppercase text-[#7A7362] mb-1">
                      Clock out
                    </div>

                    <div className="text-xl font-mono font-semibold text-[#B5563A]">
                      {todayRecord.clock_out
                        ? fmtTime(todayRecord.clock_out)
                        : "Still working"}
                    </div>
                  </div>
                </div>

                {/* STATS */}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MiniStat
                    label="Worked"
                    value={
                      todayRecord.clock_out
                        ? formatDuration(workedMinutes)
                        : "—"
                    }
                  />

                  <MiniStat label="Expected" value="8h 00m" />

                  <MiniStat
                    label={difference >= 0 ? "Overtime" : "Undertime"}
                    value={
                      todayRecord.clock_out
                        ? difference >= 0
                          ? `+${formatDuration(difference)}`
                          : `-${formatDuration(difference)}`
                        : "—"
                    }
                  />

                  <MiniStat label="Lunch" value="1h" />
                </div>
              </div>
            )}
          </Card>

          {/* HISTORY */}

          <Card
            title="Attendance history"
            subtitle={`${records.length} record${
              records.length !== 1 ? "s" : ""
            }`}
          >
            {records.length === 0 ? (
              <EmptyState text="No attendance recorded for this employee." />
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[650px]">
                  <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-3 px-3 pb-2 text-[10px] uppercase tracking-wide text-[#8C8576]">
                    <span>Date</span>
                    <span>Clock in</span>
                    <span>Clock out</span>
                    <span>Worked</span>
                    <span>Difference</span>
                  </div>

                  <div className="divide-y divide-[#EEEAE0]">
                    {records.map((r) => {
                      const worked = r.clock_out
                        ? getWorkedMinutes(r.clock_in, r.clock_out)
                        : null;

                      const diff = worked !== null ? worked - 8 * 60 : null;

                      return (
                        <div
                          key={r.id}
                          className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-3 items-center px-3 py-3 text-sm"
                        >
                          <span className="font-mono text-[#7A7362]">
                            {fmtDate(r.date)}
                          </span>

                          <span className="font-mono text-[#6B8F71]">
                            {fmtTime(r.clock_in)}
                          </span>

                          <span className="font-mono text-[#B5563A]">
                            {fmtTime(r.clock_out)}
                          </span>

                          <span>
                            {worked !== null ? formatDuration(worked) : "—"}
                          </span>

                          <span
                            className={
                              diff === null
                                ? "text-[#7A7362]"
                                : diff >= 0
                                  ? "text-[#6B8F71]"
                                  : "text-[#B5563A]"
                            }
                          >
                            {diff === null
                              ? "—"
                              : diff >= 0
                                ? `+${formatDuration(diff)}`
                                : `-${formatDuration(diff)}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

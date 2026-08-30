import { useEffect, useState } from "react";
import { useRoster, useAttendance } from "../../hooks/useOrgData";
import {
  fmtDate,
  fmtTime,
  formatDuration,
  getWorkedMinutes,
  todayISO,
} from "../../utils/workTime";
import { isoToBSLabel } from "../../utils/nepaliCalendar";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { MiniStat } from "../../components/MiniStat";
import {
  User,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";

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

  const workedMinutes = todayRecord?.clock_in
    ? getWorkedMinutes(todayRecord.clock_in, todayRecord.clock_out)
    : 0;

  const difference = todayRecord?.clock_out ? workedMinutes - 8 * 60 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-5 fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Attendance Monitor</h1>
          <p className="text-xs text-text-muted mt-1">
            Track daily check-ins, departures, and overall time logs per employee.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-border px-3 py-1.5 rounded-xl shadow-xs">
            <User size={13} className="text-primary" />
            <select
              value={selected || ""}
              onChange={(e) => setSel(e.target.value)}
              className="bg-transparent text-xs font-semibold text-text outline-none cursor-pointer"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selected ? (
        <EmptyState text="No employees found in roster." />
      ) : records === null ? null : (
        <>
          {/* TODAY SUMMARY CARD */}
          <Card
            title={
              selectedEmployee
                ? `${selectedEmployee.name}'s Attendance Today`
                : "Today's Attendance"
            }
            subtitle={`${isoToBSLabel(today)} · ${fmtDate(today)}`}
          >
            {!todayRecord?.clock_in ? (
              <div className="py-6 text-center text-xs text-text-muted bg-surface-muted/40 rounded-xl border border-dashed border-border-light">
                <Clock size={20} className="mx-auto mb-1.5 text-text-faint" />
                <p className="font-semibold text-text">No attendance logged today</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  This employee hasn't clocked in yet for today.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* CLOCK TIMES BANNER */}
                <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-surface-muted/50 border border-border-light">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-0.5">
                      Clock In
                    </div>
                    <div className="text-lg font-mono font-bold text-success">
                      {fmtTime(todayRecord.clock_in)}
                    </div>
                  </div>

                  <span className="text-border text-lg font-light">→</span>

                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-0.5">
                      Clock Out
                    </div>
                    <div className="text-lg font-mono font-bold text-text">
                      {todayRecord.clock_out ? (
                        fmtTime(todayRecord.clock_out)
                      ) : (
                        <span className="text-primary text-sm font-sans font-medium">
                          Currently working
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* STATS GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MiniStat
                    label="Worked Duration"
                    value={
                      todayRecord.clock_out
                        ? formatDuration(workedMinutes)
                        : formatDuration(workedMinutes)
                    }
                  />

                  <MiniStat label="Expected Hours" value="8h 00m" />

                  <MiniStat
                    label={difference >= 0 ? "Overtime" : "Undertime"}
                    value={
                      todayRecord.clock_out
                        ? difference >= 0
                          ? `+${formatDuration(difference)}`
                          : `-${formatDuration(Math.abs(difference))}`
                        : "In progress"
                    }
                  />

                  <MiniStat label="Target" value="8h / day" />
                </div>
              </div>
            )}
          </Card>

          {/* HISTORY TABLE */}
          <Card
            title="Attendance History"
            subtitle={`${records.length} total logged record${
              records.length !== 1 ? "s" : ""
            }`}
          >
            {records.length === 0 ? (
              <EmptyState text="No attendance records found for this team member." />
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[620px]">
                  {/* TABLE HEADER */}
                  <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1.1fr] gap-3 px-3.5 py-2 bg-surface-muted rounded-lg text-[10px] font-semibold uppercase tracking-wider text-text-muted border border-border-light mb-1">
                    <span>Date</span>
                    <span>Clock in</span>
                    <span>Clock out</span>
                    <span>Worked</span>
                    <span>Time status</span>
                  </div>

                  {/* TABLE ROWS */}
                  <div className="divide-y divide-border-light">
                    {records.map((r) => {
                      const worked = r.clock_out
                        ? getWorkedMinutes(r.clock_in, r.clock_out)
                        : null;

                      const diff = worked !== null ? worked - 8 * 60 : null;

                      return (
                        <div
                          key={r.id}
                          className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1.1fr] gap-3 items-center px-3.5 py-2.5 text-xs hover:bg-surface-muted/30 transition-colors"
                        >
                          <div>
                            <div className="font-medium text-text">
                              {fmtDate(r.date)}
                            </div>
                            <div className="text-[10px] font-mono text-text-muted">
                              {r.date}
                            </div>
                          </div>

                          <span className="font-mono text-xs text-text font-medium">
                            {fmtTime(r.clock_in)}
                          </span>

                          <span className="font-mono text-xs text-text font-medium">
                            {r.clock_out ? fmtTime(r.clock_out) : <span className="text-text-muted italic font-sans text-[11px]">Working</span>}
                          </span>

                          <span className="font-mono text-xs font-semibold text-text">
                            {worked !== null ? formatDuration(worked) : "—"}
                          </span>

                          <div>
                            {diff === null ? (
                              <span className="text-[11px] text-text-faint font-mono">—</span>
                            ) : diff > 0 ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-overtime bg-[#E8F5E2] px-1.5 py-0.5 rounded">
                                <TrendingUp size={10} /> +{formatDuration(diff)} OT
                              </span>
                            ) : diff < 0 ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-alert bg-alert-light px-1.5 py-0.5 rounded">
                                <TrendingDown size={10} /> -{formatDuration(Math.abs(diff))} under
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] text-text-muted">
                                8h completed
                              </span>
                            )}
                          </div>
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

import {
  CheckCircle2,
  Clock9,
  Clock12,
  Pencil,
  TrendingDown,
  TrendingUp,
  Clock10,
} from "lucide-react";

import { NEPALI_MONTHS, WEEKDAY_LABELS } from "../../../utils/nepaliCalendar";

import {
  fmtTime,
  formatDuration,
  getWorkedMinutes,
} from "../../../utils/workTime";

import {
  formatDifference,
  getWorkStatus,
  isLateClockIn,
  getWeekday,
  isEarlyClockIn,
} from "../../../utils/attendance";

import AttendanceEditForm from "./EditAttendance";

export default function AttendanceRow({
  date,
  record,
  result,
  editing,
  saving,
  setEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}) {
  /*
   * No attendance record
   */
  if (!record) {
    return (
      <div className="border-b border-border-light last:border-0 hover:bg-surface-muted/30 transition-colors">
        <div className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-[1.25fr_1fr_1fr_1.1fr_0.9fr_50px] gap-2 sm:gap-4 items-center">
          <DateCell date={date} />

          <MobileCell label="Clock in">
            <span className="text-xs text-text-faint font-mono">—</span>
          </MobileCell>

          <MobileCell label="Clock out">
            <span className="text-xs text-text-faint font-mono">—</span>
          </MobileCell>

          <MobileCell label="Time status">
            <span className="text-xs text-text-faint">—</span>
          </MobileCell>

          <MobileCell label="Worked">
            <StatusCell result={result} />
          </MobileCell>

          <div />
        </div>
      </div>
    );
  }

  /*
   * Editing
   */
  const isEditing = editing?.id === record.id;

  if (isEditing) {
    return (
      <AttendanceEditForm
        editing={editing}
        saving={saving}
        setEditing={setEditing}
        onSave={onSaveEdit}
        onCancel={onCancelEdit}
      />
    );
  }

  /*
   * Normal attendance record
   */
  return (
    <AttendanceRecord
      date={date}
      record={record}
      result={result}
      onStartEdit={onStartEdit}
    />
  );
}

function AttendanceRecord({ date, record, result, onStartEdit }) {
  const worked = getWorkedMinutes(record.clock_in, record.clock_out);

  const workStatus = record.clock_out
    ? getWorkStatus(worked)
    : {
        type: "none",
        minutes: 0,
      };

  const isLate = isLateClockIn(record.clock_in);
  const isEarly = isEarlyClockIn(record.clock_in);

  const workedOnHoliday = result.isSaturday || !!result.holiday;

  return (
    <div className="border-b border-border-light last:border-0 hover:bg-surface-muted/40 transition-colors">
      <div className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-[1.25fr_1fr_1fr_1.1fr_0.9fr_50px] gap-2 sm:gap-4 items-center">
        {/* DATE */}
        <DateCell date={date} workedOnHoliday={workedOnHoliday} />

        {/* CLOCK IN */}
        <MobileCell label="Clock in">
          <div>
            <div className="font-mono text-xs font-medium text-text">
              {fmtTime(record.clock_in)}
            </div>
            <div className="mt-0.5">
              {isLate ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning bg-warning-light px-1.5 py-0.5 rounded leading-none">
                  <Clock12 size={10} /> Late
                </span>
              ) : isEarly ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary-light px-1.5 py-0.5 rounded leading-none">
                  <Clock9 size={10} /> Early
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success bg-success-light px-1.5 py-0.5 rounded leading-none">
                  <Clock10 size={10} /> On time
                </span>
              )}
            </div>
          </div>
        </MobileCell>

        {/* CLOCK OUT */}
        <MobileCell label="Clock out">
          <span className="font-mono text-xs font-medium text-text">
            {record.clock_out ? fmtTime(record.clock_out) : <span className="text-text-muted italic font-sans text-xs">Working</span>}
          </span>
        </MobileCell>

        {/* TIME STATUS */}
        <MobileCell label="Time status">
          <TimeStatus record={record} workStatus={workStatus} />
        </MobileCell>

        {/* HOURS */}
        <MobileCell label="Worked">
          <HoursCell
            record={record}
            worked={worked}
            workStatus={workStatus}
            isLate={isLate}
          />
        </MobileCell>

        {/* ACTION */}
        <div className="flex justify-end">
          <button
            onClick={() => onStartEdit(record)}
            className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-text transition-colors"
            title="Edit attendance"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DateCell({ date, workedOnHoliday = false }) {
  const weekday = getWeekday(date.isoDate);

  return (
    <div>
      <div className="text-xs font-semibold text-text">
        {date.day} {NEPALI_MONTHS[date.month - 1]}
      </div>

      <div className="text-[11px] text-text-muted">
        {WEEKDAY_LABELS[weekday]} · {date.year}
      </div>

      {workedOnHoliday && (
        <div className="text-[10px] text-primary font-medium mt-0.5">
          Worked on holiday
        </div>
      )}
    </div>
  );
}

function MobileCell({ label, children }) {
  return (
    <div className="sm:block flex justify-between items-center">
      <span className="sm:hidden text-xs text-text-muted">{label}</span>
      {children}
    </div>
  );
}

function HoursCell({ record, worked, workStatus, isLate }) {
  return (
    <div>
      <div className="font-mono text-xs font-semibold text-text">
        {record.clock_out ? (
          formatDuration(worked)
        ) : (
          <span className="text-xs font-normal text-text-muted italic">In progress</span>
        )}
      </div>
    </div>
  );
}

function TimeStatus({ record, workStatus }) {
  return (
    <div>
      {record.clock_out ? (
        <>
          {/* OVERTIME */}
          {workStatus.type === "overtime" && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-overtime font-medium bg-[#E8F5E2] px-1.5 py-0.5 rounded leading-tight">
              <TrendingUp size={11} />
              +{formatDifference(workStatus.minutes)} OT
            </span>
          )}

          {/* UNDERTIME */}
          {workStatus.type === "undertime" && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-alert font-medium bg-alert-light px-1.5 py-0.5 rounded leading-tight">
              <TrendingDown size={11} />
              -{formatDifference(workStatus.minutes)} under
            </span>
          )}

          {/* NORMAL */}
          {workStatus.type === "normal" && (
            <span className="font-mono text-[11px] text-text-muted">
              8h completed
            </span>
          )}
        </>
      ) : (
        <span className="text-[11px] text-text-muted">8h expected</span>
      )}
    </div>
  );
}

function StatusCell({ result }) {
  if (result.status === "leave") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary-light text-primary">
        {result.leave?.type || "On leave"}
      </span>
    );
  }

  if (result.status === "holiday") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-muted text-text-muted border border-border">
        {result.holiday?.name || "Saturday"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-alert-light text-alert">
      Absent
    </span>
  );
}

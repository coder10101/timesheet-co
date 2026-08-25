import {
  CheckCircle2,
  Clock3,
  Pencil,
  TrendingDown,
  TrendingUp,
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
      <div className="border-b border-border-light last:border-0">
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[1.25fr_1fr_1fr_1fr_1fr_80px] gap-2 sm:gap-4 items-center">
          <DateCell date={date} />

          <MobileCell label="Clock in">—</MobileCell>

          <MobileCell label="Clock out">—</MobileCell>

          <MobileCell label="Time">—</MobileCell>

          <MobileCell label="Hours">
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

  const workedOnHoliday = result.isSaturday || !!result.holiday;

  return (
    <div className="border-b border-border-light last:border-0 hover:bg-surface-muted/40 transition-colors">
      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[1.25fr_1fr_1fr_1fr_1fr_80px] gap-2 sm:gap-4 items-center">
        {/* DATE */}
        <DateCell date={date} workedOnHoliday={workedOnHoliday} />

        {/* CLOCK IN */}
        <MobileCell label="Clock in">
          <span className="font-mono text-sm text-text-sub">
            {fmtTime(record.clock_in)}
          </span>
        </MobileCell>

        {/* CLOCK OUT */}
        <MobileCell label="Clock out">
          <span className="font-mono text-sm text-text-sub">
            {fmtTime(record.clock_out)}
          </span>
        </MobileCell>

        <MobileCell label="Time">
          <TimeStatus record={record} workStatus={workStatus} />
        </MobileCell>

        {/* HOURS */}
        <MobileCell label="Hours">
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
            className="p-2 rounded-lg hover:bg-surface-muted text-text-muted transition-colors"
            title="Edit attendance"
          >
            <Pencil size={14} />
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
      <div className="text-sm font-medium text-text">
        {date.day} {NEPALI_MONTHS[date.month - 1]}
      </div>

      <div className="text-xs text-text-faint">
        {WEEKDAY_LABELS[weekday]} · {date.year}
      </div>

      {workedOnHoliday && (
        <div className="text-xs text-primary mt-0.5">Worked on holiday</div>
      )}
    </div>
  );
}

function MobileCell({ label, children }) {
  return (
    <div className="sm:block flex justify-between">
      <span className="sm:hidden text-xs text-text-muted">{label}</span>

      {children}
    </div>
  );
}

function HoursCell({ record, worked, workStatus, isLate }) {
  return (
    <div>
      <div className="font-mono text-sm font-medium text-text">
        {record.clock_out ? (
          <div className="flex items-center gap-2">
            {formatDuration(worked)}
            <div
              className={`font-mono text-sm ${
                isLate ? "text-warning" : "text-success"
              }`}
            >
              {isLate ? (
                <div className="flex items-center align-center text-xs gap-1">
                  <Clock3 size={13} /> Late
                </div>
              ) : (
                <div className="flex items-center align-center text-xs gap-1">
                  <CheckCircle2 size={13} />
                  On time
                </div>
              )}
            </div>
          </div>
        ) : (
          "In progress"
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
          {/* LATE / ON TIME */}

          {/* OVERTIME */}
          {workStatus.type === "overtime" && (
            <div className="flex gap-1 items-center font-mono text-[10px] text-overtime font-medium mt-0.5">
              <TrendingUp size={13} />
              {formatDifference(workStatus.minutes)} overtime
            </div>
          )}

          {/* UNDERTIME */}
          {workStatus.type === "undertime" && (
            <div className="flex gap-1 items-center font-mono text-[10px] text-undertime font-medium mt-0.5">
              <TrendingDown size={13} />
              {formatDifference(workStatus.minutes)} undertime
            </div>
          )}

          {/* NORMAL */}
          {workStatus.type === "normal" && (
            <div className="font-mono text-[10px] text-text-faint mt-0.5">
              8h completed
            </div>
          )}
        </>
      ) : (
        <div className="text-xs text-text-faint">8h expected</div>
      )}
    </div>
  );
}

function StatusCell({ result }) {
  if (result.status === "leave") {
    return (
      <span className="text-sm text-primary">
        {result.leave?.type || "On leave"}
      </span>
    );
  }

  if (result.status === "holiday") {
    return (
      <span className="text-sm text-text-muted">
        {result.holiday?.name || "Saturday"}
      </span>
    );
  }

  return <span className="text-sm text-alert">Absent</span>;
}

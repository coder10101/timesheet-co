import {
  CheckCircle2,
  Clock9,
  Clock12,
  Pencil,
  TrendingDown,
  TrendingUp,
  Clock10,
  MapPin,
} from "lucide-react";

import { NEPALI_MONTHS, WEEKDAY_LABELS } from "../../../utils/nepaliCalendar";
import {
  fmtTime,
  formatDuration,
  getWorkedMinutes,
  getEffectiveClockOut,
  todayISO,
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
  error,
  setEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}) {
  /*
   * Check if this date/record is currently being edited
   */
  const isEditing =
    editing &&
    (editing.id && record?.id
      ? editing.id === record.id
      : editing.date === date.isoDate);

  if (isEditing) {
    return (
      <AttendanceEditForm
        editing={editing}
        saving={saving}
        error={error}
        setEditing={setEditing}
        onSave={onSaveEdit}
        onCancel={onCancelEdit}
      />
    );
  }

  /*
   * No attendance record for this day
   */
  if (!record) {
    if (result.status === "site_full") {
      return (
        <FullSiteVisitRecord
          date={date}
          result={result}
          onStartEdit={onStartEdit}
        />
      );
    }

    return (
      <div className="border-b border-border-light last:border-0 hover:bg-surface-muted/30 transition-colors">
        <div className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-[1.25fr_1fr_1fr_1fr_1.1fr_44px] gap-2 sm:gap-4 items-center">
          <DateCell date={date} />

          <MobileCell label="Clock in">
            <span className="text-xs text-text-faint font-mono">—</span>
          </MobileCell>

          <MobileCell label="Clock out">
            <span className="text-xs text-text-faint font-mono">—</span>
          </MobileCell>

          <MobileCell label="Net Worked">
            <span className="text-xs text-text-faint font-mono">—</span>
          </MobileCell>

          <MobileCell label="Shift Status">
            <StatusCell result={result} />
          </MobileCell>

          <div className="flex justify-end">
            <button
              onClick={() => onStartEdit(date, null)}
              className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary transition-colors"
              title="Log attendance for this day"
            >
              <Pencil size={13} />
            </button>
          </div>
        </div>
      </div>
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
  const isToday = date.isoDate === todayISO();
  const effectiveClockOut = getEffectiveClockOut(record, todayISO());
  const isAutoClockOut = !record.clock_out && !isToday && !!record.clock_in;

  const worked = getWorkedMinutes(
    record.clock_in,
    effectiveClockOut,
    record.break_minutes || 0,
  );

  const hasCheckout = !!record.clock_out || isAutoClockOut;
  const targetMinutes = result?.targetMinutes || 480;

  const workStatus = hasCheckout
    ? getWorkStatus(worked, targetMinutes)
    : {
        type: "none",
        minutes: 0,
      };

  const isLate = isLateClockIn(record.clock_in, result?.leave);
  const isEarly = isEarlyClockIn(record.clock_in, result?.leave);

  const workedOnHoliday = result.isSaturday || !!result.holiday;

  return (
    <div className="border-b border-border-light last:border-0 hover:bg-surface-muted/40 transition-colors">
      <div className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-[1.25fr_1fr_1fr_1fr_1.1fr_44px] gap-2 sm:gap-4 items-center">
        {/* DATE */}
        <DateCell date={date} workedOnHoliday={workedOnHoliday} />

        {/* CLOCK IN */}
        <MobileCell label="Clock in">
          <div>
            <div className="font-mono text-xs font-semibold text-text">
              {fmtTime(record.clock_in)}
            </div>
            <div className="mt-0.5 flex items-center gap-1 flex-wrap">
              {result.isSiteHybrid && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#63537E] bg-[#EEEAF2] border border-[#63537E]/20 px-1.5 py-0.5 rounded leading-none">
                  <MapPin size={9} /> Site ({result.siteInfo?.totalHours || 2}h)
                </span>
              )}
              {result.isHalfDay && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded leading-none">
                  ½d Leave
                </span>
              )}
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
          <span className="font-mono text-xs font-semibold text-text">
            {record.clock_out ? (
              fmtTime(record.clock_out)
            ) : isToday ? (
              <span className="text-primary italic font-sans text-xs font-medium">
                Working...
              </span>
            ) : isAutoClockOut ? (
              <div className="flex items-center gap-1">
                <span>06:00 PM</span>
                <span
                  className="text-[9px] font-semibold text-text-muted bg-surface-muted border border-border-light px-1 py-0.2 rounded"
                  title="Auto-closed at standard 6:00 PM"
                >
                  Auto
                </span>
              </div>
            ) : (
              <span className="text-xs text-text-faint font-mono">—</span>
            )}
          </span>
        </MobileCell>

        {/* NET WORKED HOURS */}
        <MobileCell label="Net Worked">
          <HoursCell
            record={record}
            worked={worked}
            date={date}
            hasCheckout={hasCheckout}
          />
        </MobileCell>

        {/* SHIFT STATUS / VARIANCE */}
        <MobileCell label="Shift Status">
          <TimeStatus
            record={record}
            workStatus={workStatus}
            date={date}
            hasCheckout={hasCheckout}
            result={result}
          />
        </MobileCell>

        {/* ACTION */}
        <div className="flex justify-end">
          <button
            onClick={() => onStartEdit(date, record)}
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

function HoursCell({ record, worked, date, hasCheckout }) {
  const isToday = date?.isoDate === todayISO();
  const breakMins = record?.break_minutes || 0;

  return (
    <div>
      <div className="font-mono text-xs font-semibold text-text">
        {hasCheckout ? (
          <div>
            <span>{formatDuration(worked)}</span>
            {breakMins > 0 && (
              <div className="text-[10px] text-amber-600 font-sans font-medium">
                ☕ {breakMins}m break
              </div>
            )}
          </div>
        ) : isToday ? (
          <div>
            <span className="text-xs font-normal text-text-muted italic">
              In progress
            </span>
            {breakMins > 0 && (
              <div className="text-[10px] text-amber-600 font-sans font-medium">
                ☕ {breakMins}m break
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs font-normal text-alert italic font-sans">
            Incomplete
          </span>
        )}
      </div>
    </div>
  );
}

function TimeStatus({ record, workStatus, date, hasCheckout, result }) {
  const isToday = date?.isoDate === todayISO();
  const targetHours = (result?.targetMinutes || 480) / 60;

  return (
    <div>
      {hasCheckout ? (
        <>
          {/* OVERTIME */}
          {workStatus.type === "overtime" && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-overtime font-bold bg-[#E8F5E2] px-2 py-0.5 rounded leading-tight">
              <TrendingUp size={11} />+{formatDifference(workStatus.minutes)} OT
            </span>
          )}

          {/* UNDERTIME */}
          {workStatus.type === "undertime" && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-alert font-bold bg-alert-light px-2 py-0.5 rounded leading-tight">
              <TrendingDown size={11} />-
              {formatDifference(workStatus.minutes)} under
            </span>
          )}

          {/* NORMAL / STANDARD */}
          {workStatus.type === "normal" && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary font-bold bg-primary-light px-2 py-0.5 rounded leading-tight">
              <CheckCircle2 size={11} />
              {targetHours}h standard
            </span>
          )}
        </>
      ) : isToday ? (
        <span className="text-[11px] text-text-muted">{targetHours}h expected</span>
      ) : (
        <span className="text-[11px] text-alert font-medium font-sans">
          Click edit to fix
        </span>
      )}
    </div>
  );
}

function StatusCell({ result }) {
  if (result.status === "site_full") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEEAF2] text-[#63537E]">
        <MapPin size={11} /> Site Visit
      </span>
    );
  }

  if (result.status === "leave") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary-light text-primary">
        <span>{result.leave?.type || "On leave"}</span>
        {result.isHalfDay && <span className="font-bold font-mono">½d</span>}
      </span>
    );
  }

  if (result.status === "holiday") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-muted text-text-muted border border-border">
        {result.holiday?.name || (result.isSaturday ? "Saturday" : "Holiday")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-alert-light text-alert">
      Absent
    </span>
  );
}

function FullSiteVisitRecord({ date, result, onStartEdit }) {
  const siteHours = result.siteInfo?.totalHours || 8;

  return (
    <div className="border-b border-border-light last:border-0 hover:bg-surface-muted/40 transition-colors bg-[#FAF8FC]">
      <div className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-[1.25fr_1fr_1fr_1fr_1.1fr_44px] gap-2 sm:gap-4 items-center">
        <DateCell date={date} />

        <MobileCell label="Clock in">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#63537E] bg-[#EEEAF2] border border-[#63537E]/30 px-2 py-0.5 rounded-md">
            <MapPin size={11} /> Site Duty
          </span>
        </MobileCell>

        <MobileCell label="Clock out">
          <span className="text-xs text-text-muted">Field Visit</span>
        </MobileCell>

        <MobileCell label="Net Worked">
          <div className="font-mono text-xs font-bold text-text">
            {siteHours}h 00m
          </div>
          <div className="text-[10px] text-text-muted">from work log</div>
        </MobileCell>

        <MobileCell label="Shift Status">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#63537E] bg-[#EEEAF2] px-2.5 py-0.5 rounded-full">
            <MapPin size={11} /> Site Visit ({siteHours}h)
          </span>
        </MobileCell>

        <div className="flex justify-end">
          <button
            onClick={() => onStartEdit(date, null)}
            className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary transition-colors cursor-pointer"
            title="Log attendance"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}


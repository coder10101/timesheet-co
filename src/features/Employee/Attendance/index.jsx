import { useMemo, useState } from "react";

import {
  useAttendance,
  useLeaveRequests,
  useHolidays,
  useWorkLogs,
} from "../../../hooks/useOrgData";

import {
  getWorkedMinutes,
  getEffectiveClockOut,
  todayISO,
} from "../../../utils/workTime";
import { toNepalTimeString } from "../../../utils/timezone";
import { getSiteSummaryForDate } from "../../../utils/workType";

import {
  getMonthKey,
  getBSMonthDates,
  getDefaultTime,
  isDateWithinLeave,
  getWeekday,
  getWorkStatus,
  formatDifference,
  isLateClockIn,
} from "../../../utils/attendance";

import AttendanceTable from "./AttendanceTable";
import AttendanceMonthSelector from "./MonthSelector";
import AttendanceSummary from "./Summary";
import {
  NEPALI_MONTHS,
  getTodayBS,
  bsDateToISO,
  addMonths,
  isoToBS,
  getDaysInBSMonth,
} from "../../../utils/nepaliCalendar";
import AttendanceOverview from "./MonthlyOverview";
import { PunctualityRhythmChart } from "../../../components/charts/PunctualityRhythmChart";

export function EmployeeAttendance({ me }) {
  const { records, updateAttendance } = useAttendance(me.id);
  const { entries: workLogs } = useWorkLogs(me.id);
  const { requests: leaveRequests } = useLeaveRequests(me.id);

  const { holidays } = useHolidays();

  const todayBS = getTodayBS();
  const today = todayISO();

  const [selectedMonth, setSelectedMonth] = useState({
    year: todayBS.year,
    month: todayBS.month,
  });

  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  //MONTH
  const selectedMonthKey = getMonthKey(selectedMonth.year, selectedMonth.month);

  const currentMonthKey = getMonthKey(todayBS.year, todayBS.month);

  const isCurrentMonth = selectedMonthKey === currentMonthKey;

  const monthDates = useMemo(
    () =>
      getBSMonthDates(
        selectedMonth.year,
        selectedMonth.month,
        bsDateToISO,
        getDaysInBSMonth,
      ),
    [selectedMonth.year, selectedMonth.month],
  );

  const monthStartISO = monthDates[0]?.isoDate;

  const monthEndISO = monthDates[monthDates.length - 1]?.isoDate;

  // RECORDS

  const monthRecords = useMemo(() => {
    if (!records || !monthStartISO || !monthEndISO) {
      return [];
    }

    return records.filter(
      (record) => record.date >= monthStartISO && record.date <= monthEndISO,
    );
  }, [records, monthStartISO, monthEndISO]);

  const recordsByDate = useMemo(
    () => new Map(monthRecords.map((record) => [record.date, record])),
    [monthRecords],
  );

  // HOLIDAYS

  const holidaysByDate = useMemo(() => {
    const map = new Map();

    (holidays || []).forEach((holiday) => {
      if (holiday?.date) {
        map.set(holiday.date, holiday);
      }
    });

    return map;
  }, [holidays]);

  // LEAVE REQUESTS

  const approvedLeaves = useMemo(() => {
    return (leaveRequests || []).filter((l) => l.status === "Approved");
  }, [leaveRequests]);

  // LEAVE DAYS COUNT
  const leaveDaysInMonth = useMemo(() => {
    let count = 0;

    monthDates.forEach((date) => {
      const isLeave = approvedLeaves.some((leave) =>
        isDateWithinLeave(date.isoDate, leave),
      );

      if (isLeave) {
        count++;
      }
    });

    return count;
  }, [monthDates, approvedLeaves]);

  // SITE VISITS FROM WORK LOGS
  const siteSummaryByDate = useMemo(() => {
    const map = new Map();
    if (!workLogs || !workLogs.length) return map;
    monthDates.forEach((d) => {
      const summary = getSiteSummaryForDate(workLogs, d.isoDate);
      if (summary.hasSiteVisit) {
        map.set(d.isoDate, summary);
      }
    });
    return map;
  }, [monthDates, workLogs]);

  // GET DATE STATUS

  const getDateStatus = (date) => {
    const isFuture = date.isoDate > today;

    const weekday = getWeekday(date.isoDate);

    const isSaturday = weekday === 6;

    const holiday = holidaysByDate.get(date.isoDate);

    const isHoliday = !!holiday || isSaturday;

    const leave = approvedLeaves.find((l) =>
      isDateWithinLeave(date.isoDate, l),
    );

    const isLeave = !!leave;

    const record = recordsByDate.get(date.isoDate);

    const siteInfo = siteSummaryByDate.get(date.isoDate);
    const hasSite = !!siteInfo?.hasSiteVisit;

    if (isFuture) {
      return {
        status: "future",
        isHoliday,
        isSaturday,
        holiday,
        isLeave,
        leave,
        record: null,
      };
    }

    if (isLeave) {
      return {
        status: "leave",
        isHoliday,
        isSaturday,
        holiday,
        isLeave,
        leave,
        record,
      };
    }

    if (isHoliday) {
      return {
        status: "holiday",
        isHoliday,
        isSaturday,
        holiday,
        isLeave: false,
        leave: null,
        record,
      };
    }

    if (!record || !record.clock_in) {
      if (hasSite) {
        // Employee logged site work for this day, so they are NOT absent!
        return {
          status: "site_full",
          isHoliday: false,
          isSaturday: false,
          holiday: null,
          isLeave: false,
          leave: null,
          record: null,
          siteInfo,
        };
      }

      return {
        status: "absent",
        isHoliday: false,
        isSaturday: false,
        holiday: null,
        isLeave: false,
        leave: null,
        record: null,
        siteInfo: null,
      };
    }

    const isLate = isLateClockIn(record.clock_in);

    return {
      status: isLate ? "late" : "present",
      isHoliday: false,
      isSaturday: false,
      holiday: null,
      isLeave: false,
      leave: null,
      record,
      siteInfo,
      isSiteHybrid: hasSite,
    };
  };

  // STATS

  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let totalWorked = 0;
    let grossOvertimeMinutes = 0;
    let grossUndertimeMinutes = 0;
    const today = todayISO();

    monthDates.forEach((date) => {
      const result = getDateStatus(date);

      if (
        result.status === "present" ||
        result.status === "late" ||
        result.status === "site_full"
      ) {
        if (result.status === "present" || result.status === "site_full") {
          present++;
        }

        if (result.status === "site_full") {
          const creditedMins = Math.round(
            (result.siteInfo?.totalHours || 8) * 60,
          );
          totalWorked += creditedMins;
          const workStatus = getWorkStatus(creditedMins);
          if (workStatus.type === "overtime") {
            grossOvertimeMinutes += workStatus.minutes;
          }
          if (workStatus.type === "undertime") {
            grossUndertimeMinutes += workStatus.minutes;
          }
        } else if (result.record?.clock_in) {
          const effectiveClockOut = getEffectiveClockOut(result.record, today);
          if (effectiveClockOut) {
            const worked = getWorkedMinutes(
              result.record.clock_in,
              effectiveClockOut,
              result.record.break_minutes || 0,
            );

            totalWorked += worked;

            const workStatus = getWorkStatus(worked);

            if (workStatus.type === "overtime") {
              grossOvertimeMinutes += workStatus.minutes;
            }

            if (workStatus.type === "undertime") {
              grossUndertimeMinutes += workStatus.minutes;
            }
          }
        }

        if (result.status === "late") {
          late++;
        }

        return;
      }

      if (result.status === "future") {
        return;
      }

      if (result.status === "leave" || result.status === "holiday") {
        return;
      }

      if (result.status === "absent") {
        absent++;
      }
    });

    const netMinutes = grossOvertimeMinutes - grossUndertimeMinutes;
    const overtimeMinutes = netMinutes > 0 ? netMinutes : 0;
    const undertimeMinutes = netMinutes < 0 ? Math.abs(netMinutes) : 0;

    return {
      present,
      late,
      absent,
      leave: leaveDaysInMonth,
      totalWorked,
      overtimeMinutes,
      undertimeMinutes,
      grossOvertimeMinutes,
      grossUndertimeMinutes,
      netMinutes,
    };
  }, [
    monthDates,
    recordsByDate,
    holidaysByDate,
    approvedLeaves,
    today,
    leaveDaysInMonth,
  ]);

  const goPreviousMonth = () => {
    const previous = addMonths(selectedMonth.year, selectedMonth.month, -1);

    setSelectedMonth(previous);
    setEditing(null);
    setError("");
  };

  const goNextMonth = () => {
    const next = addMonths(selectedMonth.year, selectedMonth.month, 1);

    const nextKey = getMonthKey(next.year, next.month);

    if (nextKey > currentMonthKey) {
      return;
    }

    setSelectedMonth(next);
    setEditing(null);
    setError("");
  };

  // EDIT LOGIC

  const startEdit = (date, record) => {
    setError("");

    const isToday = date.isoDate === today;

    const clockIn = record?.clock_in
      ? toNepalTimeString(record.clock_in)
      : "10:00";

    // If it's today and no clock_out has been recorded, leave clockOut empty so employee is not prematurely clocked out
    const clockOut = record?.clock_out
      ? toNepalTimeString(record.clock_out)
      : isToday
        ? ""
        : "18:00";

    setEditing({
      id: record?.id || null,
      date: date.isoDate,
      bsDay: date.day,
      bsMonth: date.month || selectedMonth.month,
      bsYear: date.year || selectedMonth.year,
      clockIn,
      clockOut,
      breakMinutes: record?.break_minutes || 0,
      isNew: !record?.id,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;

    setError("");

    if (!editing.clockIn) {
      setError("Clock-in time is required.");
      return;
    }

    if (editing.clockOut && editing.clockIn >= editing.clockOut) {
      setError("Clock-out must be after clock-in.");
      return;
    }

    setSaving(true);

    try {
      const clockInVal = `${editing.date}T${editing.clockIn}`;
      const clockOutVal = editing.clockOut
        ? `${editing.date}T${editing.clockOut}`
        : null;

      await updateAttendance(editing.id, {
        attendanceId: editing.id,
        date: editing.date,
        clockIn: clockInVal,
        clockOut: clockOutVal,
        clock_in: clockInVal,
        clock_out: clockOutVal,
        breakMinutes: Number(editing.breakMinutes) || 0,
        break_minutes: Number(editing.breakMinutes) || 0,
      });

      setEditing(null);
    } catch (e) {
      setError(e.message || "Unable to update attendance.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (records === null) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto fade-in space-y-4 pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            Attendance History
          </h1>

          <p className="text-xs text-text-muted mt-1">
            Your full attendance record for this month.
          </p>
        </div>

        <AttendanceMonthSelector
          selectedMonth={selectedMonth}
          monthLabel={`${NEPALI_MONTHS[selectedMonth.month - 1]} ${selectedMonth.year}`}
          isCurrentMonth={isCurrentMonth}
          onPrevious={goPreviousMonth}
          onNext={goNextMonth}
        />
      </div>

      {/* ERROR (only show at top if not currently editing in table) */}
      {!editing && error && (
        <div className="px-3 py-2 rounded-lg bg-alert-light text-alert text-xs">
          {error}
        </div>
      )}

      {/* SUMMARY */}
      <AttendanceSummary stats={stats} formatDifference={formatDifference} />

      {/* PUNCTUALITY & CHECK-IN RHYTHM CHART */}
      <PunctualityRhythmChart
        records={monthRecords}
        monthDates={monthDates}
        siteSummaryByDate={siteSummaryByDate}
      />

      {/* MONTHLY OVERVIEW */}
      <AttendanceOverview
        monthDates={monthDates}
        getDateStatus={getDateStatus}
      />

      {/* DAILY TABLE */}

      <AttendanceTable
        monthDates={monthDates}
        today={today}
        recordsByDate={recordsByDate}
        getDateStatus={getDateStatus}
        editing={editing}
        saving={saving}
        error={error}
        setEditing={setEditing}
        onStartEdit={startEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={() => {
          setEditing(null);
          setError("");
        }}
      />
    </div>
  );
}

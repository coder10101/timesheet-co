import { useMemo, useState } from "react";

import {
  useAttendance,
  useLeaveRequests,
  useHolidays,
} from "../../../hooks/useOrgData";

import { getWorkedMinutes, todayISO } from "../../../utils/workTime";

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

export function EmployeeAttendance({ me }) {
  const { records, updateAttendance } = useAttendance(me.id);

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

  const approvedLeaves = useMemo(
    () => (leaveRequests || []).filter((leave) => leave.status === "Approved"),
    [leaveRequests],
  );

  const getLeaveForDate = (isoDate) => {
    return approvedLeaves.find((leave) => isDateWithinLeave(isoDate, leave));
  };

  const leaveDaysInMonth = useMemo(() => {
    if (!monthStartISO || !monthEndISO) {
      return 0;
    }

    let total = 0;

    approvedLeaves.forEach((leave) => {
      if (!leave.start_date || !leave.end_date) {
        return;
      }

      const overlaps =
        leave.start_date <= monthEndISO && leave.end_date >= monthStartISO;

      if (!overlaps) {
        return;
      }

      if (leave.start_date >= monthStartISO && leave.end_date <= monthEndISO) {
        total += Number(leave.days) || 0;
        return;
      }

      const start =
        leave.start_date > monthStartISO ? leave.start_date : monthStartISO;

      const end = leave.end_date < monthEndISO ? leave.end_date : monthEndISO;

      const startDate = new Date(`${start}T00:00:00`);

      const endDate = new Date(`${end}T00:00:00`);

      const diff =
        Math.floor(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

      total += Math.max(diff, 0);
    });

    return total;
  }, [approvedLeaves, monthStartISO, monthEndISO]);

  const getDateStatus = (date) => {
    const record = recordsByDate.get(date.isoDate);

    const holiday = holidaysByDate.get(date.isoDate);

    const leave = getLeaveForDate(date.isoDate);

    const isFuture = date.isoDate > today;

    const weekday = getWeekday(date.isoDate);

    const isSaturday = weekday === 6;

    /*
     * Attendance always wins.
     */

    if (record?.clock_in) {
      const late = isLateClockIn(record.clock_in);

      return {
        status: late ? "late" : "present",
        record,
        holiday,
        leave,
        isFuture: false,
        isSaturday,
      };
    }

    if (isFuture) {
      return {
        status: "future",
        record: null,
        holiday,
        leave,
        isFuture: true,
        isSaturday,
      };
    }

    if (leave) {
      return {
        status: "leave",
        record: null,
        holiday,
        leave,
        isFuture: false,
        isSaturday,
      };
    }

    if (holiday || isSaturday) {
      return {
        status: "holiday",
        record: null,
        holiday,
        leave: null,
        isFuture: false,
        isSaturday,
      };
    }

    return {
      status: "absent",
      record: null,
      holiday: null,
      leave: null,
      isFuture: false,
      isSaturday: false,
    };
  };

  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;

    let totalWorked = 0;
    let overtimeMinutes = 0;
    let undertimeMinutes = 0;

    monthDates.forEach((date) => {
      const result = getDateStatus(date);

      if (result.record?.clock_in) {
        present++;

        if (result.record.clock_out) {
          const worked = getWorkedMinutes(
            result.record.clock_in,
            result.record.clock_out,
          );

          totalWorked += worked;

          const workStatus = getWorkStatus(worked);

          if (workStatus.type === "overtime") {
            overtimeMinutes += workStatus.minutes;
          }

          if (workStatus.type === "undertime") {
            undertimeMinutes += workStatus.minutes;
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

    return {
      present,
      late,
      absent,
      leave: leaveDaysInMonth,
      totalWorked,
      overtimeMinutes,
      undertimeMinutes,
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

  /* =====================================================
     EDIT
  ===================================================== */

  const startEdit = (record) => {
    setError("");

    const bsDate = isoToBS(record.date);

    setEditing({
      id: record.id,

      bsYear: bsDate.year,
      bsMonth: bsDate.month,
      bsDay: bsDate.day,

      clockIn: getDefaultTime(record.clock_in),

      clockOut: getDefaultTime(record.clock_out),

      originalClockIn: record.clock_in,

      originalClockOut: record.clock_out,
    });
  };

  const saveEdit = async () => {
    if (!editing) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const selectedISO = bsDateToISO(
        editing.bsYear,
        editing.bsMonth,
        editing.bsDay,
      );

      const clockInISO = editing.clockIn
        ? `${selectedISO}T${editing.clockIn}:00`
        : null;

      const clockOutISO = editing.clockOut
        ? `${selectedISO}T${editing.clockOut}:00`
        : null;

      await updateAttendance(editing.id, {
        clockIn: clockInISO,
        clockOut: clockOutISO,
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
    <div className="max-w-6xl mx-auto fade-in">
      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
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

      {/* ERROR */}

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-alert-light text-alert text-xs">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <AttendanceSummary stats={stats} formatDifference={formatDifference} />

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
        setEditing={setEditing}
        onStartEdit={startEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditing(null)}
      />
    </div>
  );
}

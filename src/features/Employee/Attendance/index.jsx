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
import { WorkHoursChart } from "../../../components/charts/WorkHoursChart";

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
      return {
        status: "absent",
        isHoliday: false,
        isSaturday: false,
        holiday: null,
        isLeave: false,
        leave: null,
        record: null,
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
    };
  };

  // STATS

  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let totalWorked = 0;
    let overtimeMinutes = 0;
    let undertimeMinutes = 0;

    monthDates.forEach((date) => {
      const result = getDateStatus(date);

      if (result.status === "present" || result.status === "late") {
        if (result.status === "present") {
          present++;
        }

        if (result.record?.clock_in && result.record?.clock_out) {
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

  // EDIT LOGIC

  const startEdit = (date, record) => {
    setError("");

    if (record) {
      const clockIn = record.clock_in
        ? new Date(record.clock_in).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          })
        : "09:30";

      const clockOut = record.clock_out
        ? new Date(record.clock_out).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          })
        : "18:00";

      setEditing({
        date: date.isoDate,
        clockIn,
        clockOut,
        isNew: false,
      });

      return;
    }

    setEditing({
      date: date.isoDate,
      clockIn: "09:30",
      clockOut: "18:00",
      isNew: true,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;

    setError("");

    if (editing.clockIn >= editing.clockOut) {
      setError("Clock-out must be after clock-in.");
      return;
    }

    setSaving(true);

    try {
      const clockInISO = `${editing.date}T${editing.clockIn}:00.000Z`;
      const clockOutISO = `${editing.date}T${editing.clockOut}:00.000Z`;

      await updateAttendance({
        date: editing.date,
        clock_in: clockInISO,
        clock_out: clockOutISO,
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

      {/* ERROR */}
      {error && (
        <div className="px-3 py-2 rounded-lg bg-alert-light text-alert text-xs">
          {error}
        </div>
      )}

      {/* SUMMARY */}
      <AttendanceSummary stats={stats} formatDifference={formatDifference} />

      {/* DAILY WORK HOURS & VARIANCE CHART */}
      <WorkHoursChart
        monthDates={monthDates}
        records={monthRecords}
        employeeName={me.name}
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
        setEditing={setEditing}
        onStartEdit={startEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditing(null)}
      />
    </div>
  );
}

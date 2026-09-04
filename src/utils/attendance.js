import { WORK_DAY_MINUTES } from "./workTime";
import { isHalfDayLeave, getHalfDaySession, HALF_DAY_SESSIONS } from "./leaveUtils";

export const OFFICE_START_HOUR = 10;

export function pad(value) {
  return String(value).padStart(2, "0");
}

export function getMonthKey(year, month) {
  return `${year}-${pad(month)}`;
}

export function getBSMonthDates(year, month, bsDateToISO, getDaysInBSMonth) {
  const totalDays = getDaysInBSMonth(year, month);

  return Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;

    return {
      year,
      month,
      day,
      isoDate: bsDateToISO(year, month, day),
    };
  });
}

export function getDefaultTime(dateTime) {
  if (!dateTime) return "";

  const date = new Date(dateTime);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isDateWithinLeave(dateISO, leave) {
  if (!leave?.start_date || !leave?.end_date) {
    return false;
  }

  return dateISO >= leave.start_date && dateISO <= leave.end_date;
}

export function getWeekday(dateISO) {
  const date = new Date(`${dateISO}T00:00:00`);
  return date.getDay();
}

export function getWorkStatus(workedMinutes, targetMinutes = WORK_DAY_MINUTES) {
  if (workedMinutes == null || Number.isNaN(workedMinutes)) {
    return {
      type: "none",
      minutes: 0,
    };
  }

  const difference = workedMinutes - targetMinutes;

  if (difference > 0) {
    return {
      type: "overtime",
      minutes: difference,
    };
  }

  if (difference < 0) {
    return {
      type: "undertime",
      minutes: Math.abs(difference),
    };
  }

  return {
    type: "normal",
    minutes: 0,
  };
}

export function formatDifference(minutes) {
  if (!minutes) return "0m";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours && mins) {
    return `${hours}h ${mins}m`;
  }

  if (hours) {
    return `${hours}h`;
  }

  return `${mins}m`;
}

export function getClockInMinutes(dateTime) {
  if (!dateTime) return null;
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(
    parts.find((p) => p.type === "hour")?.value ?? date.getHours(),
  );
  const minute = Number(
    parts.find((p) => p.type === "minute")?.value ?? date.getMinutes(),
  );
  return hour * 60 + minute;
}

export function isEarlyClockIn(dateTime, leave = null) {
  const mins = getClockInMinutes(dateTime);
  if (mins === null) return false;
  if (leave && isHalfDayLeave(leave) && getHalfDaySession(leave) === HALF_DAY_SESSIONS.FIRST_HALF) {
    return mins < 14 * 60; // Before 2:00 PM for afternoon shift
  }
  return mins < 10 * 60; // Before 10:00 AM
}

export function isLateClockIn(dateTime, leave = null) {
  const mins = getClockInMinutes(dateTime);
  if (mins === null) return false;
  if (leave && isHalfDayLeave(leave) && getHalfDaySession(leave) === HALF_DAY_SESSIONS.FIRST_HALF) {
    return mins > 14 * 60 + 30; // After 2:30 PM for afternoon shift
  }
  return mins > 10 * 60 + 30; // After 10:30 AM
}

export function isOnTimeClockIn(dateTime, leave = null) {
  const mins = getClockInMinutes(dateTime);
  if (mins === null) return false;
  if (leave && isHalfDayLeave(leave) && getHalfDaySession(leave) === HALF_DAY_SESSIONS.FIRST_HALF) {
    return mins >= 14 * 60 && mins <= 14 * 60 + 30;
  }
  return mins >= 10 * 60 && mins <= 10 * 60 + 30;
}

import { WORK_DAY_MINUTES } from "./workTime";

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

export function getWorkStatus(workedMinutes) {
  if (workedMinutes == null || Number.isNaN(workedMinutes)) {
    return {
      type: "none",
      minutes: 0,
    };
  }

  const difference = workedMinutes - WORK_DAY_MINUTES;

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

export function isEarlyClockIn(dateTime) {
  const mins = getClockInMinutes(dateTime);
  if (mins === null) return false;
  return mins < 10 * 60; // Before 10:00 AM
}

export function isLateClockIn(dateTime) {
  const mins = getClockInMinutes(dateTime);
  if (mins === null) return false;
  return mins > 10 * 60; // After 10:00 AM
}

export function isOnTimeClockIn(dateTime) {
  const mins = getClockInMinutes(dateTime);
  if (mins === null) return false;
  return mins <= 10 * 60; // On or before 10:00 AM
}

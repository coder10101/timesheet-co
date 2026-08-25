export const WORK_DAY_MINUTES = 8 * 60;
export const LUNCH_MINUTES = 60;
export const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Calculates actual working time.
 *
 * Example:
 * 9:00 AM -> 6:00 PM
 * = 9 hours elapsed
 * - 1 hour lunch
 * = 8 hours worked
 */
export const getWorkedMinutes = (clockIn, clockOut) => {
  if (!clockIn || !clockOut) {
    return 0;
  }

  const start = new Date(clockIn);
  const end = new Date(clockOut);

  // Invalid date protection
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  if (totalMinutes <= 0) {
    return 0;
  }

  // 1 hour lunch deduction
  return Math.max(0, totalMinutes - LUNCH_MINUTES);
};

export const getWorkDifference = (clockIn, clockOut) => {
  if (!clockIn || !clockOut) {
    return 0;
  }

  const workedMinutes = getWorkedMinutes(clockIn, clockOut);

  return workedMinutes - WORK_DAY_MINUTES;
};

export const formatDuration = (minutes) => {
  if (
    minutes === null ||
    minutes === undefined ||
    Number.isNaN(Number(minutes))
  ) {
    return "0h 00m";
  }

  const totalMinutes = Math.round(Math.abs(Number(minutes)));

  const hours = Math.floor(totalMinutes / 60);

  const mins = totalMinutes % 60;

  return `${hours}h ${String(mins).padStart(2, "0")}m`;
};

export const calculateLeaveDays = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return 0;
  }

  return Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
};

export const fmtTime = (value) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
};

export const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const daysBetween = (a, b) =>
  Math.round((new Date(b) - new Date(a)) / 86400000) + 1;

export const LEAVE_TYPES = ["Annual", "Sick"];

export function fmtTimeAmPm(timeStr) {
  if (!timeStr) return null;
  const [hourStr, minuteStr] = timeStr.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${period}`;
}

export function getWeekDates(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);

  // Sunday = 0
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + index);

    return d.toISOString().slice(0, 10);
  });
}

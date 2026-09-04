import { isoToBSLabel } from "./nepaliCalendar";

export const WORK_DAY_MINUTES = 8 * 60;
export const LUNCH_MINUTES = 0; // Work hours is 8 hours including lunch

/**
 * Returns today's date in YYYY-MM-DD in the Nepal timezone (Asia/Kathmandu).
 */
export const todayISO = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

/**
 * Calculates actual working time (8-hour work day including lunch).
 *
 * Example:
 * 10:00 AM -> 6:00 PM
 * = 8 hours elapsed (lunch included)
 * = 8 hours worked
 */
export const getWorkedMinutes = (clockIn, clockOut, breakMinutes = 0) => {
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

  const breakMins = Math.max(0, Number(breakMinutes) || 0);

  // Work hour is 8 hours including lunch, minus any personal break time
  return Math.max(0, totalMinutes - LUNCH_MINUTES - breakMins);
};

export const getWorkDifference = (clockIn, clockOut, breakMinutes = 0) => {
  if (!clockIn || !clockOut) {
    return 0;
  }

  const workedMinutes = getWorkedMinutes(clockIn, clockOut, breakMinutes);

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

  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
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

export const fmtDate = (iso) => {
  if (!iso) return "—";
  return isoToBSLabel(iso);
};

export const daysBetween = (a, b) => {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = new Date(ay, am - 1, ad);
  const db = new Date(by, bm - 1, bd);
  return Math.round((db.getTime() - da.getTime()) / 86400000) + 1;
};

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
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = Sunday ... 6 = Saturday

  // Sunday = 0
  const sunday = new Date(year, month - 1, day - dayOfWeek);

  return Array.from({ length: 7 }, (_, index) => {
    const cur = new Date(
      sunday.getFullYear(),
      sunday.getMonth(),
      sunday.getDate() + index,
    );
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
}


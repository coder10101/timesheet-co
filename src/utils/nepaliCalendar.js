import bs from "bikram-sambat";
import { todayISO } from "./timezone";

export const NEPALI_MONTHS = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n) {
  return String(n).padStart(2, "0");
}

export function getTodayBS() {
  const iso = todayISO();
  return bs.toBik(iso); // { year, month, day } — month is 1-indexed
}

// weekday: 0=Sun ... 6=Sat, matching JS Date.getDay()
function weekdayOf(bsYear, bsMonth, bsDay) {
  const greg = bs.toGreg(bsYear, bsMonth, bsDay);
  const d = new Date(greg.year, greg.month - 1, greg.day);
  return d.getDay();
}

export function bsDateToISO(bsYear, bsMonth, bsDay) {
  const greg = bs.toGreg(bsYear, bsMonth, bsDay);
  return `${greg.year}-${pad(greg.month)}-${pad(greg.day)}`;
}

/**
 * Builds a calendar grid for the given BS year/month.
 * Returns an array of weeks, each an array of 7 cells (or null for padding).
 * Each cell: { bsDay, isoDate, isWeekend, holidayName }
 */
export function buildMonthGrid(
  bsYear,
  bsMonth,
  holidaysByIso = {},
  eventsByIso = {},
) {
  const daysInMonth = bs.daysInMonth(bsYear, bsMonth);
  const firstWeekday = weekdayOf(bsYear, bsMonth, 1);

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const isoDate = bsDateToISO(bsYear, bsMonth, d);
    const weekday = weekdayOf(bsYear, bsMonth, d);
    cells.push({
      bsDay: d,
      isoDate,
      isWeekend: weekday === 6,
      holidayName: holidaysByIso[isoDate] || null,
      events: eventsByIso[isoDate] || [],
    });
  }

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function addMonths(bsYear, bsMonth, delta) {
  let year = bsYear;
  let month = bsMonth + delta;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  return { year, month };
}

// used to check "is today off" for the clock-in gate
export function isWeekendISO(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  return d.getDay() === 6;
}

export function getCurrentBSMonthInfo() {
  const { year, month } = getTodayBS();
  const totalDays = bs.daysInMonth(year, month);
  const startISO = bsDateToISO(year, month, 1);
  const endISO = bsDateToISO(year, month, totalDays);
  return { year, month, totalDays, startISO, endISO };
}

export function isoToBS(iso) {
  if (!iso || !String(iso).trim()) return null;
  const clean = String(iso).trim();

  // 1. Bikram Sambat YYYY/MM/DD or YYYY-MM-DD (year between 2000 and 2150)
  const bsMatch = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (bsMatch) {
    const y = parseInt(bsMatch[1], 10);
    const m = parseInt(bsMatch[2], 10);
    const d = parseInt(bsMatch[3], 10);
    if (y >= 2000 && y <= 2150 && m >= 1 && m <= 12) {
      return { year: y, month: m, day: d };
    }
  }

  // 2. Shorthand M/D (e.g. 7/26)
  const shortMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (shortMatch) {
    const m = parseInt(shortMatch[1], 10);
    const d = parseInt(shortMatch[2], 10);
    if (m >= 1 && m <= 12) {
      const curYear = getTodayBS().year || 2081;
      return { year: curYear, month: m, day: d };
    }
  }

  // 3. Standard Gregorian ISO string YYYY-MM-DD
  try {
    const cleanIso = clean.slice(0, 10);
    const res = bs.toBik(cleanIso);
    if (res && typeof res.year === "number" && typeof res.month === "number") {
      return res;
    }
    return null;
  } catch {
    return null;
  }
}

export function isoToBSLabel(iso) {
  if (!iso || !String(iso).trim()) return "—";
  const d = isoToBS(iso);
  if (d && d.year && d.month && d.day) {
    const monthName = NEPALI_MONTHS[d.month - 1] || `Month ${d.month}`;
    return `${d.day} ${monthName}, ${d.year}`;
  }
  return String(iso);
}


export function getDaysInBSMonth(year, month) {
  return bs.daysInMonth(year, month);
}

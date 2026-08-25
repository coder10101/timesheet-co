import bs from "bikram-sambat";

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
  const iso = new Date().toISOString().slice(0, 10);
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
  return bs.toBik(iso);
}

export function isoToBSLabel(iso) {
  const d = bs.toBik(iso);
  return `${d.day} ${NEPALI_MONTHS[d.month - 1]}, ${d.year}`;
}

export function getDaysInBSMonth(year, month) {
  return bs.daysInMonth(year, month);
}

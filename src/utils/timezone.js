const NEPAL_TIMEZONE = "Asia/Kathmandu";

/**
 * Convert a Supabase UTC timestamp
 * into a value suitable for:
 * <input type="datetime-local" />
 *
 * Example:
 * 2026-08-19T03:15:00Z
 * -> 2026-08-19T09:00
 */
export function toNepalDateTimeLocal(isoString) {
  if (!isoString) return "";

  const date = new Date(isoString);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NEPAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}T${get(
    "hour",
  )}:${get("minute")}`;
}

/**
 * Convert Nepal datetime-local value
 * into UTC ISO timestamp for Supabase.
 *
 * Example:
 * 2026-08-19T09:00
 * -> 2026-08-19T03:15:00.000Z
 */
export function nepalDateTimeToISO(localValue) {
  if (!localValue) return null;

  const [datePart, timePart] = localValue.split("T");

  const [year, month, day] = datePart.split("-").map(Number);

  const [hour, minute] = timePart.split(":").map(Number);

  // Nepal is UTC+05:45
  const utcDate = new Date(
    Date.UTC(year, month - 1, day, hour, minute) -
      5 * 60 * 60 * 1000 -
      45 * 60 * 1000,
  );

  return utcDate.toISOString();
}

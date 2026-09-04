import { WORK_DAY_HOURS } from "./workTime";

/**
 * Utility for detecting, parsing, and formatting Work Log categories:
 * - Desk Work ('desk')
 * - Site Visit ('site') with optional duration ('1h', '2h', '4h', 'Full Day')
 */

const SITE_TAG_REGEX = /^\[Site Visit(?:\s*·\s*([^\]]+))?\]\s*/i;

export function parseWorkLogEntry(entry) {
  if (!entry) return { workType: "desk", duration: null, cleanText: "" };

  const rawText = entry.entry_text || "";
  const match = rawText.match(SITE_TAG_REGEX);

  const isSite = entry.work_type === "site" || !!match;
  const duration = match && match[1] ? match[1].trim() : (entry.duration || null);
  const cleanText = match ? rawText.replace(SITE_TAG_REGEX, "") : rawText;

  return {
    workType: isSite ? "site" : "desk",
    duration,
    cleanText,
  };
}

export function formatWorkLogEntryText(text, workType, duration) {
  const trimmed = text ? text.trim() : "";
  if (workType === "site") {
    const durLabel = duration ? ` · ${duration}` : "";
    return `[Site Visit${durLabel}] ${trimmed}`;
  }
  return trimmed;
}

/**
 * Summarize site visits for a specific date from an array of work logs.
 */
export function getSiteSummaryForDate(entries, dateISO, targetWorkDayHours = WORK_DAY_HOURS) {
  if (!entries || !entries.length) {
    return {
      hasSiteVisit: false,
      isFullDay: false,
      totalHours: 0,
      entries: [],
    };
  }

  const workDayHours = Number(targetWorkDayHours) || WORK_DAY_HOURS;
  const dateEntries = entries.filter((e) => e.date === dateISO);
  const siteEntries = [];
  let totalHours = 0;
  let isFullDay = false;

  dateEntries.forEach((e) => {
    const parsed = parseWorkLogEntry(e);
    if (parsed.workType === "site") {
      siteEntries.push({ ...e, parsed });
      if (parsed.duration) {
        const dLower = parsed.duration.toLowerCase();
        if (
          dLower.includes("full") ||
          dLower.includes(`${workDayHours}h`) ||
          dLower.includes(`${workDayHours} h`) ||
          dLower.includes("7h") ||
          dLower.includes("8h")
        ) {
          isFullDay = true;
          totalHours += workDayHours;
        } else {
          const numMatch = parsed.duration.match(/(\d+(?:\.\d+)?)/);
          if (numMatch) {
            const h = parseFloat(numMatch[1]);
            totalHours += h;
            if (h >= workDayHours) isFullDay = true;
          } else {
            totalHours += 2;
          }
        }
      } else {
        totalHours += 2;
      }
    }
  });

  return {
    hasSiteVisit: siteEntries.length > 0,
    isFullDay: isFullDay || totalHours >= workDayHours,
    totalHours,
    entries: siteEntries,
  };
}

export const HALF_DAY_SESSIONS = {
  FIRST_HALF: "first_half",
  SECOND_HALF: "second_half",
};

/**
 * Returns dynamic session labels based on office schedule.
 * e.g. "First Half (Morning: 10:00 AM – 01:30 PM)"
 */
export function getSessionLabels(schedule) {
  const start = schedule?.startTimeAmPm || "10:00 AM";
  const mid = schedule?.halfDayMidTimeAmPm || "01:30 PM";
  const end = schedule?.endTimeAmPm || "05:00 PM";
  return {
    first_half: `First Half (Morning: ${start} – ${mid})`,
    second_half: `Second Half (Afternoon: ${mid} – ${end})`,
  };
}

export function formatSessionLabel(session, schedule) {
  const labels = getSessionLabels(schedule);
  return labels[session] || "Half Day";
}

export const SESSION_LABELS = getSessionLabels();

export const SESSION_SHORT_LABELS = {
  first_half: "First Half · Morning",
  second_half: "Second Half · Afternoon",
};

export function isHalfDayLeave(leave) {
  if (!leave) return false;
  const numDays = Number(leave.days);
  if (numDays === 0.5) return true;
  if (typeof leave.reason === "string") {
    return (
      leave.reason.includes("[First Half") ||
      leave.reason.includes("[Second Half") ||
      leave.reason.includes("[Half Day")
    );
  }
  return false;
}

export function getHalfDaySession(leave) {
  if (!leave) return null;
  const r = leave.reason || "";
  if (r.includes("[Second Half") || r.includes("Afternoon")) {
    return HALF_DAY_SESSIONS.SECOND_HALF;
  }
  if (r.includes("[First Half") || r.includes("Morning")) {
    return HALF_DAY_SESSIONS.FIRST_HALF;
  }
  return isHalfDayLeave(leave) ? HALF_DAY_SESSIONS.FIRST_HALF : null;
}

export function formatLeaveDays(days) {
  const n = Number(days);
  if (Number.isNaN(n)) return "0 days";
  if (n === 0.5) return "0.5 day";
  if (n === 1) return "1 day";
  return `${n % 1 === 0 ? n : n.toFixed(1)} days`;
}

export function formatLeaveBalance(balance) {
  const n = Number(balance);
  if (Number.isNaN(n)) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export function cleanLeaveReason(reason) {
  if (!reason) return "";
  return reason
    .replace(/^\[(First Half|Second Half|Half Day)[^\]]*\]\s*/i, "")
    .trim();
}

export function buildLeaveReason(session, customReason) {
  const trimmed = (customReason || "").trim();
  if (!session) return trimmed;
  const tag =
    session === HALF_DAY_SESSIONS.SECOND_HALF
      ? "[Second Half · Afternoon]"
      : "[First Half · Morning]";
  return trimmed ? `${tag} ${trimmed}` : tag;
}

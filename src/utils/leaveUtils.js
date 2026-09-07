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

export const LEAVE_QUOTAS = {
  Annual: 24,
  Sick: 6,
};

export function isHalfDayLeave(leave) {
  if (!leave) return false;
  const numDays = Number(leave.days);
  if (numDays === 0.5) return true;
  if (leave.durationMode === "half") return true;
  if (
    leave.session === HALF_DAY_SESSIONS.FIRST_HALF ||
    leave.session === HALF_DAY_SESSIONS.SECOND_HALF
  ) {
    return true;
  }
  if (typeof leave.reason === "string") {
    const r = leave.reason.toLowerCase();
    return (
      r.includes("first half") ||
      r.includes("second half") ||
      r.includes("half day") ||
      r.includes("half-day") ||
      r.includes("morning") ||
      r.includes("afternoon")
    );
  }
  return false;
}

export function getHalfDaySession(leave) {
  if (!leave) return null;
  if (
    leave.session === HALF_DAY_SESSIONS.FIRST_HALF ||
    leave.session === HALF_DAY_SESSIONS.SECOND_HALF
  ) {
    return leave.session;
  }
  const r = (leave.reason || "").toLowerCase();
  if (r.includes("second half") || r.includes("afternoon")) {
    return HALF_DAY_SESSIONS.SECOND_HALF;
  }
  if (r.includes("first half") || r.includes("morning")) {
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
  const rounded = Math.round(n * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

/**
 * Calculates used and remaining leave days for an employee given a list of leave requests.
 * @param {Array} leaveRequests - list of requests for the employee (or all org requests)
 * @param {string} employeeId - employee id to calculate for
 * @param {string} leaveType - "Annual" | "Sick"
 * @param {number} customAllowance - optional override for max quota (defaults to 24 for Annual, 6 for Sick)
 */
export function calculateEmployeeLeaveStats(
  leaveRequests,
  employeeId,
  leaveType,
  customAllowance,
) {
  const maxQuota =
    customAllowance ??
    (LEAVE_QUOTAS[leaveType] || (leaveType === "Sick" ? 6 : 24));

  if (!leaveRequests || !employeeId) {
    return { used: 0, remaining: maxQuota, maxQuota };
  }

  const approvedDays = (leaveRequests || [])
    .filter(
      (r) =>
        r.employee_id === employeeId &&
        r.type === leaveType &&
        r.status === "Approved",
    )
    .reduce((sum, r) => {
      const isHalf = isHalfDayLeave(r);
      return sum + (isHalf ? 0.5 : Number(r.days) || 1);
    }, 0);

  const roundedUsed = Math.round(approvedDays * 10) / 10;
  const remaining = Math.max(0, Math.round((maxQuota - roundedUsed) * 10) / 10);

  return {
    used: roundedUsed,
    remaining,
    maxQuota,
  };
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

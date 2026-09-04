import { createContext, useContext, useMemo, createElement } from "react";
import { useOrganization } from "../hooks/useOrgData";

/**
 * Default office configuration for this company.
 * Workday: 7 hours (10:00 AM – 5:00 PM, lunch included in 7 hours).
 */
export const DEFAULT_OFFICE_CONFIG = {
  workDayHours: 7,
  includeLunch: true,
  lunchMinutes: 0,
  startTime: "10:00",
  graceMinutes: 30,
};

/**
 * Formats 24h hour and minute to 12h AM/PM string (e.g. "10:00 AM", "05:00 PM").
 */
export function formatAmPm(h, m) {
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Computes all derived schedule times, targets, and helper functions
 * for any given office configuration object.
 */
export function computeOfficeSchedule(rawConfig) {
  const config = {
    ...DEFAULT_OFFICE_CONFIG,
    ...(rawConfig || {}),
  };

  const workDayHours = Number(config.workDayHours) || DEFAULT_OFFICE_CONFIG.workDayHours;
  const workDayMinutes = Math.round(workDayHours * 60);
  const lunchMinutes = config.includeLunch ? 0 : Number(config.lunchMinutes) || 0;

  const halfDayHours = workDayHours / 2;
  const halfDayMinutes = Math.round(workDayMinutes / 2);

  const [startH, startM] = (config.startTime || "10:00").split(":").map(Number);
  const startTime = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
  const startTimeMinutes = startH * 60 + startM;
  const startTimeAmPm = formatAmPm(startH, startM);

  const graceMinutes = Number(config.graceMinutes) ?? 30;
  const graceMinutesTotal = startTimeMinutes + graceMinutes;
  const graceH = Math.floor(graceMinutesTotal / 60) % 24;
  const graceM = graceMinutesTotal % 60;
  const graceTimeAmPm = formatAmPm(graceH, graceM);

  // End time = startTime + workDayMinutes + (if lunch not included, lunchMinutes)
  const endMinutesTotal = startTimeMinutes + workDayMinutes + (config.includeLunch ? 0 : lunchMinutes);
  const endH = Math.floor(endMinutesTotal / 60) % 24;
  const endM = endMinutesTotal % 60;
  const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  const endTimeAmPm = formatAmPm(endH, endM);

  // Half day split time = startTime + halfDayMinutes
  const midMinutesTotal = startTimeMinutes + halfDayMinutes;
  const midH = Math.floor(midMinutesTotal / 60) % 24;
  const midM = midMinutesTotal % 60;
  const halfDayMidTime = `${String(midH).padStart(2, "0")}:${String(midM).padStart(2, "0")}`;
  const halfDayMidTimeAmPm = formatAmPm(midH, midM);

  const shiftLabel = `Shift: ${startTimeAmPm} – ${endTimeAmPm} (${workDayHours}h ${config.includeLunch ? "incl." : "excl."} lunch)`;

  return {
    rawConfig: config,
    workDayHours,
    workDayMinutes,
    includeLunch: !!config.includeLunch,
    lunchMinutes,
    halfDayHours,
    halfDayMinutes,
    startTime,
    startH,
    startM,
    startTimeMinutes,
    startTimeAmPm,
    graceMinutes,
    graceMinutesTotal,
    graceTimeAmPm,
    endTime,
    endH,
    endM,
    endMinutesTotal,
    endTimeAmPm,
    halfDayMidTime,
    halfDayMidMinutes: midMinutesTotal,
    halfDayMidTimeAmPm,
    shiftLabel,
  };
}

// Pre-computed default schedule (for direct imports in pure utilities)
export const DEFAULT_SCHEDULE = computeOfficeSchedule(DEFAULT_OFFICE_CONFIG);
export const WORK_DAY_HOURS = DEFAULT_SCHEDULE.workDayHours;
export const WORK_DAY_MINUTES = DEFAULT_SCHEDULE.workDayMinutes;
export const LUNCH_MINUTES = DEFAULT_SCHEDULE.lunchMinutes;
export const HALF_DAY_HOURS = DEFAULT_SCHEDULE.halfDayHours;
export const HALF_DAY_MINUTES = DEFAULT_SCHEDULE.halfDayMinutes;
export const OFFICE_START_TIME = DEFAULT_SCHEDULE.startTime;
export const OFFICE_START_TIME_AMPM = DEFAULT_SCHEDULE.startTimeAmPm;
export const OFFICE_END_TIME = DEFAULT_SCHEDULE.endTime;
export const OFFICE_END_TIME_AMPM = DEFAULT_SCHEDULE.endTimeAmPm;
export const OFFICE_GRACE_TIME_AMPM = DEFAULT_SCHEDULE.graceTimeAmPm;
export const HALF_DAY_MID_TIME = DEFAULT_SCHEDULE.halfDayMidTime;
export const HALF_DAY_MID_TIME_AMPM = DEFAULT_SCHEDULE.halfDayMidTimeAmPm;

/* ---------------- Context & Provider ---------------- */

export const OfficeHoursContext = createContext(DEFAULT_SCHEDULE);

export function OfficeHoursProvider({ orgId, children }) {
  const { organization, updateOfficeHours, isLoading } = useOrganization(orgId);

  const schedule = useMemo(() => {
    const rawOfficeHours = organization?.office_hours;
    return computeOfficeSchedule(rawOfficeHours);
  }, [organization?.office_hours]);

  const value = useMemo(
    () => ({
      ...schedule,
      orgId,
      organizationName: organization?.name || "Organization",
      isLoadingOrg: isLoading,
      updateOfficeHours,
    }),
    [schedule, orgId, organization?.name, isLoading, updateOfficeHours],
  );

  return createElement(OfficeHoursContext.Provider, { value }, children);
}

export function useOfficeHours() {
  const ctx = useContext(OfficeHoursContext);
  return ctx || DEFAULT_SCHEDULE;
}

/**
 * Centralized Data Hooks Facade
 *
 * Re-exports domain-specific hooks for 100% backward compatibility
 * across all existing imports in the application while keeping files
 * small, maintainable, and modular.
 */

export { isAdminProfile, isRegularStaff } from "../utils/userUtils";

// Domain: Attendance & Clock-in/Clock-out
export * from "./useAttendanceData";

// Domain: Work Logs & Realtime Project Rollups
export * from "./useWorkLogsData";

// Domain: Leaves & Balance Sync
export * from "./useLeavesData";

// Domain: Team Roster & Coworker Cache
export * from "./useRosterData";

// Domain: Projects, Stage & Track Progress
export * from "./useProjectsData";

// Domain: Calendar Holidays, Events & Organization Settings
export * from "./useHolidaysData";

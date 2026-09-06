/**
 * User and Profile Role Utilities
 */

/**
 * Checks whether an employee profile is an administrator.
 */
export function isAdminProfile(profile) {
  if (!profile) return false;
  return (
    profile.role?.toLowerCase() === "admin" ||
    profile.title?.toLowerCase() === "admin"
  );
}

/**
 * Checks whether an employee profile is regular staff (non-admin).
 */
export function isRegularStaff(profile) {
  return !isAdminProfile(profile);
}

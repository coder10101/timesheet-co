export const COLORS = {
  // Brand
  primary: "#63537E",
  primaryDark: "#514366",
  primaryLight: "#EEEAF2",

  // Status
  success: "#497833",
  successDark: "#3E8F18",
  successLight: "#E8F5E2",

  alert: "#913030",
  alertDark: "#8F1E1E",
  alertLight: "#F7E3E3",

  warning: "#7A5A17",
  warningLight: "#F8F2E3",

  // Text
  text: "#292722",
  textTitle: "#4A4738",
  textMuted: "#7A7362",
  textSubtle: "#9A9383",
  textFaint: "#B6B0A2",

  // Borders / surfaces
  border: "#EEEAE0",
  borderLight: "#EDE9DF",
  surface: "#FAF9F6",
  surfaceMuted: "#F7F5F0",
  white: "#FFFFFF",

  // Other
  overtime: "#224433ff",
  undertime: "#F2A89A",
  dot: "#DDD8CB",
};

export const EMPLOYEE_AVATAR_COLORS = [
  "#63537E", // Brand Primary
  "#2E6B56", // Forest Green
  "#913030", // Brand Alert
  "#3A6888", // Ocean Slate
  "#7A5A17", // Warm Amber
  "#80486D", // Deep Mulberry
  "#2F7275", // Dark Cyan / Teal
  "#5A587A", // Slate Plum
  "#7B4E38", // Cinnamon Brown
  "#446E4B", // Olive Sage
];

/**
 * Returns a consistent, deterministic hex color for any employee by ID or name.
 * Guarantees that each employee has the identical avatar color in Team, Work Logs, Attendance, Overview, and Leave.
 */
export function getEmployeeColor(employeeOrId, fallbackName = "") {
  let key = "";
  if (typeof employeeOrId === "object" && employeeOrId !== null) {
    key = employeeOrId.id || employeeOrId.name || fallbackName || "";
  } else if (typeof employeeOrId === "string") {
    key = employeeOrId || fallbackName || "";
  } else {
    key = fallbackName || "default";
  }

  if (!key) return EMPLOYEE_AVATAR_COLORS[0];

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % EMPLOYEE_AVATAR_COLORS.length;
  return EMPLOYEE_AVATAR_COLORS[index];
}


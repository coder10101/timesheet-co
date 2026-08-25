import { COLORS } from "./src/constants/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: COLORS.primary,
          dark: COLORS.primaryDark,
          light: COLORS.primaryLight,
        },

        success: {
          DEFAULT: COLORS.success,
          dark: COLORS.successDark,
          light: COLORS.successLight,
        },

        alert: {
          DEFAULT: COLORS.alert,
          dark: COLORS.alertDark,
          light: COLORS.alertLight,
        },

        warning: {
          DEFAULT: COLORS.warning,
          light: COLORS.warningLight,
        },

        text: {
          DEFAULT: COLORS.text,
          muted: COLORS.textMuted,
          subtle: COLORS.textSubtle,
          faint: COLORS.textFaint,
        },

        surface: {
          DEFAULT: COLORS.surface,
          muted: COLORS.surfaceMuted,
        },

        border: {
          DEFAULT: COLORS.border,
          light: COLORS.borderLight,
        },

        overtime: COLORS.overtime,
        undertime: COLORS.undertime,

        attendance: {
          dark: COLORS.attendanceDark,
          mid: COLORS.attendanceMid,
          light: COLORS.attendanceLight,
        },
      },
    },
  },
  plugins: [],
};

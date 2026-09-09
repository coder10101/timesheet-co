import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { nepalDateTimeToISO, todayISO } from "../utils/timezone";

export const calculateBreaksTotalMins = (breaksList, fallbackMins = 0) => {
  if (!Array.isArray(breaksList) || breaksList.length === 0) {
    return Math.max(0, Number(fallbackMins) || 0);
  }
  const totalMs = breaksList.reduce((acc, b) => {
    if (b?.start && b?.end) {
      const ms = new Date(b.end).getTime() - new Date(b.start).getTime();
      return acc + (isNaN(ms) || ms < 0 ? 0 : ms);
    }
    if (b?.duration_seconds) {
      return acc + Math.max(0, Number(b.duration_seconds) * 1000);
    }
    if (b?.duration) {
      return acc + Math.max(0, Number(b.duration) * 60000);
    }
    return acc;
  }, 0);
  return Math.floor(totalMs / 60000);
};

/* ---------------- Attendance for specific employee ---------------- */
export function useAttendance(employeeId) {
  const qc = useQueryClient();
  const key = ["attendance", employeeId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .order("date", { ascending: false });
      if (error) throw error;

      return (data || []).map((r) => {
        let break_minutes = r.break_minutes ?? 0;
        let break_start = r.break_start ?? null;
        let breaks = Array.isArray(r.breaks) ? r.breaks : [];
        try {
          const localActive = localStorage.getItem(
            `break_start_${r.employee_id}_${r.date}`,
          );
          if (localActive && !break_start) break_start = localActive;
          const localData = localStorage.getItem(
            `break_data_${r.employee_id}_${r.date}`,
          );
          if (localData) {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed.breaks) && parsed.breaks.length > 0) {
              breaks = parsed.breaks;
            }
            if (r.break_minutes === null || r.break_minutes === undefined) {
              break_minutes = parsed.break_minutes || 0;
            }
          }
        } catch (_) {}

        if (breaks.length > 0) {
          break_minutes = calculateBreaksTotalMins(breaks, break_minutes);
        }

        return {
          ...r,
          break_minutes,
          break_start,
          breaks,
        };
      });
    },
    enabled: !!employeeId,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const clockIn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance").insert({
        employee_id: employeeId,
        date: todayISO(),
        clock_in: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      const today = todayISO();
      const now = new Date();
      const nowISO = now.toISOString();
      let startISO = null;
      try {
        startISO = localStorage.getItem(`break_start_${employeeId}_${today}`);
        localStorage.removeItem(`break_start_${employeeId}_${today}`);
      } catch (_) {}

      const currentRecord = (query.data || []).find((r) => r.date === today);
      const activeStart = currentRecord?.break_start || startISO;
      const existingBreaks = Array.isArray(currentRecord?.breaks)
        ? currentRecord.breaks
        : [];
      let updatedBreaks = existingBreaks;
      let totalBreakMinutes = currentRecord?.break_minutes || 0;

      if (activeStart) {
        const diffMs = Math.max(
          0,
          now.getTime() - new Date(activeStart).getTime(),
        );
        const newBreakItem = {
          start: activeStart,
          end: nowISO,
          duration_seconds: Math.round(diffMs / 1000),
        };
        updatedBreaks = [...existingBreaks, newBreakItem];
        totalBreakMinutes = calculateBreaksTotalMins(
          updatedBreaks,
          (currentRecord?.break_minutes || 0) + Math.floor(diffMs / 60000),
        );

        try {
          localStorage.setItem(
            `break_data_${employeeId}_${today}`,
            JSON.stringify({
              break_minutes: totalBreakMinutes,
              breaks: updatedBreaks,
            }),
          );
        } catch (_) {}
      }

      const updateData = {
        clock_out: nowISO,
        break_start: null,
        break_minutes: totalBreakMinutes,
        breaks: updatedBreaks,
      };

      const { error } = await supabase
        .from("attendance")
        .update(updateData)
        .eq("employee_id", employeeId)
        .eq("date", today);

      if (error) {
        if (error.code === "42703" || error.message?.includes("break")) {
          delete updateData.break_start;
          delete updateData.break_minutes;
          delete updateData.breaks;
          const { error: err2 } = await supabase
            .from("attendance")
            .update(updateData)
            .eq("employee_id", employeeId)
            .eq("date", today);
          if (err2) throw err2;
        } else {
          throw error;
        }
      }
    },
    onSuccess: invalidate,
  });

  const startBreak = useMutation({
    mutationFn: async () => {
      const nowISO = new Date().toISOString();
      const today = todayISO();

      try {
        localStorage.setItem(`break_start_${employeeId}_${today}`, nowISO);
      } catch (_) {}

      const { error } = await supabase
        .from("attendance")
        .update({ break_start: nowISO })
        .eq("employee_id", employeeId)
        .eq("date", today);

      if (
        error &&
        error.code !== "42703" &&
        !error.message?.includes("break_start")
      ) {
        throw error;
      }
    },
    onSuccess: invalidate,
  });

  const endBreak = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const nowISO = now.toISOString();
      const today = todayISO();

      const currentRecord = (query.data || []).find((r) => r.date === today);
      let startISO = currentRecord?.break_start;
      if (!startISO) {
        try {
          startISO = localStorage.getItem(`break_start_${employeeId}_${today}`);
        } catch (_) {}
      }

      const diffMs = startISO
        ? Math.max(0, now.getTime() - new Date(startISO).getTime())
        : 0;

      const existingBreaks = Array.isArray(currentRecord?.breaks)
        ? currentRecord.breaks
        : [];
      const newBreakItem = {
        start: startISO || nowISO,
        end: nowISO,
        duration_seconds: Math.round(diffMs / 1000),
      };
      const updatedBreaks = [...existingBreaks, newBreakItem];
      const totalBreakMinutes = calculateBreaksTotalMins(
        updatedBreaks,
        (currentRecord?.break_minutes || 0) + Math.floor(diffMs / 60000),
      );

      try {
        localStorage.removeItem(`break_start_${employeeId}_${today}`);
        localStorage.setItem(
          `break_data_${employeeId}_${today}`,
          JSON.stringify({
            break_minutes: totalBreakMinutes,
            breaks: updatedBreaks,
          }),
        );
      } catch (_) {}

      const { error } = await supabase
        .from("attendance")
        .update({
          break_start: null,
          break_minutes: totalBreakMinutes,
          breaks: updatedBreaks,
        })
        .eq("employee_id", employeeId)
        .eq("date", today);

      if (
        error &&
        error.code !== "42703" &&
        !error.message?.includes("break")
      ) {
        throw error;
      }
    },
    onSuccess: invalidate,
  });

  const updateAttendance = useMutation({
    mutationFn: async ({
      attendanceId,
      clockIn,
      clockOut,
      clock_in,
      clock_out,
      breakMinutes,
      break_minutes,
      date,
    }) => {
      const rawIn = clockIn !== undefined ? clockIn : clock_in;
      const rawOut = clockOut !== undefined ? clockOut : clock_out;
      const rawBreak =
        breakMinutes !== undefined ? breakMinutes : break_minutes;

      const formatField = (val) => {
        if (!val) return null;
        if (
          typeof val === "string" &&
          val.endsWith("Z") &&
          !val.includes("undefined")
        ) {
          return val;
        }
        return nepalDateTimeToISO(val);
      };

      const finalIn = formatField(rawIn);
      const finalOut = formatField(rawOut);
      const finalBreak =
        rawBreak !== undefined && rawBreak !== null ? Number(rawBreak) : 0;

      const payload = {
        clock_in: finalIn,
        clock_out: finalOut,
        break_minutes: finalBreak,
      };

      if (date) {
        try {
          localStorage.setItem(
            `break_data_${employeeId}_${date}`,
            JSON.stringify({ break_minutes: finalBreak }),
          );
        } catch (_) {}
      }

      if (attendanceId) {
        let { error } = await supabase
          .from("attendance")
          .update(payload)
          .eq("id", attendanceId)
          .eq("employee_id", employeeId);

        if (
          error &&
          (error.code === "42703" || error.message?.includes("break"))
        ) {
          delete payload.break_minutes;
          const { error: err2 } = await supabase
            .from("attendance")
            .update(payload)
            .eq("id", attendanceId)
            .eq("employee_id", employeeId);
          if (err2) throw err2;
        } else if (error) {
          throw error;
        }
      } else if (date) {
        let { error } = await supabase.from("attendance").upsert(
          {
            employee_id: employeeId,
            date,
            ...payload,
          },
          { onConflict: "employee_id,date" },
        );

        if (
          error &&
          (error.code === "42703" || error.message?.includes("break"))
        ) {
          delete payload.break_minutes;
          const { error: err2 } = await supabase.from("attendance").upsert(
            {
              employee_id: employeeId,
              date,
              ...payload,
            },
            { onConflict: "employee_id,date" },
          );
          if (err2) throw err2;
        } else if (error) {
          throw error;
        }
      } else {
        throw new Error("Missing attendance record ID or date.");
      }
    },
    onSuccess: invalidate,
  });

  return {
    records: query.data ?? null,
    isLoading: query.isLoading,
    clockIn: () => clockIn.mutateAsync(),
    clockInPending: clockIn.isPending,
    clockOut: () => clockOut.mutateAsync(),
    startBreak: () => startBreak.mutateAsync(),
    startBreakPending: startBreak.isPending,
    endBreak: () => endBreak.mutateAsync(),
    endBreakPending: endBreak.isPending,
    updateAttendance: (attendanceIdOrPayload, maybePayload) => {
      if (
        typeof attendanceIdOrPayload === "object" &&
        attendanceIdOrPayload !== null
      ) {
        return updateAttendance.mutateAsync(attendanceIdOrPayload);
      }
      return updateAttendance.mutateAsync({
        attendanceId: attendanceIdOrPayload,
        ...maybePayload,
      });
    },
  };
}

/* ---------------- Org-wide attendance (admin) ---------------- */
export function useOrgAttendance(dateOrOptions) {
  const isDateString = typeof dateOrOptions === "string";
  const date = isDateString ? dateOrOptions : dateOrOptions?.date;
  const fromDate = !isDateString ? dateOrOptions?.fromDate : null;
  const toDate = !isDateString ? dateOrOptions?.toDate : null;

  const key = [
    "org-attendance",
    date
      ? `date:${date}`
      : fromDate
        ? `range:${fromDate}-${toDate || "latest"}`
        : "all",
  ];

  const isTodayOnly = date === todayISO();

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase
        .from("attendance")
        .select("*")
        .order("clock_in", { ascending: true });

      if (date) {
        q = q.eq("date", date);
      } else if (fromDate) {
        q = q.gte("date", fromDate);
        if (toDate) {
          q = q.lte("date", toDate);
        }
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((r) => {
        let break_minutes = r.break_minutes ?? 0;
        let break_start = r.break_start ?? null;
        let breaks = r.breaks ?? [];
        try {
          const localActive = localStorage.getItem(
            `break_start_${r.employee_id}_${r.date}`,
          );
          if (localActive && !break_start) break_start = localActive;
          const localData = localStorage.getItem(
            `break_data_${r.employee_id}_${r.date}`,
          );
          if (localData) {
            const parsed = JSON.parse(localData);
            if ((parsed.break_minutes || 0) > break_minutes) {
              break_minutes = parsed.break_minutes;
              breaks = parsed.breaks || breaks;
            }
          }
        } catch (_) {}

        return {
          ...r,
          break_minutes,
          break_start,
          breaks,
        };
      });
    },
    refetchInterval: isTodayOnly ? 30000 : false,
    staleTime: isTodayOnly ? 15000 : 1000 * 60 * 5,
  });

  return {
    records: query.data ?? null,
    isLoading: query.isLoading,
  };
}

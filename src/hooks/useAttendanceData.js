import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { nepalDateTimeToISO, todayISO } from "../utils/timezone";
import { useAuth } from "../lib/AuthProvider";
import { sendNotification } from "./useNotificationsData";
import { isoToBSLabel } from "../utils/nepaliCalendar";

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
  const auth = useAuth();
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
        let edit_history = Array.isArray(r.edit_history) ? r.edit_history : [];

        if (breaks.length > 0) {
          break_minutes = calculateBreaksTotalMins(breaks, break_minutes);
        }

        return {
          ...r,
          break_minutes,
          break_start,
          breaks,
          edit_history,
        };
      });
    },
    enabled: !!employeeId,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["org-attendance"] });
    qc.invalidateQueries({ queryKey: ["attendance"] });
  };

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
      let currentRecord = (query.data || []).find((r) => r.date === today);
      if (!currentRecord) {
        const { data: fetched } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", employeeId)
          .eq("date", today)
          .maybeSingle();
        currentRecord = fetched;
      }
      const activeStart = currentRecord?.break_start;
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

      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const startBreak = useMutation({
    mutationFn: async () => {
      const nowISO = new Date().toISOString();
      const today = todayISO();

      const { error } = await supabase
        .from("attendance")
        .update({ break_start: nowISO })
        .eq("employee_id", employeeId)
        .eq("date", today);

      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const endBreak = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const nowISO = now.toISOString();
      const today = todayISO();

      let currentRecord = (query.data || []).find((r) => r.date === today);
      if (!currentRecord) {
        const { data: fetched } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", employeeId)
          .eq("date", today)
          .maybeSingle();
        currentRecord = fetched;
      }
      const startISO = currentRecord?.break_start;

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

      const { error } = await supabase
        .from("attendance")
        .update({
          break_start: null,
          break_minutes: totalBreakMinutes,
          breaks: updatedBreaks,
        })
        .eq("employee_id", employeeId)
        .eq("date", today);

      if (error) throw error;
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
      reason,
      editorName,
      editorRole,
      targetEmployeeId,
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

      const effectiveEmpId = targetEmployeeId || employeeId;

      // Find existing record to compare changes and preserve prior history
      let existingRecord = (query.data || []).find((r) =>
        attendanceId ? r.id === attendanceId : r.date === date
      );
      if (!existingRecord && (attendanceId || (date && effectiveEmpId))) {
        let q = supabase.from("attendance").select("*");
        if (attendanceId) q = q.eq("id", attendanceId);
        else q = q.eq("employee_id", effectiveEmpId).eq("date", date);
        const { data: fetched } = await q.maybeSingle();
        existingRecord = fetched;
      }

      const existingHistory = Array.isArray(existingRecord?.edit_history)
        ? existingRecord.edit_history
        : [];

      // Detect field-level changes
      const changes = {};
      if (existingRecord) {
        if (finalIn !== undefined && finalIn !== (existingRecord.clock_in || null)) {
          changes.clock_in = {
            old: existingRecord.clock_in || null,
            new: finalIn,
          };
        }
        if (finalOut !== undefined && finalOut !== (existingRecord.clock_out || null)) {
          changes.clock_out = {
            old: existingRecord.clock_out || null,
            new: finalOut,
          };
        }
        const oldBreak = existingRecord.break_minutes || 0;
        if (finalBreak !== undefined && finalBreak !== oldBreak) {
          changes.break_minutes = {
            old: oldBreak,
            new: finalBreak,
          };
        }
      }

      const currentEditorName =
        editorName ||
        auth?.profile?.name ||
        auth?.user?.user_metadata?.name ||
        "Team Member";
      const currentEditorRole =
        editorRole || auth?.profile?.role || "employee";
      const currentEditorId = auth?.user?.id || null;

      let newHistory = existingHistory;
      if (existingRecord && Object.keys(changes).length > 0) {
        const historyEntry = {
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `edit-${Date.now()}`,
          edited_at: new Date().toISOString(),
          edited_by: currentEditorId,
          editor_name: currentEditorName,
          editor_role: currentEditorRole,
          reason: reason ? reason.trim() : "",
          changes,
        };

        newHistory = [historyEntry, ...existingHistory];
      }

      const basePayload = {
        clock_in: finalIn,
        clock_out: finalOut,
        break_minutes: finalBreak,
      };

      const payloadWithHistory = {
        ...basePayload,
        edit_history: newHistory,
      };

      const isAdmin = auth?.profile?.role === "admin";

      if (attendanceId) {
        let updateQuery = supabase
          .from("attendance")
          .update(payloadWithHistory)
          .eq("id", attendanceId);

        if (!isAdmin && effectiveEmpId) {
          updateQuery = updateQuery.eq("employee_id", effectiveEmpId);
        }

        let { error } = await updateQuery;

        // Resilient fallback if edit_history column doesn't exist yet
        if (error && (error.message?.includes("edit_history") || error.code === "42703")) {
          let fbQuery = supabase
            .from("attendance")
            .update(basePayload)
            .eq("id", attendanceId);
          if (!isAdmin && effectiveEmpId) {
            fbQuery = fbQuery.eq("employee_id", effectiveEmpId);
          }
          const res = await fbQuery;
          error = res.error;
        }

        if (error) throw error;
      } else if (date && effectiveEmpId) {
        let { error } = await supabase.from("attendance").upsert(
          {
            employee_id: effectiveEmpId,
            date,
            ...payloadWithHistory,
          },
          { onConflict: "employee_id,date" },
        );

        if (error && (error.message?.includes("edit_history") || error.code === "42703")) {
          const res = await supabase.from("attendance").upsert(
            {
              employee_id: effectiveEmpId,
              date,
              ...basePayload,
            },
            { onConflict: "employee_id,date" },
          );
          error = res.error;
        }

        if (error) throw error;
      } else {
        throw new Error("Missing attendance record ID or date.");
      }

      // Notify admins if attendance was edited by an employee
      if (currentEditorRole !== "admin" && Object.keys(changes).length > 0) {
        const changeFields = [];
        if (changes.clock_in) changeFields.push("clock-in");
        if (changes.clock_out) changeFields.push("clock-out");
        if (changes.break_minutes) changeFields.push("breaks");
        const changeDesc = changeFields.length > 0 ? changeFields.join(", ") : "attendance";

        const targetDate = date || existingRecord?.date || todayISO();
        const targetDateBS = isoToBSLabel(targetDate);

        await sendNotification({
          recipientRole: "admin",
          orgId: auth?.profile?.org_id,
          actorId: auth?.user?.id,
          type: "attendance_edited",
          title: "Attendance Record Edited",
          message: `${currentEditorName} edited ${changeDesc} for ${targetDateBS}.${reason ? ` Reason: "${reason.trim()}"` : ""}`,
          link: "/attendance",
          metadata: {
            employeeId: effectiveEmpId,
            date: targetDate,
            dateBS: targetDateBS,
            changes,
            reason: reason ? reason.trim() : null,
          },
        });
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
        let breaks = Array.isArray(r.breaks) ? r.breaks : [];
        let edit_history = Array.isArray(r.edit_history) ? r.edit_history : [];

        if (breaks.length > 0) {
          break_minutes = calculateBreaksTotalMins(breaks, break_minutes);
        }

        return {
          ...r,
          break_minutes,
          break_start,
          breaks,
          edit_history,
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

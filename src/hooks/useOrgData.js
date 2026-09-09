import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { nepalDateTimeToISO, todayISO } from "../utils/timezone";
import { isHalfDayLeave, LEAVE_QUOTAS } from "../utils/leaveUtils";
import { isAdminProfile, isRegularStaff } from "../utils/userUtils";

export { isAdminProfile, isRegularStaff };

const LEAVE_TYPES = ["Annual", "Sick", "Casual", "Unpaid"];


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

/* ---------------- Attendance ---------------- */
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
      // If a break was in progress when clocking out, finalize it
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
        const diffMs = Math.max(0, now.getTime() - new Date(activeStart).getTime());
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
          // Fallback if break columns don't exist yet
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

      if (error && error.code !== "42703" && !error.message?.includes("break_start")) {
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

      if (error && error.code !== "42703" && !error.message?.includes("break")) {
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

        if (error && (error.code === "42703" || error.message?.includes("break"))) {
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

        if (error && (error.code === "42703" || error.message?.includes("break"))) {
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
    // Live 30s poll only for today's active check-ins; 5-min cache for charts/historical ranges
    refetchInterval: isTodayOnly ? 30000 : false,
    staleTime: isTodayOnly ? 15000 : 1000 * 60 * 5,
  });

  return {
    records: query.data ?? null,
    isLoading: query.isLoading,
  };
}

/* ---------------- Work logs ---------------- */
export function useWorkLogs(employeeId) {
  const qc = useQueryClient();
  const key = ["work-logs", employeeId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_logs")
        .select("*")
        .eq("employee_id", employeeId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const addEntry = useMutation({
    mutationFn: async ({
      text,
      date = todayISO(),
      projectId,
      workType = "desk",
    }) => {
      const insertData = {
        employee_id: employeeId,
        date,
        entry_text: text,
        project_id: projectId ?? null,
        work_type: workType,
      };

      const { error } = await supabase.from("work_logs").insert(insertData);
      if (error) {
        if (error.message?.includes("work_type") || error.code === "42703") {
          delete insertData.work_type;
          const { error: err2 } = await supabase
            .from("work_logs")
            .insert(insertData);
          if (err2) throw err2;
        } else {
          throw error;
        }
      }
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["attendance", employeeId] });
      qc.invalidateQueries({ queryKey: ["org-attendance"] });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ entryId, text, projectId, workType }) => {
      const updateData = {
        entry_text: text,
        project_id: projectId ?? null,
      };
      if (workType) {
        updateData.work_type = workType;
      }

      const { error } = await supabase
        .from("work_logs")
        .update(updateData)
        .eq("id", entryId)
        .eq("employee_id", employeeId);
      if (error) {
        if (error.message?.includes("work_type") || error.code === "42703") {
          delete updateData.work_type;
          const { error: err2 } = await supabase
            .from("work_logs")
            .update(updateData)
            .eq("id", entryId)
            .eq("employee_id", employeeId);
          if (err2) throw err2;
        } else {
          throw error;
        }
      }
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["attendance", employeeId] });
      qc.invalidateQueries({ queryKey: ["org-attendance"] });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (entryId) => {
      const { error } = await supabase
        .from("work_logs")
        .delete()
        .eq("id", entryId)
        .eq("employee_id", employeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["attendance", employeeId] });
      qc.invalidateQueries({ queryKey: ["org-attendance"] });
    },
  });

  return {
    entries: query.data ?? null,
    isLoading: query.isLoading,
    addEntry: (textOrPayload, date, projectId, workType) => {
      if (typeof textOrPayload === "object" && textOrPayload !== null) {
        return addEntry.mutateAsync(textOrPayload);
      }
      return addEntry.mutateAsync({
        text: textOrPayload,
        date,
        projectId,
        workType,
      });
    },
    updateEntry: (entryIdOrPayload, text, projectId, workType) => {
      if (typeof entryIdOrPayload === "object" && entryIdOrPayload !== null) {
        return updateEntry.mutateAsync(entryIdOrPayload);
      }
      return updateEntry.mutateAsync({
        entryId: entryIdOrPayload,
        text,
        projectId,
        workType,
      });
    },
    deleteEntry: (entryId) => deleteEntry.mutateAsync(entryId),
  };
}

/**
 * Automatically recalculates and synchronizes an employee's profile leave_balance
 * strictly from their actual approved leave requests. This eliminates incremental drift,
 * double deductions, and stale balances.
 */
export async function syncEmployeeLeaveBalance(employeeId) {
  if (!employeeId) return;

  try {
    const { data: approvedReqs, error: reqErr } = await supabase
      .from("leave_requests")
      .select("type, days, reason, start_date, end_date")
      .eq("employee_id", employeeId)
      .eq("status", "Approved");

    if (reqErr) throw reqErr;

    const sickUsed = (approvedReqs || [])
      .filter((r) => r.type === "Sick")
      .reduce(
        (sum, r) => sum + (isHalfDayLeave(r) ? 0.5 : Number(r.days) || 1),
        0,
      );

    const annualUsed = (approvedReqs || [])
      .filter((r) => r.type === "Annual")
      .reduce(
        (sum, r) => sum + (isHalfDayLeave(r) ? 0.5 : Number(r.days) || 1),
        0,
      );

    const sickBal = Math.max(
      0,
      Math.round((LEAVE_QUOTAS.Sick - sickUsed) * 10) / 10,
    );
    const annualBal = Math.max(
      0,
      Math.round((LEAVE_QUOTAS.Annual - annualUsed) * 10) / 10,
    );

    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("leave_balance")
      .eq("id", employeeId)
      .single();

    if (profErr) throw profErr;

    const currentSick = Number(prof?.leave_balance?.Sick);
    const currentAnnual = Number(prof?.leave_balance?.Annual);

    if (currentSick !== sickBal || currentAnnual !== annualBal) {
      await supabase
        .from("profiles")
        .update({
          leave_balance: {
            ...(prof?.leave_balance || {}),
            Sick: sickBal,
            Annual: annualBal,
          },
        })
        .eq("id", employeeId);
    }
  } catch (err) {
    console.warn(
      "Could not automatically synchronize profiles.leave_balance:",
      err,
    );
  }
}

/* ---------------- Leave requests ---------------- */
export function useLeaveRequests(employeeId, scope = "mine") {
  const qc = useQueryClient();

  const key = ["leave-requests", scope, scope === "mine" ? employeeId : "org"];

  const query = useQuery({
    queryKey: key,

    queryFn: async () => {
      let q = supabase
        .from("leave_requests")
        .select("*, profiles!leave_requests_employee_id_fkey(name, role, title)")
        .order("created_at", { ascending: false });

      if (scope === "mine") {
        q = q.eq("employee_id", employeeId);
      }

      const { data, error } = await q;

      if (error) throw error;

      return (data || [])
        .filter((r) => {
          if (scope === "org") {
            const role = r.profiles?.role?.toLowerCase();
            const title = r.profiles?.title?.toLowerCase();
            if (role === "admin" || title === "admin") return false;
          }
          return true;
        })
        .map((r) => {
          const isHalf = isHalfDayLeave(r);
          return {
            ...r,
            days: isHalf ? 0.5 : Number(r.days),
            employeeName: r.profiles?.name,
            employeeRole: r.profiles?.role,
          };
        });
    },

    enabled: scope === "org" || !!employeeId,
  });

  const invalidate = () => {
    qc.invalidateQueries({
      queryKey: ["leave-requests"],
    });

    qc.invalidateQueries({
      queryKey: ["roster"],
    });
  };

  // ---------------- SUBMIT ----------------

  const submitMutation = useMutation({
    mutationFn: async ({ type, startDate, endDate, days, reason }) => {
      if (!["Annual", "Sick"].includes(type)) {
        throw new Error("Invalid leave type.");
      }

      if (!days || Number(days) <= 0) {
        throw new Error("Leave days must be greater than 0.");
      }

      const numDays = Number(days);

      // Attempt insert with exact days (supports numeric/float column)
      let { error } = await supabase.from("leave_requests").insert({
        employee_id: employeeId,
        type,
        start_date: startDate,
        end_date: endDate,
        days: numDays,
        reason: reason?.trim() || null,
      });

      // If Postgres days column is still typed as integer, fallback to ceil(numDays)
      // while the reason contains the session metadata so frontend recognizes it as 0.5
      if (
        error &&
        (error.message?.includes("integer") ||
          error.code === "22P02" ||
          error.details?.includes("integer"))
      ) {
        console.warn(
          "Supabase leave_requests.days is typed as INT. Falling back to days: 1 with session metadata in reason. Run `ALTER TABLE leave_requests ALTER COLUMN days TYPE numeric;` in Supabase SQL editor to store 0.5 natively.",
        );
        const retry = await supabase.from("leave_requests").insert({
          employee_id: employeeId,
          type,
          start_date: startDate,
          end_date: endDate,
          days: Math.ceil(numDays),
          reason: reason?.trim() || null,
        });
        error = retry.error;
      }

      if (error) throw error;
    },

    onSuccess: invalidate,
  });

  // ---------------- UPDATE ----------------

  const updateMutation = useMutation({
    mutationFn: async ({
      requestId,
      type,
      startDate,
      endDate,
      days,
      reason,
    }) => {
      const numDays = Number(days);

      let { data, error } = await supabase
        .from("leave_requests")
        .update({
          type,
          start_date: startDate,
          end_date: endDate,
          days: numDays,
          reason: reason?.trim() || null,
        })
        .eq("id", requestId)
        .eq("employee_id", employeeId)
        .select("*");

      if (
        error &&
        (error.message?.includes("integer") ||
          error.code === "22P02" ||
          error.details?.includes("integer"))
      ) {
        const retry = await supabase
          .from("leave_requests")
          .update({
            type,
            start_date: startDate,
            end_date: endDate,
            days: Math.ceil(numDays),
            reason: reason?.trim() || null,
          })
          .eq("id", requestId)
          .eq("employee_id", employeeId)
          .select("*");
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        throw error;
      }

      // If RLS prevents the update, data will be [].
      if (!data || data.length === 0) {
        throw new Error(
          "No leave request was updated. The Supabase RLS UPDATE policy may be blocking this request.",
        );
      }

      if (employeeId) {
        await syncEmployeeLeaveBalance(employeeId);
      }

      return data[0];
    },

    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["leave-requests"],
      });

      await qc.invalidateQueries({
        queryKey: ["roster"],
      });
    },
  });

  // ---------------- DELETE ----------------

  const deleteMutation = useMutation({
    mutationFn: async (requestId) => {
      const existing = query.data?.find((r) => r.id === requestId);

      if (!existing) {
        throw new Error("Leave request not found.");
      }

      const { error } = await supabase
        .from("leave_requests")
        .delete()
        .eq("id", requestId)
        .eq("employee_id", employeeId);

      if (error) throw error;

      if (employeeId) {
        await syncEmployeeLeaveBalance(employeeId);
      }
    },

    onSuccess: invalidate,
  });

  // ---------------- ADMIN DECISION ----------------

  const decideMutation = useMutation({
    mutationFn: async ({ requestId, status, decidedBy }) => {
      if (!["Approved", "Rejected", "Pending"].includes(status)) {
        throw new Error("Invalid leave status.");
      }

      // Fetch existing request to identify employee
      const { data: existingReq, error: fetchErr } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchErr) throw fetchErr;

      const empId = existingReq?.employee_id;

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          decided_by: decidedBy,
          decided_at: status === "Pending" ? null : new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Automatically recalculate & sync profile leave_balance from actual approved requests
      if (empId) {
        await syncEmployeeLeaveBalance(empId);
      }
    },

    onSuccess: invalidate,
  });

  return {
    requests: query.data ?? null,

    isLoading: query.isLoading,

    submit: (payload) => submitMutation.mutateAsync(payload),

    updateRequest: (requestId, payload) =>
      updateMutation.mutateAsync({
        requestId,
        ...payload,
      }),

    deleteRequest: (requestId) => deleteMutation.mutateAsync(requestId),

    decide: (requestId, status, decidedBy) =>
      decideMutation.mutateAsync({
        requestId,
        status,
        decidedBy,
      }),
  };
}

/* ---------------- Org roster ---------------- */
export function useRoster() {
  const qc = useQueryClient();
  const key = ["roster"];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const employees = query.data ?? null;
  const staff = employees ? employees.filter(isRegularStaff) : null;

  return {
    employees,
    staff,
    isLoading: query.isLoading,
  };
}

/* ---------------- Projects (tags) ---------------- */
export function useProjects() {
  const qc = useQueryClient();
  const key = ["projects"];

  // Check whether the Supabase projects table has the required extended columns
  const checkColumnsQuery = useQuery({
    queryKey: ["projects-db-columns-check"],
    queryFn: async () => {
      try {
        const { error } = await supabase
          .from("projects")
          .select("end_date")
          .limit(1);
        if (error && (error.code === "42703" || error.message?.includes("column"))) {
          return true; // Migration IS required
        }
        return false; // Database columns are present
      } catch {
        return false;
      }
    },
    staleTime: 1000 * 30,
  });

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: projData, error: projErr } = await supabase
        .from("projects")
        .select("*")
        .order("archived", { ascending: true })
        .order("name", { ascending: true });
      if (projErr) throw projErr;

      // Also retrieve extended project metadata from organization office_hours as temporary bridge
      let projectMeta = {};
      try {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("id, office_hours")
          .limit(1)
          .maybeSingle();
        if (orgData?.office_hours?.project_meta) {
          projectMeta = orgData.office_hours.project_meta;
        }
      } catch (e) {
        console.warn("Notice: could not read office_hours.project_meta", e);
      }

      // Map projects directly from database table rows (no hardcoded template merging!)
      const merged = (projData || []).map((p) => {
        const normName = (p.name || "").trim().toLowerCase();
        const meta = projectMeta[p.id] || projectMeta[normName] || {};
        const targetEndDate = p.end_date ?? meta.end_date ?? p.deadline ?? meta.deadline ?? "";

        return {
          ...p,
          lead_architect_id: p.lead_architect_id ?? meta.lead_architect_id ?? null,
          sub_architect_ids: Array.isArray(p.sub_architect_ids)
            ? p.sub_architect_ids
            : meta.sub_architect_ids ?? [],
          project_work: p.project_work ?? meta.project_work ?? "",
          current_stage: p.current_stage ?? meta.current_stage ?? "",
          project_type: p.project_type ?? meta.project_type ?? "",
          start_date: p.start_date ?? meta.start_date ?? "",
          end_date: targetEndDate,
          deadline: targetEndDate, // backward-compatible alias for UI components
          status: p.status ?? meta.status ?? (p.archived ? "Completed" : "Active"),
          activity_history:
            Array.isArray(p.activity_history) && p.activity_history.length > 0
              ? p.activity_history
              : Array.isArray(meta.activity_history)
              ? meta.activity_history
              : [],
        };
      });

      return merged;
    },
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["organization"] });
  };

  // Helper to persist extended fields into organization's office_hours.project_meta
  const saveProjectMetaFallback = async (projectIdOrName, fields, orgId) => {
    try {
      let orgQuery = supabase.from("organizations").select("id, office_hours");
      if (orgId) orgQuery = orgQuery.eq("id", orgId);
      const { data: orgData } = await orgQuery.limit(1).maybeSingle();

      if (orgData) {
        const currentMeta = orgData.office_hours?.project_meta || {};
        const updatedMeta = {
          ...currentMeta,
          [projectIdOrName]: {
            ...(currentMeta[projectIdOrName] || {}),
            ...fields,
          },
        };
        await supabase
          .from("organizations")
          .update({
            office_hours: {
              ...(orgData.office_hours || {}),
              project_meta: updatedMeta,
            },
          })
          .eq("id", orgData.id);
      }
    } catch (err) {
      console.warn("Could not save to project_meta fallback:", err);
    }
  };

  const createProject = useMutation({
    mutationFn: async ({ orgId, actor, ...fields }) => {
      const initialHistory = [
        {
          id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: "created",
          title: "Project created",
          description: `Project initialized${
            fields.current_stage ? ` at stage "${fields.current_stage}"` : ""
          }${
            fields.end_date || fields.deadline
              ? ` with deadline ${fields.end_date || fields.deadline}`
              : ""
          }`,
          user_id: actor?.id || fields.user_id || null,
          user_name: actor?.name || fields.user_name || "Project Administrator",
          user_role: actor?.role || null,
          created_at: new Date().toISOString(),
        },
      ];

      const payload = {
        name: fields.name,
        color: fields.color,
        status: fields.status || "Active",
        lead_architect_id: fields.lead_architect_id || null,
        sub_architect_ids: Array.isArray(fields.sub_architect_ids) ? fields.sub_architect_ids : [],
        project_work: fields.project_work || "",
        current_stage: fields.current_stage || "",
        project_type: fields.project_type || "",
        start_date: fields.start_date || "",
        end_date: fields.end_date || fields.deadline || "",
        progress: Number(fields.progress) || 0,
        activity_history: initialHistory,
        updated_at: new Date().toISOString(),
        org_id: orgId,
      };
      try {
        const { data, error } = await supabase
          .from("projects")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data?.id) {
          await saveProjectMetaFallback(data.id, { ...fields, activity_history: initialHistory }, orgId);
        }
        return data;
      } catch (err) {
        if (err.code === "42703" || err.message?.includes("column")) {
          console.warn("Falling back to core fields + project_meta:", err.message);
          const corePayload = {
            name: fields.name,
            color: fields.color,
            org_id: orgId,
          };
          const { data, error } = await supabase
            .from("projects")
            .insert(corePayload)
            .select()
            .single();
          if (error) throw error;
          if (data?.id) {
            await saveProjectMetaFallback(data.id, { ...fields, activity_history: initialHistory }, orgId);
          }
          return { ...data, ...fields, activity_history: initialHistory };
        }
        throw err;
      }
    },
    onSuccess: invalidate,
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, actor, activityRecords, ...fields }) => {
      const currentProjects = qc.getQueryData(key) || [];
      const existing = currentProjects.find((p) => String(p.id) === String(id));

      const payload = {};
      if (fields.name !== undefined) payload.name = fields.name;
      if (fields.color !== undefined) payload.color = fields.color;
      if (fields.status !== undefined) payload.status = fields.status;
      if (fields.archived !== undefined) payload.archived = fields.archived;
      if (fields.lead_architect_id !== undefined) payload.lead_architect_id = fields.lead_architect_id;
      if (fields.sub_architect_ids !== undefined) payload.sub_architect_ids = fields.sub_architect_ids;
      if (fields.project_work !== undefined) payload.project_work = fields.project_work;
      if (fields.current_stage !== undefined) payload.current_stage = fields.current_stage;
      if (fields.project_type !== undefined) payload.project_type = fields.project_type;
      if (fields.start_date !== undefined) payload.start_date = fields.start_date;
      if (fields.end_date !== undefined) payload.end_date = fields.end_date;
      else if (fields.deadline !== undefined) payload.end_date = fields.deadline;
      if (fields.progress !== undefined) payload.progress = Number(fields.progress) || 0;

      const targetEndDate = fields.end_date !== undefined ? fields.end_date : fields.deadline;

      const newActivities = Array.isArray(activityRecords)
        ? [...activityRecords]
        : Array.isArray(fields.activity_history)
        ? [...fields.activity_history]
        : [];
      const authorName = actor?.name || fields.user_name || "Team Member";
      const authorId = actor?.id || null;
      const authorRole = actor?.role || null;
      const nowISO = new Date().toISOString();

      if (newActivities.length === 0 && existing) {
        if (fields.current_stage !== undefined && fields.current_stage !== existing.current_stage) {
          newActivities.push({
            id: `act_${Date.now()}_stage_${Math.random().toString(36).slice(2, 6)}`,
            type: "stage_change",
            title: `Stage changed to ${fields.current_stage}`,
            description: existing.current_stage
              ? `Stage changed from "${existing.current_stage}" to "${fields.current_stage}"`
              : `Stage set to "${fields.current_stage}"`,
            old_value: existing.current_stage || "",
            new_value: fields.current_stage,
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
        if (targetEndDate !== undefined && targetEndDate !== (existing.end_date || existing.deadline)) {
          newActivities.push({
            id: `act_${Date.now()}_deadline_${Math.random().toString(36).slice(2, 6)}`,
            type: "deadline_change",
            title: targetEndDate ? `Target deadline updated` : `Deadline cleared`,
            description: targetEndDate
              ? (existing.end_date ? `Deadline changed from ${existing.end_date} to ${targetEndDate}` : `Target deadline scheduled for ${targetEndDate}`)
              : `Removed target deadline`,
            old_value: existing.end_date || existing.deadline || "",
            new_value: targetEndDate || "",
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
        if (fields.start_date !== undefined && fields.start_date !== existing.start_date) {
          newActivities.push({
            id: `act_${Date.now()}_start_${Math.random().toString(36).slice(2, 6)}`,
            type: "start_date_change",
            title: fields.start_date ? `Start date set to ${fields.start_date}` : `Start date cleared`,
            description: `Start date updated`,
            old_value: existing.start_date || "",
            new_value: fields.start_date || "",
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
        if (fields.status !== undefined && fields.status !== existing.status) {
          newActivities.push({
            id: `act_${Date.now()}_status_${Math.random().toString(36).slice(2, 6)}`,
            type: "status_change",
            title: `Status changed to ${fields.status}`,
            description: existing.status ? `Status changed from "${existing.status}" to "${fields.status}"` : `Status set to "${fields.status}"`,
            old_value: existing.status || "",
            new_value: fields.status,
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
        if (
          fields.progress !== undefined &&
          Number(fields.progress) !== Number(existing.progress) &&
          (fields.current_stage === undefined || fields.current_stage === existing.current_stage)
        ) {
          newActivities.push({
            id: `act_${Date.now()}_prog_${Math.random().toString(36).slice(2, 6)}`,
            type: "progress_change",
            title: `Progress updated to ${fields.progress}%`,
            description: `Completion progress adjusted from ${existing.progress || 0}% to ${fields.progress}%`,
            old_value: existing.progress || 0,
            new_value: Number(fields.progress),
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
      }

      const existingHistory = Array.isArray(existing?.activity_history) ? existing.activity_history : [];
      const updatedHistory = newActivities.length > 0 ? [...newActivities, ...existingHistory].slice(0, 100) : existingHistory;
      if (newActivities.length > 0 || fields.activity_history !== undefined) {
        payload.activity_history = updatedHistory;
      }
      payload.updated_at = new Date().toISOString();

      try {
        const { data, error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        if (payload.activity_history) {
          saveProjectMetaFallback(id, { activity_history: payload.activity_history });
        }
        return data;
      } catch (err) {
        if (err.code === "42703" || err.message?.includes("column")) {
          console.warn("Falling back to core update + project_meta:", err.message);
          const corePayload = {};
          if (fields.name !== undefined) corePayload.name = fields.name;
          if (fields.color !== undefined) corePayload.color = fields.color;
          if (fields.archived !== undefined) corePayload.archived = fields.archived;
          const { data, error } = await supabase
            .from("projects")
            .update(corePayload)
            .eq("id", id)
            .select()
            .single();
          if (error) throw error;
          await saveProjectMetaFallback(id, { ...fields, activity_history: updatedHistory });
          return { ...data, ...fields, activity_history: updatedHistory };
        }
        throw err;
      }
    },
    onSuccess: invalidate,
  });

  const updateProjectStageAndDeadline = useMutation({
    mutationFn: async ({ id, currentStage, deadline, endDate, progress, status, actor, activityRecords }) => {
      const currentProjects = qc.getQueryData(key) || [];
      const existing = currentProjects.find((p) => String(p.id) === String(id));

      const payload = {};
      if (currentStage !== undefined) payload.current_stage = currentStage;
      const targetEndDate = endDate !== undefined ? endDate : deadline;
      if (targetEndDate !== undefined) payload.end_date = targetEndDate;
      if (progress !== undefined) payload.progress = Number(progress) || 0;
      if (status !== undefined) payload.status = status;
      payload.updated_at = new Date().toISOString();

      const newActivities = Array.isArray(activityRecords) ? [...activityRecords] : [];
      const authorName = actor?.name || "Team Member";
      const authorId = actor?.id || null;
      const authorRole = actor?.role || null;
      const nowISO = new Date().toISOString();

      if (newActivities.length === 0 && existing) {
        if (currentStage !== undefined && currentStage !== existing.current_stage) {
          newActivities.push({
            id: `act_${Date.now()}_stage_${Math.random().toString(36).slice(2, 6)}`,
            type: "stage_change",
            title: `Stage changed to ${currentStage}`,
            description: existing.current_stage
              ? `Stage changed from "${existing.current_stage}" to "${currentStage}"`
              : `Stage set to "${currentStage}"`,
            old_value: existing.current_stage || "",
            new_value: currentStage,
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
        if (targetEndDate !== undefined && targetEndDate !== (existing.end_date || existing.deadline)) {
          newActivities.push({
            id: `act_${Date.now()}_deadline_${Math.random().toString(36).slice(2, 6)}`,
            type: "deadline_change",
            title: targetEndDate ? `Target deadline updated` : `Deadline cleared`,
            description: targetEndDate
              ? (existing.end_date ? `Deadline changed from ${existing.end_date} to ${targetEndDate}` : `Target deadline scheduled for ${targetEndDate}`)
              : `Removed target deadline`,
            old_value: existing.end_date || existing.deadline || "",
            new_value: targetEndDate || "",
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
        if (status !== undefined && status !== existing.status) {
          newActivities.push({
            id: `act_${Date.now()}_status_${Math.random().toString(36).slice(2, 6)}`,
            type: "status_change",
            title: `Status changed to ${status}`,
            description: existing.status ? `Status changed from "${existing.status}" to "${status}"` : `Status marked as "${status}"`,
            old_value: existing.status || "",
            new_value: status,
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
        if (
          progress !== undefined &&
          Number(progress) !== Number(existing.progress) &&
          (currentStage === undefined || currentStage === existing.current_stage)
        ) {
          newActivities.push({
            id: `act_${Date.now()}_prog_${Math.random().toString(36).slice(2, 6)}`,
            type: "progress_change",
            title: `Progress updated to ${progress}%`,
            description: `Completion progress adjusted from ${existing.progress || 0}% to ${progress}%`,
            old_value: existing.progress || 0,
            new_value: Number(progress),
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
      }

      const existingHistory = Array.isArray(existing?.activity_history) ? existing.activity_history : [];
      const updatedHistory = newActivities.length > 0 ? [...newActivities, ...existingHistory].slice(0, 100) : existingHistory;
      if (newActivities.length > 0) {
        payload.activity_history = updatedHistory;
      }

      try {
        const { data, error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        if (payload.activity_history) {
          saveProjectMetaFallback(id, { activity_history: payload.activity_history });
        }
        return data;
      } catch (err) {
        if (err.code === "42703" || err.message?.includes("column")) {
          console.warn("Migration pending for project stage and end_date; saving to project_meta:", err.message);
          await saveProjectMetaFallback(id, { ...payload, activity_history: updatedHistory });
          return { id, ...payload, activity_history: updatedHistory };
        }
        throw err;
      }
    },
    onSuccess: invalidate,
  });

  const deleteProject = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const batchImportProjects = useMutation({
    mutationFn: async ({ projects, orgId }) => {
      const rows = projects.map((p) => ({
        name: p.name,
        color: p.color || "#63537E",
        org_id: orgId,
        lead_architect_id: p.lead_architect_id || null,
        sub_architect_ids: p.sub_architect_ids || [],
        project_work: p.project_work || "",
        current_stage: p.current_stage || "",
        project_type: p.project_type || "",
        start_date: p.start_date || "",
        end_date: p.end_date || p.deadline || "",
        status: p.status || "Active",
      }));
      try {
        const { error } = await supabase.from("projects").insert(rows);
        if (error) throw error;
      } catch (err) {
        if (err.code === "42703" || err.message?.includes("column")) {
          const coreRows = rows.map((r) => ({
            name: r.name,
            color: r.color,
            org_id: orgId,
          }));
          const { error } = await supabase.from("projects").insert(coreRows);
          if (error) throw error;
        } else {
          throw err;
        }
      }
    },
    onSuccess: invalidate,
  });

  const syncExcelProjectsWithDb = useMutation({
    mutationFn: async ({ projects: templateProjects, orgId }) => {
      // Check whether native columns exist in PostgreSQL
      const { error: testErr } = await supabase
        .from("projects")
        .select("end_date")
        .limit(1);

      if (testErr && (testErr.code === "42703" || testErr.message?.includes("column"))) {
        throw new Error(
          "Supabase Database Migration Required: The 'projects' table in PostgreSQL does not have columns for lead_architect_id, sub_architect_ids, end_date, etc. Please run the SQL migration in your Supabase SQL Editor first, then click Sync."
        );
      }

      // Fetch roster profiles to resolve user IDs
      const { data: profileList } = await supabase
        .from("profiles")
        .select("id, name");

      const findEmp = (nameStr) => {
        if (!nameStr) return null;
        const clean = nameStr.toLowerCase().replace(/^ar\.?\s*/i, "").trim();
        return (profileList || []).find((p) => {
          const pClean = (p.name || "").toLowerCase().replace(/^ar\.?\s*/i, "").trim();
          return pClean === clean || pClean.includes(clean) || clean.includes(pClean);
        });
      };

      const { data: existingProjects, error: fetchErr } = await supabase
        .from("projects")
        .select("*");
      if (fetchErr) throw fetchErr;

      let updatedCount = 0;
      let createdCount = 0;

      for (const t of templateProjects) {
        const normName = (t.name || "").trim().toLowerCase();
        const match = (existingProjects || []).find(
          (ep) => ep.name && ep.name.trim().toLowerCase() === normName,
        );

        // Resolve user association
        const leadUser = t.lead_architect_id
          ? { id: t.lead_architect_id }
          : findEmp(t.lead_architect);

        let subIds = Array.isArray(t.sub_architect_ids) ? [...t.sub_architect_ids] : [];
        if (!subIds.length && t.sub_architects) {
          const subNames = t.sub_architects.split(/[,;/+]/).map((s) => s.trim()).filter(Boolean);
          subIds = subNames
            .map((n) => findEmp(n)?.id)
            .filter(Boolean);
        }

        const projectRow = {
          name: t.name,
          color: t.color || "#63537E",
          lead_architect_id: leadUser?.id || null,
          sub_architect_ids: subIds,
          project_work: t.project_work || "",
          current_stage: t.current_stage || "",
          project_type: t.project_type || "",
          start_date: t.start_date || "",
          end_date: t.end_date || t.deadline || "",
          status: t.status || "Active",
        };

        if (match) {
          const { error: upErr } = await supabase
            .from("projects")
            .update(projectRow)
            .eq("id", match.id);

          if (upErr) throw upErr;
          updatedCount++;
        } else {
          const insertPayload = {
            ...projectRow,
            org_id: orgId,
          };
          const { error: insErr } = await supabase
            .from("projects")
            .insert(insertPayload);

          if (insErr) throw insErr;
          createdCount++;
        }
      }

      return { updatedCount, createdCount, total: templateProjects.length };
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["projects-db-columns-check"] });
    },
  });

  const archiveProject = useMutation({
    mutationFn: async ({ id, archived }) => {
      const { error } = await supabase
        .from("projects")
        .update({ archived })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    projects: query.data ?? null,
    isLoading: query.isLoading,
    isDbMigrationRequired: Boolean(checkColumnsQuery.data),
    refetchDbSchema: () => checkColumnsQuery.refetch(),
    createProject: (payload) => createProject.mutateAsync(payload),
    updateProject: (idOrPayload, maybePayload) => {
      if (typeof idOrPayload === "object" && idOrPayload !== null) {
        return updateProject.mutateAsync(idOrPayload);
      }
      return updateProject.mutateAsync({ id: idOrPayload, ...(maybePayload || {}) });
    },
    updateProjectStageAndDeadline: (payload) =>
      updateProjectStageAndDeadline.mutateAsync(payload),
    deleteProject: (id) => deleteProject.mutateAsync(id),
    batchImportProjects: (payload) => batchImportProjects.mutateAsync(payload),
    syncExcelProjectsWithDb: (payload) => syncExcelProjectsWithDb.mutateAsync(payload),
    archiveProject: (id, archived) =>
      archiveProject.mutateAsync({ id, archived }),
  };
}

/* ---------------- Org-wide work logs (admin, for the per-project rollup) ---------------- */
export function useOrgWorkLogs() {
  const query = useQuery({
    queryKey: ["work-logs", "org"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_logs")
        .select(
          "id, employee_id, project_id, date, entry_text, hours_spent, work_type, created_at, profiles!work_logs_employee_id_fkey(name, role, title, email)",
        )
        .order("date", { ascending: false });
      if (error) throw error;
      return (data || [])
        .filter((e) => {
          const role = e.profiles?.role?.toLowerCase();
          const title = e.profiles?.title?.toLowerCase();
          return role !== "admin" && title !== "admin";
        })
        .map((e) => ({
          ...e,
          employeeName: e.profiles?.name,
          employeeRole: e.profiles?.role,
          employeeEmail: e.profiles?.email,
        }));
    },
    staleTime: 1000 * 60 * 3, // 3 minutes cache
  });

  return { entries: query.data ?? null, isLoading: query.isLoading };
}

export function useHolidays() {
  const qc = useQueryClient();
  const key = ["holidays"];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      let data = [];
      try {
        const { data: dbData, error } = await supabase
          .from("holidays")
          .select("*")
          .order("date", { ascending: true });
        if (!error && dbData) {
          data = dbData;
        }
      } catch (err) {
        console.warn("Error fetching holidays from Supabase:", err);
      }

      // Merge local overrides so updates persist reliably
      try {
        const rawOverrides = localStorage.getItem("app_holiday_overrides");
        if (rawOverrides) {
          const overrides = JSON.parse(rawOverrides);
          const overrideKeys = Object.keys(overrides);

          data = data
            .map((h) => {
              const key1 = h.id;
              const key2 = `date_${h.date}_${h.name}`;
              const match =
                overrides[key1] || overrides[key2] || overrides[h.date];
              if (match) {
                if (match._deleted) return null;
                return { ...h, ...match };
              }
              return h;
            })
            .filter(Boolean);

          // Add any newly created holidays stored locally
          for (const k of overrideKeys) {
            const item = overrides[k];
            if (item && !item._deleted && item.date && item.name) {
              const exists = data.some(
                (h) =>
                  h.id === item.id ||
                  (h.date === item.date && h.name === item.name),
              );
              if (!exists) {
                data.push({
                  id: item.id || k,
                  ...item,
                });
              }
            }
          }
        }
      } catch (_) {}

      return data.sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const addHoliday = useMutation({
    mutationFn: async ({ date, name, category = "public", orgId }) => {
      const tempId = `h_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      try {
        const rawOverrides = localStorage.getItem("app_holiday_overrides") || "{}";
        const overrides = JSON.parse(rawOverrides);
        overrides[tempId] = {
          id: tempId,
          date,
          name,
          category,
          org_id: orgId,
        };
        localStorage.setItem("app_holiday_overrides", JSON.stringify(overrides));
      } catch (_) {}

      try {
        const { data, error } = await supabase
          .from("holidays")
          .insert({ date, name, category, org_id: orgId })
          .select();
        if (!error && data?.[0]?.id) {
          // Update the local cache key with the real DB id
          try {
            const rawOverrides = localStorage.getItem("app_holiday_overrides") || "{}";
            const overrides = JSON.parse(rawOverrides);
            delete overrides[tempId];
            overrides[data[0].id] = data[0];
            localStorage.setItem("app_holiday_overrides", JSON.stringify(overrides));
          } catch (_) {}
        }
      } catch (err) {
        console.warn("Supabase addHoliday error (saved locally):", err);
      }
    },
    onSuccess: invalidate,
  });

  const updateHoliday = useMutation({
    mutationFn: async ({
      id,
      date,
      name,
      category,
      orgId,
      oldDate,
      oldName,
    }) => {
      // 1. Immediately save to local overrides so UI reflects changes reliably
      const holidayKey = id || `date_${oldDate || date}_${oldName || name}`;
      try {
        const rawOverrides =
          localStorage.getItem("app_holiday_overrides") || "{}";
        const overrides = JSON.parse(rawOverrides);
        overrides[holidayKey] = {
          id,
          date,
          name,
          category,
          updated_at: new Date().toISOString(),
        };
        // Also map under old date if date changed
        if (oldDate && oldDate !== date) {
          overrides[`date_${oldDate}_${oldName || name}`] = {
            id,
            date,
            name,
            category,
            updated_at: new Date().toISOString(),
          };
        }
        localStorage.setItem(
          "app_holiday_overrides",
          JSON.stringify(overrides),
        );
      } catch (_) {}

      // 2. Attempt Supabase update
      try {
        let updateQuery = supabase
          .from("holidays")
          .update({ date, name, category });

        if (id) {
          updateQuery = updateQuery.eq("id", id);
        } else if (oldDate) {
          updateQuery = updateQuery.eq("date", oldDate);
        }

        const { data, error } = await updateQuery.select();

        // If update failed or affected 0 rows (e.g. RLS blocked or missing policy)
        if (error || !data || data.length === 0) {
          console.warn(
            "Supabase update affected 0 rows. Attempting upsert fallback...",
            error,
          );
          const upsertPayload = { date, name, category };
          if (id) upsertPayload.id = id;
          if (orgId) upsertPayload.org_id = orgId;

          const { error: upsertErr } = await supabase
            .from("holidays")
            .upsert(upsertPayload);

          if (upsertErr) {
            console.warn("Holiday upsert also failed:", upsertErr);
          }
        }
      } catch (err) {
        console.warn("Supabase updateHoliday caught exception:", err);
      }
    },
    onSuccess: invalidate,
  });

  const deleteHoliday = useMutation({
    mutationFn: async (idOrDate) => {
      try {
        const rawOverrides =
          localStorage.getItem("app_holiday_overrides") || "{}";
        const overrides = JSON.parse(rawOverrides);
        overrides[idOrDate] = { _deleted: true };
        localStorage.setItem(
          "app_holiday_overrides",
          JSON.stringify(overrides),
        );
      } catch (_) {}

      try {
        if (
          typeof idOrDate === "string" &&
          idOrDate.includes("-") &&
          idOrDate.length === 10
        ) {
          await supabase.from("holidays").delete().eq("date", idOrDate);
        } else {
          await supabase.from("holidays").delete().eq("id", idOrDate);
        }
      } catch (err) {
        console.warn("Supabase deleteHoliday caught error:", err);
      }
    },
    onSuccess: invalidate,
  });

  return {
    holidays: query.data ?? null,
    addHoliday: (payload) => addHoliday.mutateAsync(payload),
    updateHoliday: (payload) => updateHoliday.mutateAsync(payload),
    deleteHoliday: (id) => deleteHoliday.mutateAsync(id),
  };
}

export function useEvents() {
  const qc = useQueryClient();
  const key = ["events"];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, event_assignees(employee_id, profiles(name))")
        .order("date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const createEvent = useMutation({
    mutationFn: async ({
      title,
      description,
      eventType,
      date,
      time,
      allOrg,
      assigneeIds,
      orgId,
      createdBy,
    }) => {
      const { data: event, error } = await supabase
        .from("events")
        .insert({
          title,
          description,
          event_type: eventType,
          date,
          time: time || null,
          all_org: allOrg,
          org_id: orgId,
          created_by: createdBy,
        })
        .select()
        .single();
      if (error) throw error;

      if (!allOrg && assigneeIds?.length) {
        const rows = assigneeIds.map((employee_id) => ({
          event_id: event.id,
          employee_id,
        }));
        const { error: assignError } = await supabase
          .from("event_assignees")
          .insert(rows);
        if (assignError) throw assignError;
      }
    },
    onSuccess: invalidate,
  });

  const updateEvent = useMutation({
    mutationFn: async ({
      id,
      title,
      description,
      eventType,
      date,
      time,
      allOrg,
      assigneeIds,
    }) => {
      const { error } = await supabase
        .from("events")
        .update({
          title,
          description,
          event_type: eventType,
          date,
          time: time || null,
          all_org: allOrg,
        })
        .eq("id", id);
      if (error) throw error;

      await supabase.from("event_assignees").delete().eq("event_id", id);
      if (!allOrg && assigneeIds?.length) {
        const rows = assigneeIds.map((employee_id) => ({
          event_id: id,
          employee_id,
        }));
        const { error: assignError } = await supabase
          .from("event_assignees")
          .insert(rows);
        if (assignError) throw assignError;
      }
    },
    onSuccess: invalidate,
  });

  const deleteEvent = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    events: query.data ?? null,
    createEvent: (payload) => createEvent.mutateAsync(payload),
    updateEvent: (payload) => updateEvent.mutateAsync(payload),
    deleteEvent: (id) => deleteEvent.mutateAsync(id),
  };
}

/* ---------------- Organization & Office Hours ---------------- */
export function useOrganization(orgId) {
  const qc = useQueryClient();
  const key = ["organization", orgId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!orgId) return null;
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", orgId)
          .single();

        if (error) {
          console.warn("Notice querying organization (using default office hours):", error.message);
          return null;
        }
        return data;
      } catch (err) {
        console.warn("Failed to fetch organization details:", err);
        return null;
      }
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 10,
  });

  const updateOfficeHours = useMutation({
    mutationFn: async (newOfficeHours) => {
      if (!orgId) throw new Error("Organization ID is required.");
      const { error } = await supabase
        .from("organizations")
        .update({ office_hours: newOfficeHours })
        .eq("id", orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["work-hours"] });
    },
  });

  const updateProjectConfig = useMutation({
    mutationFn: async (projectConfig) => {
      if (!orgId) throw new Error("Organization ID is required.");
      const currentOfficeHours = query.data?.office_hours || {};
      const currentSettings = query.data?.settings || {};

      const newOfficeHours = {
        ...currentOfficeHours,
        projectConfig,
      };
      const newSettings = {
        ...currentSettings,
        projectConfig,
      };

      try {
        const { error } = await supabase
          .from("organizations")
          .update({ office_hours: newOfficeHours, settings: newSettings })
          .eq("id", orgId);
        if (error) {
          const { error: err2 } = await supabase
            .from("organizations")
            .update({ office_hours: newOfficeHours })
            .eq("id", orgId);
          if (err2) throw err2;
        }
      } catch (err) {
        const { error: err2 } = await supabase
          .from("organizations")
          .update({ office_hours: newOfficeHours })
          .eq("id", orgId);
        if (err2) throw err2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });

  return {
    organization: query.data,
    isLoading: query.isLoading,
    updateOfficeHours: (payload) => updateOfficeHours.mutateAsync(payload),
    updateProjectConfig: (payload) => updateProjectConfig.mutateAsync(payload),
  };
}

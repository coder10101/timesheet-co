import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { nepalDateTimeToISO } from "../utils/timezone";
import { todayISO } from "../utils/workTime";
import { isHalfDayLeave } from "../utils/leaveUtils";

const LEAVE_TYPES = ["Annual", "Sick", "Casual", "Unpaid"];

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
    enabled: !!employeeId,
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
      let startISO = null;
      try {
        startISO = localStorage.getItem(`break_start_${employeeId}_${today}`);
        localStorage.removeItem(`break_start_${employeeId}_${today}`);
      } catch (_) {}

      const currentRecord = (query.data || []).find((r) => r.date === today);
      const activeStart = currentRecord?.break_start || startISO;
      let additionalBreakMins = 0;
      if (activeStart) {
        const diffMs = new Date().getTime() - new Date(activeStart).getTime();
        additionalBreakMins = Math.max(1, Math.round(diffMs / 60000));
      }
      const totalBreakMinutes = (currentRecord?.break_minutes || 0) + additionalBreakMins;

      const updateData = {
        clock_out: new Date().toISOString(),
        break_start: null,
      };
      if (additionalBreakMins > 0) {
        updateData.break_minutes = totalBreakMinutes;
      }

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

      let elapsedBreakMins = 0;
      if (startISO) {
        const diffMs = now.getTime() - new Date(startISO).getTime();
        elapsedBreakMins = Math.max(1, Math.round(diffMs / 60000));
      }

      const existingBreaks = Array.isArray(currentRecord?.breaks)
        ? currentRecord.breaks
        : [];
      const newBreakItem = {
        start: startISO || nowISO,
        end: nowISO,
        duration: elapsedBreakMins,
      };
      const updatedBreaks = [...existingBreaks, newBreakItem];
      const totalBreakMinutes =
        (currentRecord?.break_minutes || 0) + elapsedBreakMins;

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

export function useOrgAttendance(date) {
  const key = ["org-attendance", date || "all"];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase
        .from("attendance")
        .select("*")
        .order("clock_in", { ascending: true });

      if (date) {
        q = q.eq("date", date);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
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

/* ---------------- Leave requests ---------------- */
export function useLeaveRequests(employeeId, scope = "mine") {
  const qc = useQueryClient();

  const key = ["leave-requests", scope, scope === "mine" ? employeeId : "org"];

  const query = useQuery({
    queryKey: key,

    queryFn: async () => {
      let q = supabase
        .from("leave_requests")
        .select("*, profiles!leave_requests_employee_id_fkey(name)")
        .order("created_at", { ascending: false });

      if (scope === "mine") {
        q = q.eq("employee_id", employeeId);
      }

      const { data, error } = await q;

      if (error) throw error;

      return (data || []).map((r) => {
        const isHalf = isHalfDayLeave(r);
        return {
          ...r,
          days: isHalf ? 0.5 : Number(r.days),
          employeeName: r.profiles?.name,
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
    },

    onSuccess: invalidate,
  });

  // ---------------- ADMIN DECISION ----------------

  const decideMutation = useMutation({
    mutationFn: async ({ requestId, status, decidedBy }) => {
      if (!["Approved", "Rejected", "Pending"].includes(status)) {
        throw new Error("Invalid leave status.");
      }

      // Fetch existing request to detect status transition and employee/type/days
      const { data: existingReq, error: fetchErr } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchErr) throw fetchErr;

      const previousStatus = existingReq?.status;
      const isHalf = isHalfDayLeave(existingReq);
      const leaveDays = isHalf ? 0.5 : Number(existingReq?.days || 1);
      const empId = existingReq?.employee_id;
      const leaveType = existingReq?.type;

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          decided_by: decidedBy,
          decided_at: status === "Pending" ? null : new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Automatically update profile leave_balance if status transitioned
      if (empId && leaveType && ["Annual", "Sick"].includes(leaveType)) {
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("leave_balance")
            .eq("id", empId)
            .single();

          if (prof?.leave_balance) {
            const currentBal =
              Number(prof.leave_balance[leaveType]) ??
              (leaveType === "Sick" ? 6 : 24);
            let newBal = currentBal;

            if (previousStatus !== "Approved" && status === "Approved") {
              newBal = Math.max(0, currentBal - leaveDays);
            } else if (previousStatus === "Approved" && status !== "Approved") {
              newBal = currentBal + leaveDays;
            }

            if (newBal !== currentBal) {
              const roundedBal = Math.round(newBal * 10) / 10;
              await supabase
                .from("profiles")
                .update({
                  leave_balance: {
                    ...prof.leave_balance,
                    [leaveType]: roundedBal,
                  },
                })
                .eq("id", empId);
            }
          }
        } catch (balErr) {
          console.warn(
            "Could not automatically adjust profiles.leave_balance:",
            balErr,
          );
        }
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
  });

  return {
    employees: query.data ?? null,
    isLoading: query.isLoading,
  };
}

/* ---------------- Projects (tags) ---------------- */
export function useProjects() {
  const qc = useQueryClient();
  const key = ["projects"];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("archived", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const createProject = useMutation({
    mutationFn: async ({ name, color, orgId }) => {
      const { error } = await supabase
        .from("projects")
        .insert({ name, color, org_id: orgId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, name, color }) => {
      const { error } = await supabase
        .from("projects")
        .update({ name, color })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
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
    createProject: (payload) => createProject.mutateAsync(payload),
    updateProject: (id, payload) =>
      updateProject.mutateAsync({ id, ...payload }),
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
          "*, profiles!work_logs_employee_id_fkey(name), projects(name, color)",
        )
        .order("date", { ascending: false });
      if (error) throw error;
      return data.map((e) => ({
        ...e,
        employeeName: e.profiles?.name,
        projectName: e.projects?.name,
        projectColor: e.projects?.color,
      }));
    },
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

  return {
    organization: query.data,
    isLoading: query.isLoading,
    updateOfficeHours: (payload) => updateOfficeHours.mutateAsync(payload),
  };
}

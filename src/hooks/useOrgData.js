import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { nepalDateTimeToISO } from "../utils/timezone";

const todayISO = () => new Date().toISOString().slice(0, 10);
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
      return data;
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
      const { error } = await supabase
        .from("attendance")
        .update({ clock_out: new Date().toISOString() })
        .eq("employee_id", employeeId)
        .eq("date", todayISO());
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateAttendance = useMutation({
    mutationFn: async ({
      attendanceId,
      clockIn: newClockIn,
      clockOut: newClockOut,
    }) => {
      const { error } = await supabase
        .from("attendance")
        .update({
          clock_in: newClockIn ? nepalDateTimeToISO(newClockIn) : null,
          clock_out: newClockOut ? nepalDateTimeToISO(newClockOut) : null,
        })
        .eq("id", attendanceId)
        .eq("employee_id", employeeId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    records: query.data ?? null,
    isLoading: query.isLoading,
    clockIn: () => clockIn.mutateAsync(),
    clockOut: () => clockOut.mutateAsync(),
    updateAttendance: (attendanceId, payload) =>
      updateAttendance.mutateAsync({ attendanceId, ...payload }),
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
    mutationFn: async ({ text, date = todayISO() }) => {
      const { error } = await supabase
        .from("work_logs")
        .insert({ employee_id: employeeId, date, entry_text: text });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateEntry = useMutation({
    mutationFn: async ({ entryId, text }) => {
      const { error } = await supabase
        .from("work_logs")
        .update({ entry_text: text })
        .eq("id", entryId)
        .eq("employee_id", employeeId);
      if (error) throw error;
    },
    onSuccess: invalidate,
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
    onSuccess: invalidate,
  });

  return {
    entries: query.data ?? null,
    isLoading: query.isLoading,
    addEntry: (text, date) => addEntry.mutateAsync({ text, date }),
    updateEntry: (entryId, text) => updateEntry.mutateAsync({ entryId, text }),
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

      return (data || []).map((r) => ({
        ...r,
        employeeName: r.profiles?.name,
      }));
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

      const { error } = await supabase.from("leave_requests").insert({
        employee_id: employeeId,
        type,
        start_date: startDate,
        end_date: endDate,
        days: Number(days),
        reason: reason?.trim() || null,
      });

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
      console.log("UPDATING LEAVE:", {
        requestId,
        employeeId,
        type,
        startDate,
        endDate,
        days,
        reason,
      });

      const { data, error } = await supabase
        .from("leave_requests")
        .update({
          type,
          start_date: startDate,
          end_date: endDate,
          days: Number(days),
          reason: reason?.trim() || null,
        })
        .eq("id", requestId)
        .eq("employee_id", employeeId)
        .select("*");

      console.log("UPDATE RESULT:", data);
      console.log("UPDATE ERROR:", error);

      if (error) {
        throw error;
      }

      // This is important.
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

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          decided_by: decidedBy,
          decided_at: status === "Pending" ? null : new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
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

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
      if (scope === "mine") q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return data.map((r) => ({ ...r, employeeName: r.profiles?.name }));
    },
    enabled: scope === "org" || !!employeeId,
  });

  // balance changes now happen via DB trigger (see schema) — always refresh roster too,
  // since submit/decide/delete can all move leave_balance under the hood
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["leave-requests"] });
    qc.invalidateQueries({ queryKey: ["roster"] });
  };

  const submit = useMutation({
    mutationFn: async ({ type, startDate, endDate, days, reason }) => {
      if (!LEAVE_TYPES.includes(type)) throw new Error("Invalid leave type.");
      const { error } = await supabase.from("leave_requests").insert({
        employee_id: employeeId,
        type,
        start_date: startDate,
        end_date: endDate,
        days,
        reason,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateRequest = useMutation({
    mutationFn: async ({
      requestId,
      type,
      startDate,
      endDate,
      days,
      reason,
    }) => {
      const existing = query.data?.find((r) => r.id === requestId);
      if (!existing) throw new Error("Leave request not found.");
      if (existing.status === "Approved")
        throw new Error("Approved leave cannot be edited.");
      const { error } = await supabase
        .from("leave_requests")
        .update({
          type,
          start_date: startDate,
          end_date: endDate,
          days,
          reason,
        })
        .eq("id", requestId)
        .eq("employee_id", employeeId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // no manual balance-restore code needed anymore — the delete trigger handles it
  const deleteRequest = useMutation({
    mutationFn: async (requestId) => {
      const { error } = await supabase
        .from("leave_requests")
        .delete()
        .eq("id", requestId)
        .eq("employee_id", employeeId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const decide = useMutation({
    mutationFn: async ({ requestId, status, decidedBy }) => {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          decided_by: decidedBy,
          decided_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    requests: query.data ?? null,
    isLoading: query.isLoading,
    submit: (payload) => submit.mutateAsync(payload),
    updateRequest: (requestId, payload) =>
      updateRequest.mutateAsync({ requestId, ...payload }),
    deleteRequest: (requestId) => deleteRequest.mutateAsync(requestId),
    decide: (requestId, status, decidedBy) =>
      decide.mutateAsync({ requestId, status, decidedBy }),
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

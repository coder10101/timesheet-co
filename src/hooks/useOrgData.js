import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------------- Attendance ---------------- */
export function useAttendance(employeeId) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["attendance", employeeId],
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

  const clockIn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance").insert({
        employee_id: employeeId,
        date: todayISO(),
        clock_in: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["attendance", employeeId] }),
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["attendance", employeeId] }),
  });

  return {
    records: query.data ?? null,
    isLoading: query.isLoading,
    clockIn: () => clockIn.mutateAsync(),
    clockOut: () => clockOut.mutateAsync(),
  };
}

/* ---------------- Work logs ---------------- */
export function useWorkLogs(employeeId) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["work-logs", employeeId],
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

  const addEntry = useMutation({
    mutationFn: async (text) => {
      const { error } = await supabase.from("work_logs").insert({
        employee_id: employeeId,
        date: todayISO(),
        entry_text: text,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["work-logs", employeeId] }),
  });

  return {
    entries: query.data ?? null,
    isLoading: query.isLoading,
    addEntry: (text) => addEntry.mutateAsync(text),
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

  const submit = useMutation({
    mutationFn: async ({ type, startDate, endDate, days, reason }) => {
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave-requests"] }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["roster"] }); // balance changed too
    },
  });

  return {
    requests: query.data ?? null,
    isLoading: query.isLoading,
    submit: (payload) => submit.mutateAsync(payload),
    decide: (requestId, status, decidedBy) =>
      decide.mutateAsync({ requestId, status, decidedBy }),
  };
}

/* ---------------- Roster ---------------- */
export function useRoster() {
  const query = useQuery({
    queryKey: ["roster"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return { employees: query.data ?? null, isLoading: query.isLoading };
}

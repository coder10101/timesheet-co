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
    mutationFn: async ({ text, date = todayISO(), projectId }) => {
      const { error } = await supabase.from("work_logs").insert({
        employee_id: employeeId,
        date,
        entry_text: text,
        project_id: projectId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateEntry = useMutation({
    mutationFn: async ({ entryId, text, projectId }) => {
      const { error } = await supabase
        .from("work_logs")
        .update({ entry_text: text, project_id: projectId ?? null })
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
    addEntry: (text, date, projectId) =>
      addEntry.mutateAsync({ text, date, projectId }),
    updateEntry: (entryId, text, projectId) =>
      updateEntry.mutateAsync({ entryId, text, projectId }),
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

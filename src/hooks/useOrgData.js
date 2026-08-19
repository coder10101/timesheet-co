import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { nepalDateTimeToISO } from "../utils/timezone";

const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------------- Attendance (single employee) ---------------- */
export function useAttendance(employeeId) {
  const [records, setRecords] = useState(null);

  const refresh = useCallback(async () => {
    if (!employeeId) return;

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .order("date", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setRecords(data || []);
  }, [employeeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clockIn = async () => {
    const { error } = await supabase.from("attendance").insert({
      employee_id: employeeId,
      date: todayISO(),
      clock_in: new Date().toISOString(),
    });

    if (error) throw error;

    await refresh();
  };

  const clockOut = async () => {
    const { error } = await supabase
      .from("attendance")
      .update({
        clock_out: new Date().toISOString(),
      })
      .eq("employee_id", employeeId)
      .eq("date", todayISO());

    if (error) throw error;

    await refresh();
  };

  /**
   * Edit an attendance record.
   *
   * We allow clock-in and clock-out changes,
   * but not changing the attendance date.
   */
  const updateAttendance = async (
    attendanceId,
    { clockIn: newClockIn, clockOut: newClockOut },
  ) => {
    const { error } = await supabase
      .from("attendance")
      .update({
        clock_in: newClockIn ? nepalDateTimeToISO(newClockIn) : null,

        clock_out: newClockOut ? nepalDateTimeToISO(newClockOut) : null,
      })
      .eq("id", attendanceId)
      .eq("employee_id", employeeId);

    if (error) throw error;

    await refresh();
  };

  return {
    records,
    clockIn,
    clockOut,
    updateAttendance,
    refresh,
  };
}

/* ---------------- Work logs (single employee) ---------------- */
export function useWorkLogs(employeeId) {
  const [entries, setEntries] = useState(null);

  const refresh = useCallback(async () => {
    if (!employeeId) return;

    const { data, error } = await supabase
      .from("work_logs")
      .select("*")
      .eq("employee_id", employeeId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setEntries(data || []);
  }, [employeeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addEntry = async (text, date = todayISO()) => {
    const { error } = await supabase.from("work_logs").insert({
      employee_id: employeeId,
      date,
      entry_text: text,
    });

    if (error) throw error;

    await refresh();
  };

  const updateEntry = async (entryId, text) => {
    const { error } = await supabase
      .from("work_logs")
      .update({
        entry_text: text,
      })
      .eq("id", entryId)
      .eq("employee_id", employeeId);

    if (error) throw error;

    await refresh();
  };

  const deleteEntry = async (entryId) => {
    const { error } = await supabase
      .from("work_logs")
      .delete()
      .eq("id", entryId)
      .eq("employee_id", employeeId);

    if (error) throw error;

    await refresh();
  };

  return {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    refresh,
  };
}

/* ---------------- Leave requests ----------------
   scope: "mine" (employee's own) or "org" (admin, sees everyone) */
export function useLeaveRequests(employeeId, scope = "mine") {
  const [requests, setRequests] = useState(null);

  const refresh = useCallback(async () => {
    let query = supabase
      .from("leave_requests")
      .select("*, profiles!leave_requests_employee_id_fkey(name)")
      .order("created_at", {
        ascending: false,
      });

    if (scope === "mine") {
      if (!employeeId) return;

      query = query.eq("employee_id", employeeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return;
    }

    setRequests(
      (data || []).map((r) => ({
        ...r,
        employeeName: r.profiles?.name,
      })),
    );
  }, [employeeId, scope]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = async ({ type, startDate, endDate, days, reason }) => {
    if (!LEAVE_TYPES.includes(type)) {
      throw new Error("Invalid leave type.");
    }

    const { error } = await supabase.from("leave_requests").insert({
      employee_id: employeeId,
      type,
      start_date: startDate,
      end_date: endDate,
      days,
      reason,
    });

    if (error) throw error;

    await refresh();
  };

  const updateRequest = async (
    requestId,
    { type, startDate, endDate, days, reason },
  ) => {
    const existing = requests?.find((r) => r.id === requestId);

    if (!existing) {
      throw new Error("Leave request not found.");
    }

    if (existing.status === "Approved") {
      throw new Error("Approved leave cannot be edited.");
    }

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

    await refresh();
  };

  const deleteRequest = async (requestId) => {
    const existing = requests?.find((r) => r.id === requestId);

    if (!existing) {
      throw new Error("Leave request not found.");
    }

    /*
     * Approved leave:
     *
     * balance was already deducted,
     * so restore it before deleting.
     */
    if (existing.status === "Approved") {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("leave_balance")
        .eq("id", employeeId)
        .single();

      if (error) throw error;

      const balance = profile.leave_balance || {};

      const current = Number(balance[existing.type] || 0);

      const restoredBalance = {
        ...balance,

        [existing.type]: current + Number(existing.days || 0),
      };

      const { error: balanceError } = await supabase
        .from("profiles")
        .update({
          leave_balance: restoredBalance,
        })
        .eq("id", employeeId);

      if (balanceError) {
        throw balanceError;
      }
    }

    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", requestId)
      .eq("employee_id", employeeId);

    if (error) throw error;

    await refresh();
  };

  const decide = async (requestId, status, decidedBy) => {
    const { error } = await supabase
      .from("leave_requests")
      .update({
        status,
        decided_by: decidedBy,
        decided_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) throw error;

    await refresh();
  };

  return {
    requests,
    submit,
    updateRequest,
    deleteRequest,
    decide,
    refresh,
  };
}

/* ---------------- Org roster (admin) ---------------- */
export function useRoster() {
  const [employees, setEmployees] = useState(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) console.error(error);
    setEmployees(data || []);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const adjustBalance = async (employeeId, type, delta) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("leave_balance")
      .eq("id", employeeId)
      .single();
    const nextBalance = {
      ...prof.leave_balance,
      [type]: Math.max(0, (prof.leave_balance[type] ?? 0) + delta),
    };
    const { error } = await supabase
      .from("profiles")
      .update({ leave_balance: nextBalance })
      .eq("id", employeeId);
    if (error) throw error;
    await refresh();
  };

  return { employees, adjustBalance, refresh };
}

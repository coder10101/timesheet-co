import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { isHalfDayLeave, LEAVE_QUOTAS } from "../utils/leaveUtils";

export const LEAVE_TYPES = ["Annual", "Sick", "Casual", "Unpaid"];

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
        .select(
          "*, profiles!leave_requests_employee_id_fkey(name, role, title)",
        )
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

      if (
        error &&
        (error.message?.includes("integer") ||
          error.code === "22P02" ||
          error.details?.includes("integer"))
      ) {
        console.warn(
          "Supabase leave_requests.days is typed as INT. Falling back to days: 1 with session metadata in reason.",
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

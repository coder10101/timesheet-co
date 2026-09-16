import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { isHalfDayLeave, LEAVE_QUOTAS } from "../utils/leaveUtils";
import { useAuth } from "../lib/AuthProvider";
import { getCachedRoster } from "./useRosterData";
import { sendNotification } from "./useNotificationsData";
import { isoToBSLabel } from "../utils/nepaliCalendar";

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
export function useLeaveRequests(employeeId, scope = "mine", explicitOrgId) {
  const qc = useQueryClient();
  const auth = useAuth();
  const currentOrgId = explicitOrgId || auth?.profile?.org_id;

  const key = [
    "leave-requests",
    scope,
    scope === "mine" ? employeeId : (currentOrgId || "org"),
  ];

  const query = useQuery({
    queryKey: key,

    queryFn: async () => {
      let q = supabase
        .from("leave_requests")
        .select(
          "*, profiles!leave_requests_employee_id_fkey(name, role, title, org_id, is_active)",
        )
        .order("created_at", { ascending: false });

      if (scope === "mine") {
        q = q.eq("employee_id", employeeId);
      } else if (scope === "approved" || scope === "team") {
        q = q.eq("status", "Approved");
      }

      let { data, error } = await q;

      // Graceful fallback if explicit foreign key constraint name fails
      if (error) {
        console.warn(
          "Failed with explicit foreign key constraint, trying standard profiles join...",
          error,
        );
        let fallbackQ = supabase
          .from("leave_requests")
          .select("*, profiles(name, role, title, org_id, is_active)")
          .order("created_at", { ascending: false });

        if (scope === "mine") {
          fallbackQ = fallbackQ.eq("employee_id", employeeId);
        } else if (scope === "approved" || scope === "team") {
          fallbackQ = fallbackQ.eq("status", "Approved");
        }

        const fallbackRes = await fallbackQ;
        if (!fallbackRes.error && fallbackRes.data) {
          data = fallbackRes.data;
          error = null;
        } else {
          // Plain query fallback
          let plainQ = supabase
            .from("leave_requests")
            .select("*")
            .order("created_at", { ascending: false });

          if (scope === "mine") {
            plainQ = plainQ.eq("employee_id", employeeId);
          } else if (scope === "approved" || scope === "team") {
            plainQ = plainQ.eq("status", "Approved");
          }

          const plainRes = await plainQ;
          if (plainRes.error) throw plainRes.error;
          data = plainRes.data;
          error = null;
        }
      }

      const cachedRoster = (currentOrgId ? getCachedRoster(currentOrgId) : null) || [];
      const rosterMap = new Map();
      cachedRoster.forEach((p) => {
        if (p?.id) rosterMap.set(p.id, p);
      });

      return (data || [])
        .filter((r) => {
          // For personal leaves, never filter out the user's own leaves
          if (scope === "mine") return true;

          // For team leaves (employee calendar / overview / team schedule), exclude revoked employees
          const isEmployeeRevoked =
            r.profiles?.is_active === false ||
            rosterMap.get(r.employee_id)?.is_active === false;
          if ((scope === "team" || scope === "approved") && isEmployeeRevoked) {
            return false;
          }

          // For team or org leaves, filter out employees from other organizations if org_id is known
          const empOrgId = r.profiles?.org_id || rosterMap.get(r.employee_id)?.org_id;
          if (currentOrgId && empOrgId && empOrgId !== currentOrgId) {
            return false;
          }

          if (scope === "org") {
            const role = (r.profiles?.role || rosterMap.get(r.employee_id)?.role)?.toLowerCase();
            const title = (r.profiles?.title || rosterMap.get(r.employee_id)?.title)?.toLowerCase();
            if (role === "admin" || title === "admin") return false;
          }
          return true;
        })
        .map((r) => {
          const isHalf = isHalfDayLeave(r);
          const rosterUser = rosterMap.get(r.employee_id);
          const isActive =
            r.profiles?.is_active !== undefined
              ? r.profiles.is_active !== false
              : rosterUser?.is_active !== false;

          return {
            ...r,
            days: isHalf ? 0.5 : Number(r.days),
            employeeName: r.profiles?.name || rosterUser?.name,
            employeeRole: r.profiles?.role || rosterUser?.role,
            employeeTitle: r.profiles?.title || rosterUser?.title,
            employeeIsActive: isActive,
          };
        });
    },

    enabled: scope === "mine" ? !!employeeId : true,
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

      // Dispatch notification to admins (Nepali BS dates only, no days or reason)
      const empName = auth?.profile?.name || auth?.user?.user_metadata?.name || "An employee";
      const startBS = isoToBSLabel(startDate);
      const endBS = isoToBSLabel(endDate);
      const dateText = startDate === endDate ? startBS : `${startBS} – ${endBS}`;

      await sendNotification({
        recipientRole: "admin",
        orgId: currentOrgId,
        actorId: employeeId,
        type: "leave_requested",
        title: "New Leave Request",
        message: `${empName} requested ${type} leave (${dateText}).`,
        link: "/leave-approvals",
        metadata: {
          employeeId,
          type,
          startDate,
          endDate,
          startDateBS: startBS,
          endDateBS: endBS,
        },
      });
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

        // Dispatch decision notification to the employee (Nepali BS dates only)
        const adminName = auth?.profile?.name || "Admin";
        const isApproved = status === "Approved";
        const isRejected = status === "Rejected";

        if (isApproved || isRejected) {
          const startBS = isoToBSLabel(existingReq.start_date);
          const endBS = isoToBSLabel(existingReq.end_date);
          const dateText =
            existingReq.start_date === existingReq.end_date
              ? startBS
              : `${startBS} – ${endBS}`;

          await sendNotification({
            recipientId: empId,
            orgId: currentOrgId,
            actorId: decidedBy || auth?.user?.id,
            type: isApproved ? "leave_approved" : "leave_rejected",
            title: isApproved ? "Leave Request Approved ✅" : "Leave Request Rejected ❌",
            message: `Your ${existingReq.type} leave (${dateText}) was ${status.toLowerCase()} by ${adminName}.`,
            link: "/leave",
            metadata: {
              requestId,
              status,
              type: existingReq.type,
              startDate: existingReq.start_date,
              endDate: existingReq.end_date,
              startDateBS: startBS,
              endDateBS: endBS,
            },
          });
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

/**
 * Convenient hook for employee and shared views to get all approved teammate leaves.
 */
export function useTeamLeaves(explicitOrgId) {
  const { requests, isLoading } = useLeaveRequests(null, "approved", explicitOrgId);
  return {
    teamLeaves: requests,
    isLoading,
  };
}

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { todayISO } from "../utils/timezone";
import { useAuth } from "../lib/AuthProvider";

/**
 * Parses duration hours and work_type ('site' | 'desk') from entry_text if columns
 * are missing in DB. Format typically: "[Site Visit - 2h] Text..." or "[Desk Work - Full Day] ..."
 */
export function extractLogMetadata(entry) {
  let hoursSpent = Number(entry?.hours_spent) || 0;
  let workType = entry?.work_type || "desk";

  if (entry?.entry_text && typeof entry.entry_text === "string") {
    const match = entry.entry_text.match(/\[(Site Visit|Desk Work|Site|Desk)(?:\s*-\s*([^\]]+))?\]/i);
    if (match) {
      const typeStr = match[1].toLowerCase();
      workType = typeStr.includes("site") ? "site" : "desk";
      if (match[2]) {
        const dur = match[2].trim().toLowerCase();
        if (dur.includes("full day")) {
          hoursSpent = 8;
        } else {
          const num = parseFloat(dur);
          if (!isNaN(num)) hoursSpent = num;
        }
      }
    }
  }

  return { hoursSpent, workType };
}

/* ---------------- Employee-specific Work Logs ---------------- */
export function useWorkLogs(employeeId) {
  const qc = useQueryClient();
  const auth = useAuth();
  const key = ["work-logs", employeeId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      let rawData = null;
      let { data, error } = await supabase
        .from("work_logs")
        .select("id, employee_id, project_id, date, entry_text, created_at, edit_history")
        .eq("employee_id", employeeId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error && (error.message?.includes("edit_history") || error.code === "42703")) {
        const res = await supabase
          .from("work_logs")
          .select("id, employee_id, project_id, date, entry_text, created_at")
          .eq("employee_id", employeeId)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });
        if (res.error) throw res.error;
        rawData = res.data;
      } else if (error) {
        throw error;
      } else {
        rawData = data;
      }

      return (rawData || []).map((e) => {
        const { hoursSpent, workType } = extractLogMetadata(e);
        return {
          ...e,
          hours_spent: hoursSpent,
          work_type: workType,
          edit_history: Array.isArray(e.edit_history) ? e.edit_history : [],
        };
      });
    },
    enabled: !!employeeId,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const invalidateAllRelated = () => {
    qc.invalidateQueries({ queryKey: ["work-logs"] });
    qc.invalidateQueries({ queryKey: ["projects"] });
    if (employeeId) {
      qc.invalidateQueries({ queryKey: ["attendance", employeeId] });
    }
    qc.invalidateQueries({ queryKey: ["org-attendance"] });
  };

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
      };

      const { error } = await supabase.from("work_logs").insert(insertData);
      if (error) throw error;
    },
    onSuccess: invalidateAllRelated,
  });

  const updateEntry = useMutation({
    mutationFn: async ({
      entryId,
      text,
      projectId,
      workType,
      reason,
      editorName,
      editorRole,
    }) => {
      // Find existing entry to detect changes
      let existingEntry = (query.data || []).find((e) => e.id === entryId);
      if (!existingEntry && entryId) {
        const { data: fetched } = await supabase
          .from("work_logs")
          .select("*")
          .eq("id", entryId)
          .maybeSingle();
        existingEntry = fetched;
      }

      const existingHistory = Array.isArray(existingEntry?.edit_history)
        ? existingEntry.edit_history
        : [];

      const changes = {};
      if (existingEntry) {
        if (text !== undefined && text !== existingEntry.entry_text) {
          changes.entry_text = {
            old: existingEntry.entry_text,
            new: text,
          };
        }
        const oldProj = existingEntry.project_id || null;
        const newProj = projectId !== undefined ? (projectId || null) : oldProj;
        if (oldProj !== newProj) {
          changes.project_id = {
            old: oldProj,
            new: newProj,
          };
        }
      }

      let newHistory = existingHistory;
      if (existingEntry && Object.keys(changes).length > 0) {
        const currentEditorName =
          editorName ||
          auth?.profile?.name ||
          auth?.user?.user_metadata?.name ||
          "Team Member";
        const currentEditorRole =
          editorRole || auth?.profile?.role || "employee";
        const currentEditorId = auth?.user?.id || null;

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

      const updateData = {
        entry_text: text,
        project_id: projectId ?? null,
      };

      const payloadWithHistory = {
        ...updateData,
        edit_history: newHistory,
      };

      let { error } = await supabase
        .from("work_logs")
        .update(payloadWithHistory)
        .eq("id", entryId);

      if (error && (error.message?.includes("edit_history") || error.code === "42703")) {
        const res = await supabase
          .from("work_logs")
          .update(updateData)
          .eq("id", entryId);
        error = res.error;
      }

      if (error) throw error;
    },
    onSuccess: invalidateAllRelated,
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
    onSuccess: invalidateAllRelated,
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
    updateEntry: (entryIdOrPayload, text, projectId, workType, reason) => {
      if (typeof entryIdOrPayload === "object" && entryIdOrPayload !== null) {
        return updateEntry.mutateAsync(entryIdOrPayload);
      }
      return updateEntry.mutateAsync({
        entryId: entryIdOrPayload,
        text,
        projectId,
        workType,
        reason,
      });
    },
    deleteEntry: (entryId) => deleteEntry.mutateAsync(entryId),
  };
}

/* ---------------- Org-wide work logs (for projects rollup & activity) ---------------- */
export function useOrgWorkLogs() {
  const qc = useQueryClient();

  // Supabase Realtime synchronization on work_logs
  useEffect(() => {
    const channel = supabase
      .channel("work_logs_realtime_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_logs" },
        () => {
          qc.invalidateQueries({ queryKey: ["work-logs"] });
          qc.invalidateQueries({ queryKey: ["projects"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const query = useQuery({
    queryKey: ["work-logs", "org"],
    queryFn: async () => {
      // 1. Primary join query with profiles and edit_history
      let rawData = null;
      let { data, error } = await supabase
        .from("work_logs")
        .select(
          "id, employee_id, project_id, date, entry_text, created_at, edit_history, profiles!work_logs_employee_id_fkey(name, role, title)"
        )
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        rawData = data;
      } else {
        // Fallback join with edit_history without explicit fkey constraint name
        const res1 = await supabase
          .from("work_logs")
          .select(
            "id, employee_id, project_id, date, entry_text, created_at, edit_history, profiles(name, role, title)"
          )
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });

        if (!res1.error && res1.data) {
          rawData = res1.data;
        } else {
          // Fallback join without edit_history
          const res2 = await supabase
            .from("work_logs")
            .select(
              "id, employee_id, project_id, date, entry_text, created_at, profiles(name, role, title)"
            )
            .order("date", { ascending: false })
            .order("created_at", { ascending: false });

          if (!res2.error && res2.data) {
            rawData = res2.data;
          } else {
            // Fallback plain query
            const res3 = await supabase
              .from("work_logs")
              .select("id, employee_id, project_id, date, entry_text, created_at")
              .order("date", { ascending: false })
              .order("created_at", { ascending: false });
            if (res3.error) throw res3.error;
            rawData = res3.data;
          }
        }
      }

      return (rawData || [])
        .filter((e) => {
          const role = e.profiles?.role?.toLowerCase();
          const title = e.profiles?.title?.toLowerCase();
          return role !== "admin" && title !== "admin";
        })
        .map((e) => {
          const { hoursSpent, workType } = extractLogMetadata(e);
          return {
            ...e,
            hours_spent: hoursSpent,
            work_type: workType,
            employeeName: e.profiles?.name || "Team Member",
            employeeRole: e.profiles?.role || "Employee",
            employeeId: e.employee_id,
            edit_history: Array.isArray(e.edit_history) ? e.edit_history : [],
          };
        });
    },
    staleTime: 1000 * 15, // 15 seconds
    refetchInterval: 20000, // 20s auto-refresh
  });

  return { entries: query.data ?? null, isLoading: query.isLoading };
}

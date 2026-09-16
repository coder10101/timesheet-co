import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

/* ---------------- Holidays ---------------- */
export function useHolidays() {
  const qc = useQueryClient();
  const key = ["holidays"];

  // Clear any legacy local holiday overrides so stale local copies don't linger
  try {
    localStorage.removeItem("app_holiday_overrides");
  } catch (_) {}

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return (data || []).sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const addHoliday = useMutation({
    mutationFn: async ({ date, name, category = "public", orgId }) => {
      const { data, error } = await supabase
        .from("holidays")
        .insert({ date, name, category, org_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data;
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
    }) => {
      let updateQuery = supabase
        .from("holidays")
        .update({ date, name, category });

      if (id) {
        updateQuery = updateQuery.eq("id", id);
      } else if (oldDate) {
        updateQuery = updateQuery.eq("date", oldDate);
      } else {
        updateQuery = updateQuery.eq("date", date);
      }

      const { data, error } = await updateQuery.select();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const deleteHoliday = useMutation({
    mutationFn: async (idOrDate) => {
      let deleteQuery = supabase.from("holidays").delete();
      if (
        typeof idOrDate === "string" &&
        idOrDate.includes("-") &&
        idOrDate.length === 10
      ) {
        deleteQuery = deleteQuery.eq("date", idOrDate);
      } else {
        deleteQuery = deleteQuery.eq("id", idOrDate);
      }
      const { error } = await deleteQuery;
      if (error) throw error;
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

/* ---------------- Events ---------------- */
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
          console.warn(
            "Notice querying organization (using default office hours):",
            error.message,
          );
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
      const currentHours = query.data?.office_hours || {};
      const mergedHours = {
        ...currentHours,
        ...newOfficeHours,
      };

      const { data, error } = await supabase
        .from("organizations")
        .update({ office_hours: mergedHours })
        .eq("id", orgId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Could not update office hours: no permission or record not found. Please run the SQL migration to enable admin RLS policies on organizations table.",
        );
      }
      return data[0];
    },
    onSuccess: (updatedOrg) => {
      if (updatedOrg) {
        qc.setQueryData(key, (old) => ({ ...(old || {}), ...updatedOrg }));
      }
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

      let updatedOrg = null;
      // Try updating both office_hours and settings
      const res1 = await supabase
        .from("organizations")
        .update({ office_hours: newOfficeHours, settings: newSettings })
        .eq("id", orgId)
        .select();

      if (res1.error) {
        // If settings column doesn't exist yet (PGRST204), gracefully persist to office_hours
        const res2 = await supabase
          .from("organizations")
          .update({ office_hours: newOfficeHours })
          .eq("id", orgId)
          .select();
        if (res2.error) throw res2.error;
        if (!res2.data || res2.data.length === 0) {
          throw new Error(
            "Could not update project settings: no permission or record not found. Please run the SQL migration.",
          );
        }
        updatedOrg = res2.data[0];
      } else {
        if (!res1.data || res1.data.length === 0) {
          throw new Error(
            "Could not update project settings: no permission or record not found. Please run the SQL migration.",
          );
        }
        updatedOrg = res1.data[0];
      }
      return updatedOrg;
    },
    onSuccess: (updatedOrg) => {
      if (updatedOrg) {
        qc.setQueryData(key, (old) => ({ ...(old || {}), ...updatedOrg }));
      }
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

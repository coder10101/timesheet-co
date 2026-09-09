import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

/* ---------------- Holidays ---------------- */
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
        const rawOverrides =
          localStorage.getItem("app_holiday_overrides") || "{}";
        const overrides = JSON.parse(rawOverrides);
        overrides[tempId] = {
          id: tempId,
          date,
          name,
          category,
          org_id: orgId,
        };
        localStorage.setItem(
          "app_holiday_overrides",
          JSON.stringify(overrides),
        );
      } catch (_) {}

      try {
        const { data, error } = await supabase
          .from("holidays")
          .insert({ date, name, category, org_id: orgId })
          .select();
        if (!error && data?.[0]?.id) {
          try {
            const rawOverrides =
              localStorage.getItem("app_holiday_overrides") || "{}";
            const overrides = JSON.parse(rawOverrides);
            delete overrides[tempId];
            overrides[data[0].id] = data[0];
            localStorage.setItem(
              "app_holiday_overrides",
              JSON.stringify(overrides),
            );
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

        if (error || !data || data.length === 0) {
          const upsertPayload = { date, name, category };
          if (id) upsertPayload.id = id;
          if (orgId) upsertPayload.org_id = orgId;

          await supabase.from("holidays").upsert(upsertPayload);
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

      try {
        const { error } = await supabase
          .from("organizations")
          .update({ office_hours: newOfficeHours, settings: newSettings })
          .eq("id", orgId);
        if (error) {
          const { error: err2 } = await supabase
            .from("organizations")
            .update({ office_hours: newOfficeHours })
            .eq("id", orgId);
          if (err2) throw err2;
        }
      } catch (err) {
        const { error: err2 } = await supabase
          .from("organizations")
          .update({ office_hours: newOfficeHours })
          .eq("id", orgId);
        if (err2) throw err2;
      }
    },
    onSuccess: () => {
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

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { calculateOverallProgress } from "../constants/projectPresets";
import { saveCachedRoster } from "./useRosterData";

export function parseStagesFromCurrentStage(stageStr) {
  if (!stageStr || typeof stageStr !== "string") {
    return { designStage: "", siteStage: "" };
  }
  let designStage = "";
  let siteStage = "";

  if (stageStr.includes("🎨") || stageStr.includes("🏗️")) {
    const dMatch = stageStr.match(/🎨\s*([^+🏗️]+)/);
    if (dMatch && dMatch[1]) designStage = dMatch[1].trim();

    const sMatch = stageStr.match(/🏗️\s*([^+🎨]+)/);
    if (sMatch && sMatch[1]) siteStage = sMatch[1].trim();
  }

  return { designStage, siteStage };
}

/* ---------------- Local Storage Fallback Cache ---------------- */
const LOCAL_PROJECT_META_KEY = "attendance_project_meta_v2";

export const getLocalProjectMeta = () => {
  try {
    const raw = localStorage.getItem(LOCAL_PROJECT_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveLocalProjectMeta = (projectIdOrName, fields) => {
  if (!projectIdOrName) return;
  try {
    const current = getLocalProjectMeta();
    const key = String(projectIdOrName);
    current[key] = {
      ...(current[key] || {}),
      ...fields,
    };
    localStorage.setItem(LOCAL_PROJECT_META_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
};

/* ---------------- Projects Hook ---------------- */
export function useProjects() {
  const qc = useQueryClient();
  const key = ["projects"];

  // Real-time synchronization: pick up coworker, employee, and admin changes immediately
  useEffect(() => {
    const channel = supabase
      .channel("realtime-projects-and-details")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          qc.invalidateQueries({ queryKey: key });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_details" },
        () => {
          qc.invalidateQueries({ queryKey: key });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: projData, error: projErr } = await supabase
        .from("projects")
        .select("*")
        .order("archived", { ascending: true })
        .order("name", { ascending: true });
      if (projErr) throw projErr;

      // 1. Try fetching decoupled project_details if table exists in DB
      let detailsMap = new Map();
      try {
        const { data: detailsData, error: detailsErr } = await supabase
          .from("project_details")
          .select("*");
        if (!detailsErr && Array.isArray(detailsData)) {
          detailsData.forEach((d) => {
            if (d?.project_id) detailsMap.set(String(d.project_id), d);
          });
        }
      } catch (_) {}

      // 2. Read fallback project metadata from organization office_hours
      let projectMeta = {};
      try {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("id, office_hours")
          .limit(1)
          .maybeSingle();
        if (orgData?.office_hours?.project_meta) {
          projectMeta = orgData.office_hours.project_meta;
        }
      } catch (e) {
        console.warn("Notice: could not read office_hours.project_meta", e);
      }

      // 3. Read local storage metadata as instant client bridge
      const localMeta = getLocalProjectMeta();
      const coworkerProfiles = [];

      // Merge and resolve authoritative project state
      const merged = (projData || []).map((p) => {
        const pIdStr = String(p.id);
        const normName = (p.name || "").trim().toLowerCase();
        const detail = detailsMap.get(pIdStr) || {};
        const meta = {
          ...(projectMeta[p.id] || projectMeta[normName] || {}),
          ...(localMeta[p.id] || localMeta[normName] || {}),
        };

        // Resilient dates
        const targetEndDate =
          (p.end_date && String(p.end_date).trim()) ||
          (p.deadline && String(p.deadline).trim()) ||
          (meta.end_date && String(meta.end_date).trim()) ||
          (meta.deadline && String(meta.deadline).trim()) ||
          "";
        const targetStartDate =
          (p.start_date && String(p.start_date).trim()) ||
          (meta.start_date && String(meta.start_date).trim()) ||
          "";

        // Authoritative resolution of stage
        const { designStage: parsedDesign, siteStage: parsedSite } =
          parseStagesFromCurrentStage(p.current_stage);

        const finalDesignStage =
          (detail.design_stage && String(detail.design_stage).trim()) ||
          (p.design_stage && String(p.design_stage).trim()) ||
          parsedDesign ||
          (meta.design_stage && String(meta.design_stage).trim()) ||
          "";

        const finalSiteStage =
          (detail.site_stage && String(detail.site_stage).trim()) ||
          (p.site_stage && String(p.site_stage).trim()) ||
          parsedSite ||
          (meta.site_stage && String(meta.site_stage).trim()) ||
          "";

        const finalLeadRole =
          detail.lead_architect_role ??
          p.lead_architect_role ??
          meta.lead_architect_role ??
          "Design";

        // Progress values
        const finalDesignProg =
          detail.design_progress !== undefined && detail.design_progress !== null
            ? Number(detail.design_progress)
            : p.design_progress !== undefined && p.design_progress !== null
              ? Number(p.design_progress)
              : parsedDesign && !parsedSite && p.progress !== undefined && p.progress !== null
                ? Number(p.progress)
                : meta.design_progress !== undefined && meta.design_progress !== null
                  ? Number(meta.design_progress)
                  : 0;

        const finalSiteProg =
          detail.site_progress !== undefined && detail.site_progress !== null
            ? Number(detail.site_progress)
            : p.site_progress !== undefined && p.site_progress !== null
              ? Number(p.site_progress)
              : parsedSite && !parsedDesign && p.progress !== undefined && p.progress !== null
                ? Number(p.progress)
                : meta.site_progress !== undefined && meta.site_progress !== null
                  ? Number(meta.site_progress)
                  : 0;

        // Track toggles: has_design & has_site
        let hasD = true;
        let hasS = true;

        if (detail.has_design !== undefined && detail.has_design !== null) {
          hasD = Boolean(detail.has_design);
        } else if (p.has_design !== undefined && p.has_design !== null) {
          hasD = Boolean(p.has_design);
        } else if (meta.has_design !== undefined && meta.has_design !== null) {
          hasD = Boolean(meta.has_design);
        } else {
          // Default heuristic if track toggle never set
          hasD = Boolean(
            finalDesignStage ||
            finalLeadRole === "Design" ||
            finalLeadRole === "Both" ||
            finalDesignProg > 0
          );
        }

        if (detail.has_site !== undefined && detail.has_site !== null) {
          hasS = Boolean(detail.has_site);
        } else if (p.has_site !== undefined && p.has_site !== null) {
          hasS = Boolean(p.has_site);
        } else if (meta.has_site !== undefined && meta.has_site !== null) {
          hasS = Boolean(meta.has_site);
        } else {
          // Default heuristic if track toggle never set
          hasS = Boolean(
            finalSiteStage ||
            finalLeadRole === "Site" ||
            finalLeadRole === "Both" ||
            finalSiteProg > 0
          );
        }

        // At least one track must be active
        if (!hasD && !hasS) {
          hasD = true;
        }

        const computedTrackProgress = calculateOverallProgress({
          designProgress: finalDesignProg,
          siteProgress: finalSiteProg,
          hasDesign: hasD,
          hasSite: hasS,
        });

        const rawProgress =
          p.progress !== undefined && p.progress !== null
            ? Number(p.progress)
            : meta.progress !== undefined && meta.progress !== null
              ? Number(meta.progress)
              : 0;

        const effectiveProgress =
          computedTrackProgress !== null ? computedTrackProgress : rawProgress;

        let finalCurrentStage = (p.current_stage && String(p.current_stage).trim()) || "";
        if (!finalCurrentStage) {
          if (hasD && hasS && finalDesignStage && finalSiteStage) {
            finalCurrentStage = `🎨 ${finalDesignStage} + 🏗️ ${finalSiteStage}`;
          } else if (hasD && finalDesignStage) {
            finalCurrentStage = `🎨 ${finalDesignStage}`;
          } else if (hasS && finalSiteStage) {
            finalCurrentStage = `🏗️ ${finalSiteStage}`;
          } else {
            finalCurrentStage = (meta.current_stage && String(meta.current_stage).trim()) || "";
          }
        }

        const leadNameStr = p.lead_architect ?? meta.lead_architect ?? "";
        const subNamesMap =
          typeof detail.sub_architect_names === "object" && detail.sub_architect_names !== null
            ? detail.sub_architect_names
            : typeof p.sub_architect_names === "object" && p.sub_architect_names !== null
              ? p.sub_architect_names
              : typeof meta.sub_architect_names === "object" && meta.sub_architect_names !== null
                ? meta.sub_architect_names
                : {};

        const subRolesMap =
          typeof detail.sub_architect_roles === "object" && detail.sub_architect_roles !== null
            ? detail.sub_architect_roles
            : typeof p.sub_architect_roles === "object" && p.sub_architect_roles !== null
              ? p.sub_architect_roles
              : typeof meta.sub_architect_roles === "object" && meta.sub_architect_roles !== null
                ? meta.sub_architect_roles
                : {};

        const externalCollabs =
          detail.external_collaborators ||
          p.external_collaborators ||
          meta.external_collaborators ||
          "";

        // Seed coworker cache with non-UUID names from projects
        if (p.lead_architect_id && leadNameStr && !/^[0-9a-f-]{36}$/i.test(leadNameStr)) {
          coworkerProfiles.push({
            id: p.lead_architect_id,
            name: leadNameStr,
            role: "employee",
          });
        }
        if (subNamesMap && typeof subNamesMap === "object") {
          Object.entries(subNamesMap).forEach(([sId, sName]) => {
            if (sName && !/^[0-9a-f-]{36}$/i.test(sName)) {
              coworkerProfiles.push({ id: sId, name: sName, role: "employee" });
            }
          });
        }

        return {
          ...p,
          has_design: hasD,
          has_site: hasS,
          hasDesign: hasD,
          hasSite: hasS,
          lead_architect_id: p.lead_architect_id ?? meta.lead_architect_id ?? null,
          lead_architect: leadNameStr,
          lead_architect_role: finalLeadRole,
          sub_architect_ids:
            Array.isArray(p.sub_architect_ids) && p.sub_architect_ids.length > 0
              ? p.sub_architect_ids
              : (meta.sub_architect_ids ?? []),
          sub_architect_roles: subRolesMap,
          sub_architect_names: subNamesMap,
          sub_architects: p.sub_architects ?? meta.sub_architects ?? "",
          external_collaborators: externalCollabs,
          design_stage: finalDesignStage,
          design_progress: finalDesignProg,
          site_stage: finalSiteStage,
          site_progress: finalSiteProg,
          project_work: p.project_work ?? meta.project_work ?? "",
          current_stage: finalCurrentStage,
          project_type: p.project_type ?? meta.project_type ?? "",
          start_date: targetStartDate,
          end_date: targetEndDate,
          deadline: targetEndDate,
          status: p.status ?? meta.status ?? (p.archived ? "Completed" : "Active"),
          progress: effectiveProgress,
          payment_status:
            p.payment_status ??
            meta.payment_status ??
            detail.payment_status ??
            (p.payment_remaining || meta.payment_remaining || detail.payment_remaining
              ? "Payment Remaining"
              : ""),
          payment_remaining:
            p.payment_remaining ??
            meta.payment_remaining ??
            detail.payment_remaining ??
            "",
          activity_history:
            Array.isArray(detail.activity_history) && detail.activity_history.length > 0
              ? detail.activity_history
              : Array.isArray(p.activity_history) && p.activity_history.length > 0
                ? p.activity_history
                : Array.isArray(meta.activity_history)
                  ? meta.activity_history
                  : [],
        };
      });

      if (coworkerProfiles.length > 0) {
        saveCachedRoster(coworkerProfiles);
      }

      return merged;
    },
    staleTime: 1000 * 15,
    refetchInterval: 15000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["organization"] });
    qc.invalidateQueries({ queryKey: ["work-logs"] });
  };

  // Helper to persist extended fields into organization's office_hours.project_meta
  const saveProjectMetaFallback = async (projectIdOrName, fields, orgId) => {
    try {
      let orgQuery = supabase.from("organizations").select("id, office_hours");
      if (orgId) orgQuery = orgQuery.eq("id", orgId);
      const { data: orgData } = await orgQuery.limit(1).maybeSingle();

      if (orgData) {
        const currentMeta = orgData.office_hours?.project_meta || {};
        const updatedMeta = {
          ...currentMeta,
          [projectIdOrName]: {
            ...(currentMeta[projectIdOrName] || {}),
            ...fields,
          },
        };
        await supabase
          .from("organizations")
          .update({
            office_hours: {
              ...(orgData.office_hours || {}),
              project_meta: updatedMeta,
            },
          })
          .eq("id", orgData.id);
      }
    } catch (err) {
      console.warn("Could not save to project_meta fallback:", err);
    }
  };

  // Helper to persist into project_details table
  const saveProjectDetailsTable = async (projectId, fields) => {
    if (!projectId) return;
    try {
      const detailsPayload = {
        project_id: projectId,
        has_design: fields.has_design !== undefined ? fields.has_design : true,
        has_site: fields.has_site !== undefined ? fields.has_site : true,
        design_stage: fields.design_stage || "",
        design_progress: Number(fields.design_progress) || 0,
        site_stage: fields.site_stage || "",
        site_progress: Number(fields.site_progress) || 0,
        lead_architect_role: fields.lead_architect_role || "Design",
        sub_architect_roles: fields.sub_architect_roles || {},
        sub_architect_names: fields.sub_architect_names || {},
        external_collaborators: fields.external_collaborators || "",
        payment_status: fields.payment_status || "",
        payment_remaining: fields.payment_remaining || "",
        activity_history: fields.activity_history || [],
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from("project_details")
        .upsert(detailsPayload, { onConflict: "project_id" });
    } catch (err) {
      console.warn("project_details table upsert notice (fallback active):", err);
    }
  };

  const createProject = useMutation({
    mutationFn: async ({ orgId, actor, ...fields }) => {
      const initialHistory = [
        {
          id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: "created",
          title: "Project created",
          description: `Created new project "${fields.name}"`,
          user_id: actor?.id || null,
          user_name: actor?.name || "Admin",
          user_role: actor?.role || "Admin",
          created_at: new Date().toISOString(),
        },
      ];

      const hasD = fields.has_design !== undefined ? fields.has_design : fields.hasDesign !== undefined ? fields.hasDesign : true;
      const hasS = fields.has_site !== undefined ? fields.has_site : fields.hasSite !== undefined ? fields.hasSite : true;

      const calcProg = calculateOverallProgress({
        designProgress: Number(fields.design_progress) || 0,
        siteProgress: Number(fields.site_progress) || 0,
        hasDesign: hasD,
        hasSite: hasS,
      });

      const corePayload = {
        name: fields.name,
        color: fields.color || "#63537E",
        status: fields.status || "Active",
        current_stage: fields.current_stage || "",
        progress: fields.progress !== undefined ? Number(fields.progress) : calcProg,
        start_date: fields.start_date || "",
        end_date: fields.end_date || fields.deadline || "",
        lead_architect_id: fields.lead_architect_id || null,
        sub_architect_ids: Array.isArray(fields.sub_architect_ids) ? fields.sub_architect_ids : [],
        project_work: fields.project_work || "",
        project_type: fields.project_type || "",
        org_id: orgId,
      };

      let insertedId = null;
      let insertedProject = null;

      // Try inserting with core payload
      const { data, error } = await supabase
        .from("projects")
        .insert(corePayload)
        .select();

      if (error) throw error;
      if (data?.[0]?.id) {
        insertedId = data[0].id;
        insertedProject = data[0];
      }

      const extendedData = {
        ...fields,
        has_design: hasD,
        has_site: hasS,
        activity_history: initialHistory,
      };

      if (insertedId) {
        saveLocalProjectMeta(insertedId, extendedData);
        saveProjectMetaFallback(insertedId, extendedData, orgId);
        await saveProjectDetailsTable(insertedId, extendedData);
      }

      return {
        ...(insertedProject || {}),
        ...extendedData,
      };
    },
    onSuccess: invalidate,
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, actor, activityRecords, ...fields }) => {
      const currentProjects = qc.getQueryData(key) || [];
      const existing = currentProjects.find((p) => String(p.id) === String(id));
      const targetEndDate =
        fields.end_date !== undefined ? fields.end_date : fields.deadline;

      const newActivities = Array.isArray(activityRecords)
        ? [...activityRecords]
        : Array.isArray(fields.activity_history)
          ? [...fields.activity_history]
          : [];
      const authorName = actor?.name || fields.user_name || "Team Member";
      const authorId = actor?.id || null;
      const authorRole = actor?.role || null;
      const nowISO = new Date().toISOString();

      if (newActivities.length === 0 && existing) {
        if (
          fields.current_stage !== undefined &&
          fields.current_stage !== existing.current_stage
        ) {
          newActivities.push({
            id: `act_${Date.now()}_stage_${Math.random().toString(36).slice(2, 6)}`,
            type: "stage_change",
            title: `Stage changed to ${fields.current_stage}`,
            description: existing.current_stage
              ? `Stage changed from "${existing.current_stage}" to "${fields.current_stage}"`
              : `Stage set to "${fields.current_stage}"`,
            old_value: existing.current_stage || "",
            new_value: fields.current_stage,
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
        if (
          targetEndDate !== undefined &&
          targetEndDate !== (existing.end_date || existing.deadline)
        ) {
          newActivities.push({
            id: `act_${Date.now()}_deadline_${Math.random().toString(36).slice(2, 6)}`,
            type: "deadline_change",
            title: targetEndDate ? `Target deadline updated` : `Deadline cleared`,
            description: targetEndDate
              ? existing.end_date
                ? `Deadline changed from ${existing.end_date} to ${targetEndDate}`
                : `Target deadline scheduled for ${targetEndDate}`
              : `Removed target deadline`,
            old_value: existing.end_date || existing.deadline || "",
            new_value: targetEndDate || "",
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
        if (fields.start_date !== undefined && fields.start_date !== existing.start_date) {
          newActivities.push({
            id: `act_${Date.now()}_start_${Math.random().toString(36).slice(2, 6)}`,
            type: "start_date_change",
            title: fields.start_date ? `Start date set to ${fields.start_date}` : `Start date cleared`,
            description: `Start date updated`,
            old_value: existing.start_date || "",
            new_value: fields.start_date || "",
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
        if (fields.status !== undefined && fields.status !== existing.status) {
          newActivities.push({
            id: `act_${Date.now()}_status_${Math.random().toString(36).slice(2, 6)}`,
            type: "status_change",
            title: `Status changed to ${fields.status}`,
            description: existing.status
              ? `Status changed from "${existing.status}" to "${fields.status}"`
              : `Status set to "${fields.status}"`,
            old_value: existing.status || "",
            new_value: fields.status,
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
        if (
          fields.progress !== undefined &&
          Number(fields.progress) !== Number(existing.progress) &&
          (fields.current_stage === undefined || fields.current_stage === existing.current_stage)
        ) {
          newActivities.push({
            id: `act_${Date.now()}_prog_${Math.random().toString(36).slice(2, 6)}`,
            type: "progress_change",
            title: `Progress updated to ${fields.progress}%`,
            description: `Completion progress adjusted from ${existing.progress || 0}% to ${fields.progress}%`,
            old_value: existing.progress || 0,
            new_value: Number(fields.progress),
            user_id: authorId,
            user_name: authorName,
            user_role: authorRole,
            created_at: nowISO,
          });
        }
      }

      const existingHistory = Array.isArray(existing?.activity_history)
        ? existing.activity_history
        : [];
      const updatedHistory =
        newActivities.length > 0
          ? [...newActivities, ...existingHistory].slice(0, 100)
          : existingHistory;

      // Track toggles
      const hasD =
        fields.has_design !== undefined
          ? fields.has_design
          : fields.hasDesign !== undefined
            ? fields.hasDesign
            : existing?.has_design !== undefined
              ? existing.has_design
              : true;

      const hasS =
        fields.has_site !== undefined
          ? fields.has_site
          : fields.hasSite !== undefined
            ? fields.hasSite
            : existing?.has_site !== undefined
              ? existing.has_site
              : true;

      const curDesignProg =
        fields.design_progress !== undefined
          ? Number(fields.design_progress)
          : existing?.design_progress !== undefined
            ? Number(existing.design_progress)
            : 0;

      const curSiteProg =
        fields.site_progress !== undefined
          ? Number(fields.site_progress)
          : existing?.site_progress !== undefined
            ? Number(existing.site_progress)
            : 0;

      let effectiveProgress =
        fields.progress !== undefined && fields.progress !== null
          ? Number(fields.progress)
          : calculateOverallProgress({
              designProgress: curDesignProg,
              siteProgress: curSiteProg,
              hasDesign: hasD,
              hasSite: hasS,
            });

      // Core payload for projects table
      const corePayload = {};
      if (fields.name !== undefined) corePayload.name = fields.name;
      if (fields.color !== undefined) corePayload.color = fields.color;
      if (fields.status !== undefined) corePayload.status = fields.status;
      if (fields.archived !== undefined) corePayload.archived = fields.archived;
      if (fields.current_stage !== undefined) corePayload.current_stage = fields.current_stage;
      if (effectiveProgress !== undefined) corePayload.progress = effectiveProgress;
      if (fields.start_date !== undefined) corePayload.start_date = fields.start_date;
      if (targetEndDate !== undefined) corePayload.end_date = targetEndDate;
      if (fields.lead_architect_id !== undefined) corePayload.lead_architect_id = fields.lead_architect_id;
      if (fields.sub_architect_ids !== undefined) corePayload.sub_architect_ids = fields.sub_architect_ids;
      if (fields.project_work !== undefined) corePayload.project_work = fields.project_work;
      if (fields.project_type !== undefined) corePayload.project_type = fields.project_type;
      corePayload.updated_at = nowISO;

      const allMergedFields = {
        ...fields,
        has_design: hasD,
        has_site: hasS,
        hasDesign: hasD,
        hasSite: hasS,
        progress: effectiveProgress,
        start_date: fields.start_date !== undefined ? fields.start_date : existing?.start_date,
        end_date: targetEndDate,
        deadline: targetEndDate,
        activity_history: updatedHistory,
      };

      const cleanMerged = Object.fromEntries(
        Object.entries(allMergedFields).filter(([_, v]) => v !== undefined)
      );

      const orgId = actor?.org_id || existing?.org_id;

      saveLocalProjectMeta(id, cleanMerged);
      if (existing?.name) saveLocalProjectMeta(existing.name.trim().toLowerCase(), cleanMerged);
      saveProjectMetaFallback(id, cleanMerged, orgId);
      if (existing?.name) saveProjectMetaFallback(existing.name.trim().toLowerCase(), cleanMerged, orgId);
      await saveProjectDetailsTable(id, cleanMerged);

      // Optimistic cache update
      qc.setQueryData(key, (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((p) => {
          if (String(p.id) === String(id)) {
            return {
              ...p,
              ...cleanMerged,
              end_date: targetEndDate !== undefined ? targetEndDate : p.end_date,
              deadline: targetEndDate !== undefined ? targetEndDate : p.deadline,
              activity_history: updatedHistory,
            };
          }
          return p;
        });
      });

      // Update core projects table
      const { data, error } = await supabase
        .from("projects")
        .update(corePayload)
        .eq("id", id)
        .select();

      if (error) {
        // Safe minimal fallback if any column errored
        const minimal = {
          current_stage: fields.current_stage,
          progress: effectiveProgress,
          status: fields.status,
          end_date: targetEndDate,
          updated_at: nowISO,
        };
        Object.keys(minimal).forEach((k) => minimal[k] === undefined && delete minimal[k]);
        await supabase.from("projects").update(minimal).eq("id", id);
      }

      return { id, ...allMergedFields, ...(data?.[0] || {}) };
    },
    onSuccess: invalidate,
  });

  const updateProjectStageAndDeadline = useMutation({
    mutationFn: async ({
      id,
      currentStage,
      deadline,
      endDate,
      progress,
      status,
      designStage,
      designProgress,
      siteStage,
      siteProgress,
      hasDesign,
      hasSite,
      has_design,
      has_site,
      actor,
      activityRecords,
    }) => {
      return updateProject.mutateAsync({
        id,
        current_stage: currentStage,
        end_date: endDate !== undefined ? endDate : deadline,
        deadline: endDate !== undefined ? endDate : deadline,
        progress,
        status,
        design_stage: designStage,
        design_progress: designProgress,
        site_stage: siteStage,
        site_progress: siteProgress,
        has_design: has_design !== undefined ? has_design : hasDesign,
        has_site: has_site !== undefined ? has_site : hasSite,
        actor,
        activityRecords,
      });
    },
    onSuccess: invalidate,
  });

  const deleteProject = useMutation({
    mutationFn: async (id) => {
      // First clean up project_details if exists
      try {
        await supabase.from("project_details").delete().eq("project_id", id);
      } catch (_) {}
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const batchImportProjects = useMutation({
    mutationFn: async ({ projects, orgId }) => {
      const rows = projects.map((p) => ({
        name: p.name,
        color: p.color || "#63537E",
        org_id: orgId,
        lead_architect_id: p.lead_architect_id || null,
        sub_architect_ids: p.sub_architect_ids || [],
        project_work: p.project_work || "",
        current_stage: p.current_stage || "",
        project_type: p.project_type || "",
        start_date: p.start_date || "",
        end_date: p.end_date || p.deadline || "",
        status: p.status || "Active",
      }));

      const { error } = await supabase.from("projects").insert(rows);
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
    isDbMigrationRequired: false,
    refetchDbSchema: () => query.refetch(),
    createProject: (payload) => createProject.mutateAsync(payload),
    updateProject: (idOrPayload, maybePayload) => {
      if (typeof idOrPayload === "object" && idOrPayload !== null) {
        return updateProject.mutateAsync(idOrPayload);
      }
      return updateProject.mutateAsync({
        id: idOrPayload,
        ...(maybePayload || {}),
      });
    },
    updateProjectStageAndDeadline: (payload) =>
      updateProjectStageAndDeadline.mutateAsync(payload),
    deleteProject: (id) => deleteProject.mutateAsync(id),
    batchImportProjects: (payload) => batchImportProjects.mutateAsync(payload),
    archiveProject: (id, archived) =>
      archiveProject.mutateAsync({ id, archived }),
  };
}

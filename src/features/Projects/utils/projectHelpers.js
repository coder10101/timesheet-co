import {
  Layers,
  Clock,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Sparkles,
  Activity,
} from "lucide-react";
import { getDeadlineUrgency } from "../../../constants/projectPresets";

/**
 * Resolves the display name of the lead architect for a project.
 */
export const getLeadName = (project, empMap) => {
  if (!project) return "";
  if (project.lead_architect_id && empMap) {
    const u = empMap.get ? empMap.get(project.lead_architect_id) : null;
    if (u?.name) return u.name;
    if (u?.email) return u.email;
  }
  if (
    project.lead_architect &&
    !/^[0-9a-f-]{36}$/i.test(project.lead_architect)
  ) {
    return project.lead_architect;
  }
  return "";
};

/**
 * Computes all sub-architects and team contributors with their roles.
 * Merges explicit roster selections, external collaborator text, and work log contributors.
 */
export const getSubArchitectsList = (project, empMap, projectStats) => {
  if (!project) return [];
  const stats = projectStats?.get ? projectStats.get(project.id) : null;
  const result = [];
  const seen = new Set();

  // 1. Employee roster selections by ID
  if (Array.isArray(project.sub_architect_ids)) {
    project.sub_architect_ids.forEach((id) => {
      const emp = empMap?.get ? empMap.get(id) : null;
      const metaName = project.sub_architect_names?.[id];
      let name = emp?.name || metaName || "";
      if (!name && !/^[0-9a-f-]{36}$/i.test(id)) {
        name = id;
      } else if (!name) {
        name = "Team Member";
      }
      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        const role = project.sub_architect_roles?.[id] || "Design";
        const isActive = emp ? emp.is_active !== false : true;
        result.push({ id, name, role, isExternal: false, isActive });
      }
    });
  }

  // 2. Custom sub-architect text if present (External Collaborators)
  if (project.sub_architects) {
    project.sub_architects
      .split(/[,;/+]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => {
        if (!seen.has(s.toLowerCase())) {
          seen.add(s.toLowerCase());
          result.push({ name: s, role: "Design", isExternal: true, isActive: true });
        }
      });
  }

  // 3. Anyone who contributed in work logs for this project (excluding lead architect)
  const leadLower = getLeadName(project, empMap).trim().toLowerCase();
  const leadId = project.lead_architect_id;
  if (stats?.contributors) {
    stats.contributors.forEach((c) => {
      const cLower = (c.name || "").trim().toLowerCase();
      if (c.id !== leadId && cLower !== leadLower && !seen.has(cLower)) {
        seen.add(cLower);
        const autoRole =
          c.siteHours > 0 && c.deskHours > 0
            ? "Both"
            : c.siteHours > 0
              ? "Site"
              : "Design";
        const emp = c.id && empMap?.get ? empMap.get(c.id) : null;
        const isActive = emp ? emp.is_active !== false : (c.isActive !== false);
        result.push({ id: c.id, name: c.name, role: autoRole, isExternal: false, isActive });
      }
    });
  }

  return result;
};

/**
 * Calculates contributor metrics, urgency, and individual association per project.
 */
export const calculateProjectStats = (
  projects = [],
  entries = [],
  empMap,
  currentUserId = null,
  currentUserName = null,
) => {
  const map = new Map();
  const projList = projects || [];
  const entryList = entries || [];
  const userId = currentUserId;
  const userNameLower = currentUserName ? currentUserName.toLowerCase() : "";

  projList.forEach((p) => {
    const pEntries = entryList.filter((e) => e.project_id === p.id);

    const leadNameStr = getLeadName(p, empMap).toLowerCase();
    const isLead = Boolean(
      (userId && p.lead_architect_id === userId) ||
      (userNameLower && leadNameStr === userNameLower) ||
      (userNameLower && p.lead_architect?.toLowerCase() === userNameLower),
    );

    const isSub = Boolean(
      (userId && p.sub_architect_ids?.includes(userId)) ||
      (userNameLower && p.sub_architects?.toLowerCase().includes(userNameLower)),
    );

    const userLogCount = userId
      ? pEntries.filter((e) => e.employee_id === userId).length
      : 0;
    const isContributor = userLogCount > 0;
    const isMyProject = isLead || isSub || isContributor;

    // Group contributors from work logs
    const contributorMap = new Map();
    pEntries.forEach((e) => {
      if (!e.employee_id) return;
      const current = contributorMap.get(e.employee_id) || {
        count: 0,
        name: e.employeeName,
        siteHours: 0,
        deskHours: 0,
      };
      current.count += 1;
      const hours = parseFloat(e.hours_spent) || 1;
      if (
        e.work_type === "site" ||
        (e.text && e.text.includes("[Site Visit]"))
      ) {
        current.siteHours += hours;
      } else {
        current.deskHours += hours;
      }
      if (e.employeeName) current.name = e.employeeName;
      contributorMap.set(e.employee_id, current);
    });

    const autoContributors = Array.from(contributorMap.entries())
      .map(([empId, cStat]) => {
        const emp = empMap?.get ? empMap.get(empId) : null;
        return {
          id: empId,
          name: emp?.name || cStat.name || "Team Member",
          employee: emp || null,
          logCount: cStat.count,
          siteHours: cStat.siteHours,
          deskHours: cStat.deskHours,
        };
      })
      .sort((a, b) => b.logCount - a.logCount);

    const urgency = getDeadlineUrgency(p.end_date || p.deadline, p.status);
    const status = p.status || (p.archived ? "Completed" : "Active");

    map.set(p.id, {
      memberCount: autoContributors.length,
      contributors: autoContributors,
      entryCount: pEntries.length,
      status,
      urgency,
      isMyProject,
      userLogCount,
    });
  });

  return map;
};

/**
 * Calculates top-level KPI counts (Active, Urgent, Delayed, Completed).
 */
export const calculateKPIStats = (projects = [], projectStats) => {
  const list = projects || [];
  let active = 0;
  let urgent = 0;
  let delayed = 0;
  let completed = 0;

  list.forEach((p) => {
    const stats = projectStats?.get ? projectStats.get(p.id) : null;
    const urgency = stats?.urgency;
    const st = (p.status || "").toLowerCase();

    if (p.archived || st === "completed" || st === "complete") {
      completed++;
    } else {
      active++;
      if (urgency?.type === "urgent") urgent++;
      else if (urgency?.type === "delayed") delayed++;
    }
  });

  return { active, urgent, delayed, completed, total: list.length };
};

/**
 * Filters projects list based on search query, status chip, and tab ("my" vs "all").
 */
export const filterProjects = (
  projects = [],
  {
    searchQuery = "",
    statusFilter = "all",
    tab = "all",
    empMap,
    projectStats,
  },
) => {
  const list = projects || [];
  return list.filter((p) => {
    const stats = projectStats?.get ? projectStats.get(p.id) : null;
    const urgency = stats?.urgency;
    const normStatus = (p.status || "").toLowerCase();

    // Tab filter (for employee "my projects")
    if (tab === "my") {
      if (!stats?.isMyProject) return false;
    }

    // Search query
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = p.name?.toLowerCase().includes(q);
      const workMatch = p.project_work?.toLowerCase().includes(q);
      const stageMatch = p.current_stage?.toLowerCase().includes(q);
      const leadMatch = getLeadName(p, empMap).toLowerCase().includes(q);
      const subMatch = (
        Array.isArray(p.sub_architect_ids) ? p.sub_architect_ids : []
      )
        .map((id) => (empMap?.get ? empMap.get(id)?.name || "" : ""))
        .join(" ")
        .toLowerCase()
        .includes(q);
      if (!nameMatch && !workMatch && !stageMatch && !leadMatch && !subMatch) {
        return false;
      }
    }

    // Status filter
    if (statusFilter === "active") {
      if (p.archived || normStatus === "completed") return false;
    } else if (statusFilter === "urgent") {
      if (urgency?.type !== "urgent") return false;
    } else if (statusFilter === "delayed") {
      if (urgency?.type !== "delayed") return false;
    } else if (statusFilter === "completed") {
      if (!p.archived && normStatus !== "completed") return false;
    }

    return true;
  });
};

/**
 * Returns icon, color, and pill badges for activity history types.
 */
export const getActivityMeta = (type) => {
  switch (type) {
    case "stage_change":
      return {
        icon: Layers,
        color: "text-[#63537E] bg-[#63537E]/10 border-[#63537E]/25",
        pill: "bg-[#63537E]/10 text-[#514366] border-[#63537E]/25",
        label: "Stage Change",
      };
    case "deadline_change":
      return {
        icon: Clock,
        color: "text-amber-600 bg-amber-50 border-amber-200",
        pill: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Deadline",
      };
    case "status_change":
      return {
        icon: CheckCircle2,
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
        pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Status",
      };
    case "start_date_change":
      return {
        icon: Calendar,
        color: "text-blue-600 bg-blue-50 border-blue-200",
        pill: "bg-blue-50 text-blue-700 border-blue-200",
        label: "Start Date",
      };
    case "progress_change":
      return {
        icon: TrendingUp,
        color: "text-teal-600 bg-teal-50 border-teal-200",
        pill: "bg-teal-50 text-teal-700 border-teal-200",
        label: "Progress",
      };
    case "created":
      return {
        icon: Sparkles,
        color: "text-teal-600 bg-teal-50 border-teal-200",
        pill: "bg-teal-50 text-teal-700 border-teal-200",
        label: "Initialized",
      };
    default:
      return {
        icon: Activity,
        color: "text-slate-600 bg-slate-50 border-slate-200",
        pill: "bg-slate-50 text-slate-700 border-slate-200",
        label: "Activity",
      };
  }
};

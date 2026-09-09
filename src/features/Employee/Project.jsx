import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  Calendar,
  Search,
  X,
  Pencil,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon,
  ArrowRight,
  Clock,
  Eye,
} from "lucide-react";
import {
  useProjects,
  useOrgWorkLogs,
  useRoster,
} from "../../hooks/useOrgData";
import { useOfficeHours } from "../../constants/officeHours";
import {
  getProjectConfig,
  getDeadlineUrgency,
  STAGE_PIPELINES,
  TRACK_STAGES,
  calculateOverallProgress,
  getNextStage,
  getStageDefaultProgress,
  STATUS_OPTIONS,
  formatProjectDateNepali,
  formatRelativeTime,
  normalizeDateToISO,
  getInitials,
  getProjectTypeBadgeClass,
  ASSIGNED_ROLES,
  getArchitectAssignedRole,
  getAssignedRoleBadgeClass,
  getAssignedRoleBadgeText,
} from "../../constants/projectPresets";
import { NepaliDatePicker } from "../../components/NepaliDatePicker";
import { QuickStageModal } from "../Projects/components/QuickStageModal";
import { QuickDeadlineModal } from "../Projects/components/QuickDeadlineModal";
import { ProjectTrackBadges, ProjectDeadlineBadge } from "../Projects/components/ProjectTrackBadges";

export function EmployeeProjects({ me }) {
  const { projects, updateProjectStageAndDeadline } = useProjects();
  const { entries } = useOrgWorkLogs();
  const { employees } = useRoster();
  const officeHours = useOfficeHours();

  const config = officeHours.projectConfig || getProjectConfig();

  // View switch: 'table' vs 'cards'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("timesheet_employee_project_view") || "table";
  });

  useEffect(() => {
    localStorage.setItem("timesheet_employee_project_view", viewMode);
  }, [viewMode]);

  // Filters & State
  const [tab, setTab] = useState("my"); // 'my' | 'all'
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Quick edit modals
  const [quickStageProject, setQuickStageProject] = useState(null);
  const [quickDeadlineProject, setQuickDeadlineProject] = useState(null);
  const [savingQuick, setSavingQuick] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const empMap = useMemo(
    () => new Map((employees || []).map((e) => [e.id, e])),
    [employees]
  );

  const getLeadName = (p) => {
    if (p.lead_architect_id) {
      const u = empMap.get(p.lead_architect_id);
      if (u?.name) return u.name;
      if (u?.email) return u.email;
    }
    if (p.lead_architect && !/^[0-9a-f-]{36}$/i.test(p.lead_architect)) {
      return p.lead_architect;
    }
    return "";
  };

  // Map employee stats and contributions
  const projectStats = useMemo(() => {
    const map = new Map();
    const projList = projects || [];
    const entryList = entries || [];

    projList.forEach((p) => {
      const pEntries = entryList.filter((e) => e.project_id === p.id);

      const leadNameStr = getLeadName(p).toLowerCase();
      const isLead =
        p.lead_architect_id === me.id ||
        leadNameStr === me.name?.toLowerCase() ||
        p.lead_architect?.toLowerCase() === me.name?.toLowerCase();

      const isSub =
        p.sub_architect_ids?.includes(me.id) ||
        p.sub_architects?.toLowerCase().includes(me.name?.toLowerCase());

      const userLogCount = pEntries.filter((e) => e.employee_id === me.id).length;
      const isContributor = userLogCount > 0;

      // Group all contributors from work logs
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
        if (e.work_type === "site" || (e.text && e.text.includes("[Site Visit]"))) {
          current.siteHours += 1;
        } else {
          current.deskHours += 1;
        }
        if (e.employeeName) current.name = e.employeeName;
        contributorMap.set(e.employee_id, current);
      });

      const autoContributors = Array.from(contributorMap.entries())
        .map(([empId, cStat]) => {
          const emp = empMap.get(empId);
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

      const isMyProject = isLead || isSub || isContributor;
      const urgency = getDeadlineUrgency(p.end_date || p.deadline, p.status);

      map.set(p.id, {
        isMyProject,
        isLead,
        isSub,
        isContributor,
        userLogCount,
        entryCount: pEntries.length,
        contributors: autoContributors,
        status: p.status || (p.archived ? "Completed" : "Active"),
        urgency,
      });
    });

    return map;
  }, [projects, entries, empMap, me]);

  // Helper to compute all Sub-Architects for a project with their roles
  const getSubArchitectsList = (p) => {
    const stats = projectStats.get(p.id);
    const result = [];
    const seen = new Set();

    // 1. Employee roster selections by ID
    if (Array.isArray(p.sub_architect_ids)) {
      p.sub_architect_ids.forEach((id) => {
        const emp = empMap.get(id);
        const metaName = p.sub_architect_names?.[id];
        let name = emp?.name || metaName || "";
        if (!name && !/^[0-9a-f-]{36}$/i.test(id)) {
          name = id;
        } else if (!name) {
          name = "Team Member";
        }
        if (!seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          const role = p.sub_architect_roles?.[id] || "Design";
          result.push({ id, name, role });
        }
      });
    }

    // 2. Custom sub-architect text if present (External Collaborators)
    if (p.sub_architects) {
      p.sub_architects
        .split(/[,;/+]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => {
          if (!seen.has(s.toLowerCase())) {
            seen.add(s.toLowerCase());
            result.push({ name: s, role: "Design", isExternal: true });
          }
        });
    }

    // 3. Anyone who contributed in work logs for this project (excluding lead architect)
    const leadLower = getLeadName(p).trim().toLowerCase();
    const leadId = p.lead_architect_id;
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
          result.push({ id: c.id, name: c.name, role: autoRole });
        }
      });
    }

    return result;
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!projects) return [];

    return projects.filter((p) => {
      const stats = projectStats.get(p.id);
      const urgency = stats?.urgency;
      const normStatus = (p.status || "").toLowerCase();

      if (tab === "my" && !stats?.isMyProject) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = p.name?.toLowerCase().includes(q);
        const workMatch = p.project_work?.toLowerCase().includes(q);
        const stageMatch = p.current_stage?.toLowerCase().includes(q);
        const leadMatch = getLeadName(p).toLowerCase().includes(q) || p.lead_architect?.toLowerCase().includes(q);
        const subMatch = (Array.isArray(p.sub_architect_ids) ? p.sub_architect_ids : [])
          .map((id) => empMap.get(id)?.name || "")
          .join(" ")
          .toLowerCase()
          .includes(q);
        if (!nameMatch && !workMatch && !stageMatch && !leadMatch && !subMatch) return false;
      }

      if (statusFilter === "active") {
        if (p.archived || normStatus === "completed") return false;
      } else if (statusFilter === "urgent") {
        if (urgency?.type !== "urgent") return false;
      } else if (statusFilter === "completed") {
        if (!p.archived && normStatus !== "completed") return false;
      }

      return true;
    });
  }, [projects, tab, searchQuery, statusFilter, projectStats, empMap]);

  // Save Quick Stage
  const handleSaveStage = async (payload) => {
    if (config.allowEmployeeEdit === false) {
      alert("Employee editing has been disabled by your organization administrator.");
      return;
    }
    setSavingQuick(true);
    try {
      await updateProjectStageAndDeadline({
        ...payload,
        actor: { id: me?.id, name: me?.name, role: me?.role },
      });
      setQuickStageProject(null);
      setSuccessMsg("Stage and progress updated successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      alert(e.message || "Failed to update stage.");
      throw e;
    } finally {
      setSavingQuick(false);
    }
  };

  // Save Quick Deadline
  const handleSaveDeadline = async (payload) => {
    if (config.allowEmployeeEdit === false) {
      alert("Employee editing has been disabled by your organization administrator.");
      return;
    }
    setSavingQuick(true);
    try {
      await updateProjectStageAndDeadline({
        ...payload,
        actor: { id: me?.id, name: me?.name, role: me?.role },
      });
      setQuickDeadlineProject(null);
      setSuccessMsg("Deadline updated successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      alert(e.message || "Failed to update deadline.");
      throw e;
    } finally {
      setSavingQuick(false);
    }
  };

  // 1-Click Advance Stage
  const handleAdvanceStage = async (p, e) => {
    e?.stopPropagation();
    if (config.allowEmployeeEdit === false) {
      alert("Employee editing has been disabled by your organization administrator.");
      return;
    }
    const next = getNextStage(p.current_stage);
    if (!next) return;
    try {
      const nextProgress = getStageDefaultProgress(next, p.status);
      await updateProjectStageAndDeadline({
        id: p.id,
        currentStage: next,
        progress: nextProgress,
        actor: { id: me?.id, name: me?.name, role: me?.role },
      });
      setSuccessMsg(`Project advanced to ${next}!`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.message || "Failed to advance stage.");
    }
  };

  const isProjectsLoading = projects === null;

  if (config.enabled === false) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center max-w-md mx-auto shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FolderKanban size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800">Projects Module Not Enabled</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            The Projects workspace is currently disabled for this organization by the administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 fade-in pb-12">
      {/* NOTIFICATIONS */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="cursor-pointer text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-xs text-slate-500 mt-1">
            View your initiatives, update {config.stageLabel.toLowerCase()}s, and manage delivery deadlines.
          </p>
        </div>

        {/* VIEW SWITCHER: TABLE VS CARDS */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <TableIcon size={14} />
            <span>Table</span>
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === "cards"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LayoutGrid size={14} />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* TABS & FILTERS TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* TABS: MY PROJECTS VS ALL */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start md:self-auto">
          <button
            onClick={() => setTab("my")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              tab === "my"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            My Assigned Projects
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              tab === "all"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All Initiatives
          </button>
        </div>

        {/* SEARCH & STATUS CHIPS */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search project, ${config.leadLabel.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {["all", "active", "urgent", "completed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "bg-slate-100/70 hover:bg-slate-200/60 text-slate-600"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT: TABLE OR CARDS */}
      {isProjectsLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-2xs">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between animate-pulse">
              <div className="w-36 h-4 bg-slate-200 rounded" />
              <div className="w-24 h-4 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-2xs space-y-3">
          <FolderKanban size={40} className="mx-auto text-slate-300 stroke-1" />
          <p className="font-semibold text-slate-800 text-sm">No projects to display</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {tab === "my"
              ? "You are not assigned to any projects yet. When you log tasks under a project, it will appear here automatically!"
              : "No projects match your active filter."}
          </p>
          {tab === "my" && (
            <button
              onClick={() => setTab("all")}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium shadow-xs"
            >
              Browse All Projects
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* ================= TABLE VIEW FOR EMPLOYEE ================= */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[220px]">Project List</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap min-w-[180px]">{config.leadLabel}s & Team</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">{config.stageLabel}</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Start Date</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Deadline</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Project Status</th>
                  <th className="py-3.5 px-3 whitespace-nowrap text-slate-400">Last Updated</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => {
                  const stats = projectStats.get(p.id) || {
                    status: p.status || "Active",
                    urgency: getDeadlineUrgency(p.end_date || p.deadline, p.status),
                  };
                  const urgency = stats.urgency;
                  const leadName = getLeadName(p);
                  const subs = getSubArchitectsList(p);
                  const hasD = Boolean(p.design_stage || p.lead_architect_role === "Design" || p.lead_architect_role === "Both" || Number(p.design_progress) > 0);
                  const hasS = Boolean(p.site_stage || p.lead_architect_role === "Site" || p.lead_architect_role === "Both" || Number(p.site_progress) > 0);
                  const progressPct = (hasD || hasS)
                    ? calculateOverallProgress({
                        designProgress: p.design_progress,
                        siteProgress: p.site_progress,
                        hasDesign: hasD,
                        hasSite: hasS,
                        manualProgress: p.progress,
                      })
                    : (typeof p.progress === "number" ? p.progress : getStageDefaultProgress(p.current_stage, stats.status));
                  const myRole = getArchitectAssignedRole(p, me.id);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* 1. PROJECT LIST (WITH WORK, TYPE PILL, & ASSIGNED ROLE BELOW) */}
                      <td className="py-3.5 px-4 min-w-[220px]">
                        <div className="flex items-start gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                            style={{ backgroundColor: p.color || "#63537E" }}
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/projects/${p.id}`}
                              className="font-bold text-slate-900 hover:text-primary text-xs block truncate max-w-[220px] transition-colors"
                              title={`View ${p.name} details & logs`}
                            >
                              {p.name}
                            </Link>
                            <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                              {p.project_work ? (
                                <span className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]" title={p.project_work}>
                                  {p.project_work}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  General Work
                                </span>
                              )}
                              {p.project_type && (
                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold border shadow-2xs shrink-0 ${getProjectTypeBadgeClass(p.project_type)}`}>
                                  {p.project_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. ARCHITECTS & ASSIGNED SCOPE UNDER EMPLOYEE */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-start gap-2.5 flex-wrap">
                          {leadName ? (
                            <div className="flex flex-col items-start gap-1 group/arch relative">
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300/80 text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-200/80"
                                title={`Lead ${config.leadLabel}: ${leadName}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                <span>{getInitials(leadName)}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lead</span>
                              </span>
                              {/* Assigned Scope UNDER employee */}
                              <span
                                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border shadow-2xs ${getAssignedRoleBadgeClass(p.lead_architect_role || "Design")}`}
                                title={`Lead Scope: ${p.lead_architect_role || "Design"}`}
                              >
                                {getAssignedRoleBadgeText(p.lead_architect_role || "Design")}
                              </span>
                              <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/arch:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[10px] font-medium shadow-md whitespace-nowrap z-30 pointer-events-none">
                                <span>Lead {config.leadLabel}: {leadName}</span>
                                <span className="text-slate-400 font-bold">• {p.lead_architect_role || "Design"}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-normal">—</span>
                          )}

                          {subs.length > 0 &&
                            subs.map((s, idx) => {
                              const sName = typeof s === "object" ? s.name : s;
                              const sRole = typeof s === "object" ? s.role : "Design";
                              const isExt = Boolean(typeof s === "object" && s.isExternal);
                              return (
                                <div key={idx} className="flex flex-col items-start gap-1 group/sub relative">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                                      isExt
                                        ? "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                                    }`}
                                    title={isExt ? `External Collaborator: ${sName}` : `Sub-${config.leadLabel}: ${sName}`}
                                  >
                                    <span>{getInitials(sName)}</span>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isExt ? "text-amber-700" : "text-slate-400"}`}>
                                      {isExt ? "Ext" : "Sub"}
                                    </span>
                                  </span>
                                  {/* Assigned Scope or Ext badge UNDER employee */}
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border shadow-2xs ${
                                      isExt
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : getAssignedRoleBadgeClass(sRole)
                                    }`}
                                    title={isExt ? `External Collaborator: ${sName}` : `Sub Scope: ${sRole}`}
                                  >
                                    {isExt ? "External" : getAssignedRoleBadgeText(sRole)}
                                  </span>
                                  <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/sub:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[10px] font-medium shadow-md whitespace-nowrap z-30 pointer-events-none">
                                    <span>{isExt ? "External Collaborator" : `Sub-${config.leadLabel}`}: {sName}</span>
                                    {!isExt && <span className="text-slate-400 font-bold">• {sRole}</span>}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </td>

                      {/* 3. CURRENT STAGE (SUPPORTS DUAL-TRACK & MULTI-STAGE TAGS) */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {config.allowEmployeeEdit !== false ? (
                            <button
                              type="button"
                              onClick={() => setQuickStageProject(p)}
                              className="inline-flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer group/stage text-left"
                              title="Click to update stage"
                            >
                              <ProjectTrackBadges project={p} compact={true} />
                              <Pencil size={11} className="text-slate-400 group-hover/stage:text-primary transition-colors shrink-0" />
                            </button>
                          ) : (
                            <ProjectTrackBadges project={p} compact={true} />
                          )}
                        </div>
                      </td>

                      {/* 4. START DATE (NEPALI BS) */}
                      <td className="py-3.5 px-3 text-slate-700 text-xs whitespace-nowrap">
                        <span className="font-medium" title={p.start_date}>
                          {formatProjectDateNepali(p.start_date)}
                        </span>
                      </td>

                      {/* 5. DEADLINE (NEPALI BS + URGENCY) */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <ProjectDeadlineBadge
                          deadline={p.end_date || p.deadline}
                          status={p.status}
                          onClick={config.allowEmployeeEdit !== false ? () => setQuickDeadlineProject(p) : undefined}
                        />
                      </td>

                      {/* 6. PROJECT STATUS & PROGRESS */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${
                                stats.status === "Active" || stats.status === "Ongoing"
                                  ? "bg-emerald-500"
                                  : stats.status === "Completed"
                                    ? "bg-purple-500"
                                    : stats.status === "On Hold"
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                              }`} />
                              {stats.status}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {progressPct}%
                            </span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                stats.status === "Completed"
                                  ? "bg-purple-500"
                                  : stats.status === "On Hold"
                                    ? "bg-amber-500"
                                    : stats.status === "Delayed"
                                      ? "bg-rose-500"
                                      : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                            />
                          </div>
                          {(p.design_stage || p.site_stage || Number(p.design_progress) > 0 || Number(p.site_progress) > 0) && (
                            <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500 pt-0.5">
                              {(p.design_stage || Number(p.design_progress) > 0) && (
                                <span className="text-indigo-700 bg-indigo-50 px-1 rounded">🎨 {p.design_progress ?? 0}%</span>
                              )}
                              {(p.site_stage || Number(p.site_progress) > 0) && (
                                <span className="text-amber-800 bg-amber-50 px-1 rounded">🏗️ {p.site_progress ?? 0}%</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 7. LAST UPDATED */}
                      <td className="py-3.5 px-3 text-slate-400 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1" title={p.updated_at || p.created_at || ""}>
                          <Clock size={11} className="shrink-0 text-slate-300" />
                          <span>{formatRelativeTime(p.updated_at || p.created_at)}</span>
                        </div>
                      </td>

                      {/* 8. ACTIONS */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`/projects/${p.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                            title="View Project Overview & Work Logs"
                          >
                            <Eye size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= CARDS VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => {
            const stats = projectStats.get(p.id) || {
              status: p.status || "Active",
              userLogCount: 0,
              urgency: getDeadlineUrgency(p.end_date || p.deadline, p.status),
            };
            const urgency = stats.urgency;
            const leadName = getLeadName(p);
            const hasD = Boolean(p.design_stage || p.lead_architect_role === "Design" || p.lead_architect_role === "Both" || Number(p.design_progress) > 0);
            const hasS = Boolean(p.site_stage || p.lead_architect_role === "Site" || p.lead_architect_role === "Both" || Number(p.site_progress) > 0);
            const progressPct = (hasD || hasS)
              ? calculateOverallProgress({
                  designProgress: p.design_progress,
                  siteProgress: p.site_progress,
                  hasDesign: hasD,
                  hasSite: hasS,
                  manualProgress: p.progress,
                })
              : (typeof p.progress === "number" ? p.progress : getStageDefaultProgress(p.current_stage, stats.status));

            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: p.color || "#63537E" }}
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                          <Link
                            to={`/projects/${p.id}`}
                            className="hover:text-primary transition-colors"
                            title={`View ${p.name} details & logs`}
                          >
                            {p.name}
                          </Link>
                        </h3>
                        <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                          {p.project_work && (
                            <span className="text-[11px] text-slate-500 font-normal">
                              {p.project_work}
                            </span>
                          )}
                          {p.project_type && (
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${getProjectTypeBadgeClass(p.project_type)}`}>
                              {p.project_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                        stats.status === "Active" || stats.status === "Ongoing"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : stats.status === "Completed"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : stats.status === "On Hold"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {stats.status}
                    </span>
                  </div>

                  <div className="pt-1 flex flex-col gap-2">
                    {/* CURRENT STAGE */}
                    <div className="flex items-start justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-medium shrink-0 pt-0.5">{config.stageLabel}:</span>
                      <div className="flex items-center gap-1">
                        {config.allowEmployeeEdit !== false ? (
                          <button
                            type="button"
                            onClick={() => setQuickStageProject(p)}
                            className="text-left cursor-pointer"
                            title="Click to update stage"
                          >
                            <ProjectTrackBadges project={p} compact={true} />
                          </button>
                        ) : (
                          <ProjectTrackBadges project={p} compact={true} />
                        )}
                      </div>
                    </div>

                    {/* DEADLINE */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-medium">Deadline:</span>
                      <ProjectDeadlineBadge
                        deadline={p.end_date || p.deadline}
                        status={p.status}
                        onClick={config.allowEmployeeEdit !== false ? () => setQuickDeadlineProject(p) : undefined}
                      />
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Overall Progress</span>
                        <span className="font-bold text-slate-800">{progressPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            stats.status === "Completed"
                              ? "bg-purple-600"
                              : stats.status === "On Hold"
                                ? "bg-amber-500"
                                : stats.status === "Delayed"
                                  ? "bg-rose-500"
                                  : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                        />
                      </div>
                      {(p.design_stage || p.site_stage) && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100/80 text-[10px]">
                          <div className="bg-[#63537E]/10 p-1.5 rounded-md border border-[#63537E]/20">
                            <div className="flex justify-between text-[#514366] font-semibold mb-0.5">
                              <span>🎨 Design</span>
                              <span>{p.design_progress ?? 0}%</span>
                            </div>
                            <div className="w-full h-1 bg-[#63537E]/15 rounded-full overflow-hidden">
                              <div className="h-full bg-[#63537E] rounded-full" style={{ width: `${p.design_progress ?? 0}%` }} />
                            </div>
                          </div>
                          <div className="bg-teal-50 p-1.5 rounded-md border border-teal-200/80">
                            <div className="flex justify-between text-teal-900 font-semibold mb-0.5">
                              <span>🏗️ Site</span>
                              <span>{p.site_progress ?? 0}%</span>
                            </div>
                            <div className="w-full h-1 bg-teal-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-600 rounded-full" style={{ width: `${p.site_progress ?? 0}%` }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-xs text-slate-500">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
                        {config.leadLabel}:
                      </span>
                      {leadName ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs truncate max-w-[170px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="truncate">{leadName}</span>
                          <span className={`px-1 py-0.1 rounded text-[8px] font-bold ${getAssignedRoleBadgeClass(p.lead_architect_role || "Design")}`}>
                            {p.lead_architect_role || "Design"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-normal">Unassigned</span>
                      )}
                    </div>
                    {stats.userLogCount > 0 && (
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 shrink-0">
                        {stats.userLogCount} logs by you
                      </span>
                    )}
                  </div>
                  {(() => {
                    const subs = getSubArchitectsList(p);
                    if (!subs.length) return null;
                    return (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                        <span className="text-[10px] font-medium text-slate-400 shrink-0 uppercase tracking-wider">
                          {config.subLeadLabel}:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {subs.slice(0, 3).map((s, idx) => {
                            const sName = typeof s === "object" ? s.name : s;
                            const sRole = typeof s === "object" ? s.role : "Design";
                            const isExt = Boolean(typeof s === "object" && s.isExternal);
                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border truncate max-w-[130px] ${
                                  isExt
                                    ? "bg-amber-50 text-amber-900 border-amber-200"
                                    : "bg-slate-50 text-slate-700 border-slate-200/80"
                                }`}
                                title={isExt ? `External Collaborator: ${sName}` : `${sName} (${sRole})`}
                              >
                                <span className="truncate">{sName}</span>
                                <span
                                  className={`px-1 py-0.1 rounded text-[8px] font-semibold ${
                                    isExt
                                      ? "bg-amber-100 text-amber-800"
                                      : getAssignedRoleBadgeClass(sRole)
                                  }`}
                                >
                                  {isExt ? "Ext" : sRole}
                                </span>
                              </span>
                            );
                          })}
                          {subs.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-medium self-center">
                              +{subs.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-end text-[10px] text-slate-400 pt-1">
                    <span>Updated {formatRelativeTime(p.updated_at || p.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared Quick Stage Modal */}
      <QuickStageModal
        isOpen={Boolean(quickStageProject)}
        onClose={() => setQuickStageProject(null)}
        project={quickStageProject}
        onSave={handleSaveStage}
        saving={savingQuick}
        isAdmin={false}
      />

      {/* Shared Quick Deadline Modal */}
      <QuickDeadlineModal
        isOpen={Boolean(quickDeadlineProject)}
        onClose={() => setQuickDeadlineProject(null)}
        project={quickDeadlineProject}
        onSave={handleSaveDeadline}
        saving={savingQuick}
      />
    </div>
  );
}

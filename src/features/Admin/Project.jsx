import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  FolderKanban,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Settings2,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  Users,
  Sparkles,
  Copy,
  ArrowRight,
  TrendingUp,
  Clock,
  Eye,
} from "lucide-react";
import { useProjects, useOrgWorkLogs, useRoster } from "../../hooks/useOrgData";
import { useOfficeHours } from "../../constants/officeHours";
import {
  PROJECT_PRESETS,
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
import { todayISO } from "../../utils/workTime";
import { ProjectFormModal } from "../Projects/components/ProjectFormModal";
import { QuickStageModal } from "../Projects/components/QuickStageModal";
import { QuickDeadlineModal } from "../Projects/components/QuickDeadlineModal";
import { ProjectTrackBadges, ProjectDeadlineBadge } from "../Projects/components/ProjectTrackBadges";

const PRESET_COLORS = [
  "#63537E", // Plum
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#64748B", // Slate
];

export function AdminProjects({ me }) {
  const {
    projects,
    createProject,
    updateProject,
    updateProjectStageAndDeadline,
    deleteProject,
    isLoading: isProjectsLoading,
  } = useProjects();
  const { entries } = useOrgWorkLogs();
  const { employees } = useRoster();
  const officeHours = useOfficeHours();

  const config = officeHours.projectConfig || getProjectConfig();
  const { updateProjectConfig } = officeHours;

  // View switch: 'table' vs 'cards' (saved to localStorage for persistence)
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("timesheet_project_view") || "table";
  });

  useEffect(() => {
    localStorage.setItem("timesheet_project_view", viewMode);
  }, [viewMode]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [quickStageProject, setQuickStageProject] = useState(null);
  const [quickDeadlineProject, setQuickDeadlineProject] = useState(null);
  const [quickStatusProject, setQuickStatusProject] = useState(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Settings Form State
  const [settingsPreset, setSettingsPreset] = useState(
    config.preset || "architecture",
  );
  const [settingsLeadLabel, setSettingsLeadLabel] = useState(config.leadLabel);
  const [settingsSubLeadLabel, setSettingsSubLeadLabel] = useState(
    config.subLeadLabel,
  );
  const [settingsWorkLabel, setSettingsWorkLabel] = useState(config.workLabel);
  const [settingsStageLabel, setSettingsStageLabel] = useState(
    config.stageLabel,
  );
  const [settingsTypeLabel, setSettingsTypeLabel] = useState(config.typeLabel);
  const [settingsEnabled, setSettingsEnabled] = useState(
    config.enabled !== false,
  );
  const [settingsAllowEmployeeEdit, setSettingsAllowEmployeeEdit] = useState(
    config.allowEmployeeEdit !== false,
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // Quick Edit State
  const [statusInput, setStatusInput] = useState("Active");
  const [progressInput, setProgressInput] = useState(0);
  const [savingQuick, setSavingQuick] = useState(false);

  // Sync State
  const [syncing, setSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const empMap = useMemo(
    () => new Map((employees || []).map((e) => [e.id, e])),
    [employees],
  );

  // Exclude admin members from being assigned as project architects
  const assignableEmployees = useMemo(() => {
    return (employees || []).filter(
      (emp) =>
        (emp.role || "").toLowerCase() !== "admin" &&
        !emp.is_admin &&
        (emp.role || "").toLowerCase() !== "administrator",
    );
  }, [employees]);

  const getLeadName = (p) => {
    if (p.lead_architect_id) {
      const u = empMap.get(p.lead_architect_id);
      if (u?.name) return u.name;
    }
    if (p.lead_architect && !/^[0-9a-f-]{36}$/i.test(p.lead_architect)) {
      return p.lead_architect;
    }
    return "";
  };

  // Compute stats and urgency for each project
  const projectStats = useMemo(() => {
    const map = new Map();
    const projList = projects || [];
    const entryList = entries || [];

    projList.forEach((p) => {
      const pEntries = entryList.filter((e) => e.project_id === p.id);

      const contributorMap = new Map();
      pEntries.forEach((e) => {
        if (!e.employee_id) return;
        const current = contributorMap.get(e.employee_id) || {
          count: 0,
          name: e.employeeName,
        };
        current.count += 1;
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
      });
    });

    return map;
  }, [projects, entries, empMap]);

  // Overall KPI counts
  const kpiStats = useMemo(() => {
    const list = projects || [];
    let active = 0;
    let urgent = 0;
    let delayed = 0;
    let completed = 0;

    list.forEach((p) => {
      const stats = projectStats.get(p.id);
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
  }, [projects, projectStats]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    const list = projects || [];
    return list.filter((p) => {
      const stats = projectStats.get(p.id);
      const urgency = stats?.urgency;
      const normStatus = (p.status || "").toLowerCase();

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = p.name?.toLowerCase().includes(q);
        const workMatch = p.project_work?.toLowerCase().includes(q);
        const stageMatch = p.current_stage?.toLowerCase().includes(q);
        const leadMatch = getLeadName(p).toLowerCase().includes(q);
        const subMatch = (
          Array.isArray(p.sub_architect_ids) ? p.sub_architect_ids : []
        )
          .map((id) => empMap.get(id)?.name || "")
          .join(" ")
          .toLowerCase()
          .includes(q);
        if (
          !nameMatch &&
          !workMatch &&
          !stageMatch &&
          !leadMatch &&
          !subMatch
        ) {
          return false;
        }
      }

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
  }, [projects, searchQuery, statusFilter, projectStats, empMap]);


  // Helper to compute all Sub-Architects for a project with their roles (Explicit + Custom + Work Log Contributors)
  const getSubArchitectsList = (p) => {
    const stats = projectStats.get(p.id);
    const result = [];
    const seen = new Set();

    // 1. Employee roster selections by ID (User Info)
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

  // Advance Project to Next Stage
  const handleAdvanceStage = async (p, e) => {
    e?.stopPropagation();
    const next = getNextStage(p.current_stage);
    if (!next) return;
    const isFinishing =
      next === "Completed" || next.toLowerCase() === "handover";
    const nextStatus = isFinishing ? "Completed" : p.status || "Active";
    const nextProgress = getStageDefaultProgress(next, nextStatus);

    try {
      await updateProjectStageAndDeadline({
        id: p.id,
        currentStage: next,
        status: nextStatus,
        progress: nextProgress,
        actor: { id: me?.id, name: me?.name, role: me?.role },
      });
      setSuccessMsg(`Project advanced to ${next}!`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.message || "Failed to advance stage.");
    }
  };

  // Quick Status & Progress Update
  const handleSaveQuickStatus = async (p, newStatus, newProgress) => {
    try {
      await updateProjectStageAndDeadline({
        id: p.id,
        status: newStatus,
        progress: Number(newProgress) || 0,
        actor: { id: me?.id, name: me?.name, role: me?.role },
      });
      setQuickStatusProject(null);
      setSuccessMsg("Status and progress updated!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.message || "Failed to update status.");
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingProject(null);
    setErr("");
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (p) => {
    setEditingProject(p);
    setErr("");
    setIsEditModalOpen(true);
  };

  // Save Project
  const handleSaveProject = async (payload) => {
    setSaving(true);
    setErr("");
    try {
      if (editingProject) {
        await updateProject({
          id: editingProject.id,
          ...payload,
          actor: { id: me?.id, name: me?.name, role: me?.role },
        });
        setSuccessMsg("Project updated successfully.");
      } else {
        await createProject({
          ...payload,
          orgId: me?.org_id,
          actor: { id: me?.id, name: me?.name, role: me?.role },
        });
        setSuccessMsg("Project created successfully.");
      }
      setIsEditModalOpen(false);
      setEditingProject(null);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      setErr(e.message || "Failed to save project.");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  // Save Quick Stage
  const handleSaveStage = async (payload) => {
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

  // Delete Project
  const handleDeleteProject = async (id, name) => {
    if (!window.confirm(`Delete project "${name}"?`)) return;
    try {
      await deleteProject(id);
      setSuccessMsg("Project deleted.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      setErr(e.message || "Failed to delete project.");
    }
  };


  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const selectedPreset =
        PROJECT_PRESETS[settingsPreset] || PROJECT_PRESETS.architecture;
      const newConfig = {
        preset: settingsPreset,
        enabled: settingsEnabled,
        allowEmployeeEdit: settingsAllowEmployeeEdit,
        leadLabel: settingsLeadLabel || selectedPreset.leadLabel,
        subLeadLabel: settingsSubLeadLabel || selectedPreset.subLeadLabel,
        workLabel: settingsWorkLabel || selectedPreset.workLabel,
        stageLabel: settingsStageLabel || selectedPreset.stageLabel,
        typeLabel: settingsTypeLabel || selectedPreset.typeLabel,
        stages: selectedPreset.defaultStages,
        workCategories: selectedPreset.defaultWorkCategories,
        types: selectedPreset.defaultTypes,
      };

      if (updateProjectConfig) {
        await updateProjectConfig(newConfig);
      }
      setIsSettingsModalOpen(false);
      setSuccessMsg("Settings saved.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      alert(e.message || "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePresetSelect = (presetKey) => {
    setSettingsPreset(presetKey);
    const p = PROJECT_PRESETS[presetKey];
    if (p) {
      setSettingsLeadLabel(p.leadLabel);
      setSettingsSubLeadLabel(p.subLeadLabel);
      setSettingsWorkLabel(p.workLabel);
      setSettingsStageLabel(p.stageLabel);
      setSettingsTypeLabel(p.typeLabel);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 fade-in pb-12">
      {/* NOTIFICATIONS */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg("")}
            className="cursor-pointer text-emerald-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {err && (
        <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{err}</span>
          </div>
          <button
            onClick={() => setErr("")}
            className="cursor-pointer text-rose-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Projects
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium">
              {PROJECT_PRESETS[config.preset]?.name || "Custom"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track initiatives, {config.stageLabel.toLowerCase()}s, team
            ownership, and upcoming deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* SETTINGS */}
          <button
            onClick={() => {
              setSettingsPreset(config.preset || "architecture");
              setSettingsLeadLabel(config.leadLabel);
              setSettingsSubLeadLabel(config.subLeadLabel);
              setSettingsWorkLabel(config.workLabel);
              setSettingsStageLabel(config.stageLabel);
              setSettingsTypeLabel(config.typeLabel);
              setSettingsEnabled(config.enabled !== false);
              setSettingsAllowEmployeeEdit(config.allowEmployeeEdit !== false);
              setIsSettingsModalOpen(true);
            }}
            className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs transition-all cursor-pointer"
            title="Configure labels and presets"
          >
            <Settings2 size={13} className="text-slate-500" />
            <span>Settings</span>
          </button>

          {/* NEW PROJECT BUTTON */}
          <button
            onClick={openCreateModal}
            className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() =>
            setStatusFilter(statusFilter === "active" ? "all" : "active")
          }
          className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-slate-300 ${
            statusFilter === "active"
              ? "border-primary ring-2 ring-primary/10"
              : "border-slate-200/80"
          }`}
        >
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Active
          </p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {isProjectsLoading ? "—" : kpiStats.active}
          </p>
        </div>

        <div
          onClick={() =>
            setStatusFilter(statusFilter === "urgent" ? "all" : "urgent")
          }
          className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-amber-300 ${
            statusFilter === "urgent"
              ? "border-amber-400 ring-2 ring-amber-400/15"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">
              Due &lt; 7 Days
            </p>
            {kpiStats.urgent > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <p className="text-2xl font-bold font-mono text-amber-900 mt-1">
            {isProjectsLoading ? "—" : kpiStats.urgent}
          </p>
        </div>

        <div
          onClick={() =>
            setStatusFilter(statusFilter === "delayed" ? "all" : "delayed")
          }
          className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-rose-300 ${
            statusFilter === "delayed"
              ? "border-rose-400 ring-2 ring-rose-400/15"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-rose-700 uppercase tracking-wider">
              Delayed
            </p>
            {kpiStats.delayed > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </div>
          <p className="text-2xl font-bold font-mono text-rose-900 mt-1">
            {isProjectsLoading ? "—" : kpiStats.delayed}
          </p>
        </div>

        <div
          onClick={() =>
            setStatusFilter(statusFilter === "completed" ? "all" : "completed")
          }
          className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-emerald-300 ${
            statusFilter === "completed"
              ? "border-emerald-400 ring-2 ring-emerald-400/15"
              : "border-slate-200/80"
          }`}
        >
          <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">
            Completed
          </p>
          <p className="text-2xl font-bold font-mono text-emerald-900 mt-1">
            {isProjectsLoading ? "—" : kpiStats.completed}
          </p>
        </div>
      </div>

      {/* TOOLBAR: SEARCH, STATUS FILTER & CARDS/TABLE SWITCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* SEARCH */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder={`Search by title, ${config.leadLabel.toLowerCase()}, stage...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* FILTER CHIPS */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "urgent", label: "Due Soon" },
              { id: "delayed", label: "Delayed" },
              { id: "completed", label: "Completed" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "bg-slate-100/70 hover:bg-slate-200/60 text-slate-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

          {/* CARDS VS TABLE SWITCH */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
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
      </div>

      {/* MAIN VIEW */}
      {isProjectsLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-2xs">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 flex items-center justify-between animate-pulse"
            >
              <div className="w-36 h-4 bg-slate-200 rounded" />
              <div className="w-24 h-4 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-2xs space-y-3">
          <FolderKanban size={40} className="mx-auto text-slate-300 stroke-1" />
          <p className="font-semibold text-slate-800 text-sm">
            No projects found
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "all"
              ? "No initiatives match your active filter."
              : "No projects in the workspace yet. Sync your Excel spreadsheet to populate the database."}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-medium cursor-pointer"
            >
              Create New
            </button>
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* ================= TABLE VIEW MATCHING USER SPECIFICATION ================= */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[220px]">
                    Project List
                  </th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap min-w-[180px]">
                    {config.leadLabel}s & Team
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap">
                    {config.stageLabel}
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Start Date</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Deadline</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">
                    Project Status
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap">
                    Last Updated
                  </th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => {
                  const stats = projectStats.get(p.id) || {
                    status: p.status || "Active",
                    urgency: getDeadlineUrgency(
                      p.end_date || p.deadline,
                      p.status,
                    ),
                  };
                  const urgency = stats.urgency;
                  const leadName = getLeadName(p);
                  const subs = getSubArchitectsList(p);
                  const hasD = Boolean(
                    p.design_stage ||
                    p.lead_architect_role === "Design" ||
                    p.lead_architect_role === "Both" ||
                    Number(p.design_progress) > 0,
                  );
                  const hasS = Boolean(
                    p.site_stage ||
                    p.lead_architect_role === "Site" ||
                    p.lead_architect_role === "Both" ||
                    Number(p.site_progress) > 0,
                  );
                  const progressPct =
                    hasD || hasS
                      ? calculateOverallProgress({
                          designProgress: p.design_progress,
                          siteProgress: p.site_progress,
                          hasDesign: hasD,
                          hasSite: hasS,
                          manualProgress: p.progress,
                        })
                      : p.progress !== undefined && p.progress !== null
                        ? Number(p.progress)
                        : getStageDefaultProgress(p.current_stage, p.status);
                  const nextStage = getNextStage(p.current_stage);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* 1. PROJECT LIST (NAME + WORK & TYPE PILL BELOW IT) */}
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
                                <span
                                  className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]"
                                  title={p.project_work}
                                >
                                  {p.project_work}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  General Work
                                </span>
                              )}
                              {p.project_type && (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold border shadow-2xs shrink-0 ${getProjectTypeBadgeClass(p.project_type)}`}
                                >
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
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                  Lead
                                </span>
                              </span>
                              {/* Assigned Scope UNDER employee */}
                              <span
                                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border shadow-2xs ${getAssignedRoleBadgeClass(p.lead_architect_role || "Design")}`}
                                title={`Lead Scope: ${p.lead_architect_role || "Design"}`}
                              >
                                {getAssignedRoleBadgeText(
                                  p.lead_architect_role || "Design",
                                )}
                              </span>
                              <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/arch:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[10px] font-medium shadow-md whitespace-nowrap z-30 pointer-events-none">
                                <span>
                                  Lead {config.leadLabel}: {leadName}
                                </span>
                                <span className="text-slate-400 font-bold">
                                  • {p.lead_architect_role || "Design"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-normal">
                              —
                            </span>
                          )}

                          {subs.length > 0 &&
                            subs.map((s, idx) => {
                              const sName = typeof s === "object" ? s.name : s;
                              const sRole =
                                typeof s === "object" ? s.role : "Design";
                              const isExt = Boolean(
                                typeof s === "object" && s.isExternal,
                              );
                              return (
                                <div
                                  key={idx}
                                  className="flex flex-col items-start gap-1 group/sub relative"
                                >
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                                      isExt
                                        ? "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                                    }`}
                                    title={
                                      isExt
                                        ? `External Collaborator: ${sName}`
                                        : `Sub-${config.leadLabel}: ${sName}`
                                    }
                                  >
                                    <span>{getInitials(sName)}</span>
                                    <span
                                      className={`text-[9px] font-bold uppercase tracking-wider ${isExt ? "text-amber-700" : "text-slate-400"}`}
                                    >
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
                                    title={
                                      isExt
                                        ? `External Collaborator: ${sName}`
                                        : `Sub Scope: ${sRole}`
                                    }
                                  >
                                    {isExt
                                      ? "External"
                                      : getAssignedRoleBadgeText(sRole)}
                                  </span>
                                  <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/sub:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[10px] font-medium shadow-md whitespace-nowrap z-30 pointer-events-none">
                                    <span>
                                      {isExt
                                        ? "External Collaborator"
                                        : `Sub-${config.leadLabel}`}
                                      : {sName}
                                    </span>
                                    {!isExt && (
                                      <span className="text-slate-400 font-bold">
                                        • {sRole}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </td>

                      {/* 3. CURRENT STAGE (SUPPORTS DUAL-TRACK & MULTI-STAGE TAGS) */}
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => setQuickStageProject(p)}
                          className="inline-flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer group/stage text-left"
                          title="Click to edit or choose stage"
                        >
                          <ProjectTrackBadges project={p} compact={true} />
                          <Pencil
                            size={11}
                            className="text-slate-400 opacity-60 shrink-0 ml-0.5 group-hover/stage:opacity-100 group-hover/stage:text-primary transition-colors"
                          />
                        </button>
                      </td>

                      {/* 4. START DATE (NEPALI BS) */}
                      <td className="py-3.5 px-3 text-slate-700 text-xs whitespace-nowrap">
                        <span className="font-medium" title={p.start_date}>
                          {formatProjectDateNepali(p.start_date)}
                        </span>
                      </td>

                      {/* 5. DEADLINE (NEPALI BS + URGENCY) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <ProjectDeadlineBadge
                          deadline={p.end_date || p.deadline}
                          status={p.status}
                          onClick={() => setQuickDeadlineProject(p)}
                        />
                      </td>

                      {/* 6. PROJECT STATUS & PROGRESS */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setQuickStatusProject(p);
                            setStatusInput(p.status || "Active");
                            setProgressInput(progressPct);
                          }}
                          className="flex flex-col gap-1 items-start cursor-pointer group/stat text-left p-1 rounded-lg hover:bg-slate-50 transition-colors"
                          title="Click to update status and progress"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  stats.status === "Active" ||
                                  stats.status === "Ongoing"
                                    ? "bg-emerald-500"
                                    : stats.status === "Completed"
                                      ? "bg-purple-500"
                                      : stats.status === "On Hold"
                                        ? "bg-amber-500"
                                        : "bg-rose-500"
                                }`}
                              />
                              {stats.status}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {progressPct}%
                            </span>
                          </div>
                          {/* Clean, calm progress track */}
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
                              style={{
                                width: `${Math.min(100, Math.max(0, progressPct))}%`,
                              }}
                            />
                          </div>
                          {(p.design_stage ||
                            p.site_stage ||
                            Number(p.design_progress) > 0 ||
                            Number(p.site_progress) > 0) && (
                            <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500 pt-0.5">
                              {(p.design_stage ||
                                Number(p.design_progress) > 0) && (
                                <span className="text-indigo-700 bg-indigo-50 px-1 rounded">
                                  🎨 {p.design_progress ?? 0}%
                                </span>
                              )}
                              {p.site_stage && (
                                <span className="text-amber-800 bg-amber-50 px-1 rounded">
                                  🏗️ {p.site_progress ?? 0}%
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      </td>

                      {/* 7. LAST UPDATED */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 text-[11px]">
                        <span
                          className="font-medium text-slate-600"
                          title={p.updated_at || p.created_at || "Recently"}
                        >
                          {formatRelativeTime(p.updated_at || p.created_at)}
                        </span>
                      </td>

                      {/* 10. ACTIONS */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`/projects/${p.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                            title="View Project Overview & Work Logs"
                          >
                            <Eye size={14} />
                          </Link>
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                            title="Edit Project Details"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(p.id, p.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Delete Project"
                          >
                            <Trash2 size={13} />
                          </button>
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
              contributors: [],
              entryCount: 0,
              status: p.status || "Active",
              urgency: getDeadlineUrgency(p.end_date || p.deadline, p.status),
            };
            const urgency = stats.urgency;
            const leadName = getLeadName(p);
            const hasD = Boolean(
              p.design_stage ||
              p.lead_architect_role === "Design" ||
              p.lead_architect_role === "Both" ||
              Number(p.design_progress) > 0,
            );
            const hasS = Boolean(
              p.site_stage ||
              p.lead_architect_role === "Site" ||
              p.lead_architect_role === "Both" ||
              Number(p.site_progress) > 0,
            );
            const progressPct =
              hasD || hasS
                ? calculateOverallProgress({
                    designProgress: p.design_progress,
                    siteProgress: p.site_progress,
                    hasDesign: hasD,
                    hasSite: hasS,
                    manualProgress: p.progress,
                  })
                : p.progress !== undefined && p.progress !== null
                  ? Number(p.progress)
                  : getStageDefaultProgress(p.current_stage, p.status);
            const nextStage = getNextStage(p.current_stage);

            return (
              <div
                key={p.id}
                className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* HEADER */}
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
                            <span
                              className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${getProjectTypeBadgeClass(p.project_type)}`}
                            >
                              {p.project_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickStatusProject(p);
                          setStatusInput(p.status || "Active");
                          setProgressInput(progressPct);
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-transform hover:scale-105 ${
                          stats.status === "Active" ||
                          stats.status === "Ongoing"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : stats.status === "Completed"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : stats.status === "On Hold"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                        title="Click to update status and progress"
                      >
                        {stats.status}
                      </button>
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1 rounded text-slate-400 hover:text-slate-800"
                          title="Edit Project"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(p.id, p.name)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                          title="Delete Project"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* STAGE & DEADLINE */}
                  <div className="pt-1 flex flex-col gap-2">
                    <div className="flex items-start justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-medium shrink-0 pt-0.5">
                        {config.stageLabel}:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQuickStageProject(p)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-left transition-colors cursor-pointer group/stg"
                          title="Click to update stage"
                        >
                          <ProjectTrackBadges project={p} compact={true} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Deadline:
                      </span>
                      <ProjectDeadlineBadge
                        deadline={p.end_date || p.deadline}
                        status={p.status}
                        onClick={() => setQuickDeadlineProject(p)}
                      />
                    </div>

                    {/* Progress Bar */}
                    <div
                      onClick={() => {
                        setQuickStatusProject(p);
                        setStatusInput(p.status || "Active");
                        setProgressInput(progressPct);
                      }}
                      className="space-y-1.5 pt-1 cursor-pointer group/prog hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                      title="Click to update status and progress"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium group-hover/prog:text-primary transition-colors">
                          Overall Progress
                        </span>
                        <span className="font-bold text-slate-800">
                          {progressPct}%
                        </span>
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
                          style={{
                            width: `${Math.min(100, Math.max(0, progressPct))}%`,
                          }}
                        />
                      </div>
                      {(p.design_stage ||
                        p.site_stage ||
                        Number(p.design_progress) > 0 ||
                        Number(p.site_progress) > 0) && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100/80 text-[10px]">
                          <div className="bg-indigo-50/70 p-1.5 rounded-md border border-indigo-100">
                            <div className="flex justify-between text-indigo-900 font-semibold mb-0.5">
                              <span>🎨 Design</span>
                              <span>{p.design_progress ?? 0}%</span>
                            </div>
                            <div className="w-full h-1 bg-indigo-200/60 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${p.design_progress ?? 0}%` }}
                              />
                            </div>
                          </div>
                          <div className="bg-amber-50/70 p-1.5 rounded-md border border-amber-100">
                            <div className="flex justify-between text-amber-900 font-semibold mb-0.5">
                              <span>🏗️ Site</span>
                              <span>{p.site_progress ?? 0}%</span>
                            </div>
                            <div className="w-full h-1 bg-amber-200/60 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-600 rounded-full"
                                style={{ width: `${p.site_progress ?? 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-xs text-slate-500">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
                        {config.leadLabel}:
                      </span>
                      {leadName ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs truncate max-w-[200px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="truncate">{leadName}</span>
                          <span
                            className={`px-1 py-0.1 rounded text-[9px] font-bold shrink-0 ${getAssignedRoleBadgeClass(p.lead_architect_role || "Design")}`}
                          >
                            {p.lead_architect_role || "Design"}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-normal">
                          Unassigned
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      {stats.entryCount} logs
                    </span>
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
                            const sRole =
                              typeof s === "object" ? s.role : "Design";
                            const isExt = Boolean(
                              typeof s === "object" && s.isExternal,
                            );
                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border truncate max-w-[150px] ${
                                  isExt
                                    ? "bg-amber-50 text-amber-900 border-amber-200"
                                    : "bg-slate-50 text-slate-700 border-slate-200/80"
                                }`}
                                title={
                                  isExt
                                    ? `External Collaborator: ${sName}`
                                    : `${sName} (${sRole})`
                                }
                              >
                                <span className="truncate">{sName}</span>
                                <span
                                  className={`px-1 py-0.1 rounded text-[8px] font-bold ${
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
                </div>
              </div>
            );
          })}
        </div>
      )}

            {/* Shared Project Form Modal */}
      <ProjectFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProject(null);
        }}
        project={editingProject}
        onSave={handleSaveProject}
        saving={saving}
        employees={employees}
        projectConfig={config}
        workLogContributors={
          editingProject
            ? projectStats.get(editingProject.id)?.contributors
            : []
        }
      />

      {/* Shared Quick Stage Modal */}
      <QuickStageModal
        isOpen={Boolean(quickStageProject)}
        onClose={() => setQuickStageProject(null)}
        project={quickStageProject}
        onSave={handleSaveStage}
        saving={savingQuick}
      />

      {/* Shared Quick Deadline Modal */}
      <QuickDeadlineModal
        isOpen={Boolean(quickDeadlineProject)}
        onClose={() => setQuickDeadlineProject(null)}
        project={quickDeadlineProject}
        onSave={handleSaveDeadline}
        saving={savingQuick}
      />

{/* ================= MODAL: QUICK STATUS & PROGRESS UPDATE ================= */}
      {quickStatusProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4 fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Update Status & Progress
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-[240px]">
                  Project:{" "}
                  <span className="font-semibold text-slate-800">
                    {quickStatusProject.name}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setQuickStatusProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* STATUS OPTIONS */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Project Status:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((st) => {
                    const isSelected =
                      (statusInput || "").toLowerCase() === st.toLowerCase();
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setStatusInput(st);
                          if (st === "Completed") setProgressInput(100);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-left flex items-center justify-between ${
                          isSelected
                            ? st === "Active"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/20"
                              : st === "Completed"
                                ? "bg-purple-50 text-purple-800 border-purple-300 ring-2 ring-purple-400/20"
                                : st === "On Hold"
                                  ? "bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-400/20"
                                  : "bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-400/20"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        <span>{st}</span>
                        {isSelected && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PROGRESS BAR & SLIDER */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Completion Progress:
                  </label>
                  <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                    {progressInput}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressInput}
                  onChange={(e) => setProgressInput(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex items-center justify-between gap-1">
                  {[0, 25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setProgressInput(pct)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                        progressInput === pct
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickStatusProject(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveQuickStatus(
                      quickStatusProject,
                      statusInput,
                      progressInput,
                    )
                  }
                  className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-xl shadow-xs cursor-pointer hover:bg-primary/95"
                >
                  Save Status & Progress
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SETTINGS & PRESETS ================= */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-5 my-auto fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Settings2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Project Workspace Settings
                  </h3>
                  <p className="text-xs text-slate-500">
                    Adapt field terminology for your organization's domain.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {/* ORGANIZATION PERMISSIONS & CONTROLS */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        Allow Employee Editing
                      </span>
                      {settingsAllowEmployeeEdit ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Enabled
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                          Read-Only
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Allow employees to update{" "}
                      <strong>{settingsStageLabel || "Current Stage"}</strong>{" "}
                      and <strong>Deadline</strong> directly from their
                      dashboard.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settingsAllowEmployeeEdit}
                    onClick={() =>
                      setSettingsAllowEmployeeEdit((prev) => !prev)
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settingsAllowEmployeeEdit ? "bg-primary" : "bg-slate-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settingsAllowEmployeeEdit
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        Enable Projects Module
                      </span>
                      {settingsEnabled ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Activate project and milestone tracking for this
                      organization.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settingsEnabled}
                    onClick={() => setSettingsEnabled((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settingsEnabled ? "bg-primary" : "bg-slate-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settingsEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 block">
                  Select Industry Template
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {Object.values(PROJECT_PRESETS).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handlePresetSelect(p.id)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        settingsPreset === p.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">
                          {p.name}
                        </span>
                        {settingsPreset === p.id && (
                          <Check size={12} className="text-primary font-bold" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-sm font-semibold text-slate-800 block">
                  Customize Field Labels
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-slate-600 block">
                      Architect / Lead Label
                    </span>
                    <input
                      type="text"
                      value={settingsLeadLabel}
                      onChange={(e) => setSettingsLeadLabel(e.target.value)}
                      className="w-full h-9 px-3 text-xs sm:text-sm font-normal text-slate-700 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-slate-600 block">
                      Sub Architect / Team Label
                    </span>
                    <input
                      type="text"
                      value={settingsSubLeadLabel}
                      onChange={(e) => setSettingsSubLeadLabel(e.target.value)}
                      className="w-full h-9 px-3 text-xs sm:text-sm font-normal text-slate-700 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-slate-600 block">
                      Project Work / Category Label
                    </span>
                    <input
                      type="text"
                      value={settingsWorkLabel}
                      onChange={(e) => setSettingsWorkLabel(e.target.value)}
                      className="w-full h-9 px-3 text-xs sm:text-sm font-normal text-slate-700 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-slate-600 block">
                      Current Stage Label
                    </span>
                    <input
                      type="text"
                      value={settingsStageLabel}
                      onChange={(e) => setSettingsStageLabel(e.target.value)}
                      className="w-full h-9 px-3 text-xs sm:text-sm font-normal text-slate-700 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600 block">
                      Project Type Label
                    </span>
                    <input
                      type="text"
                      value={settingsTypeLabel}
                      onChange={(e) => setSettingsTypeLabel(e.target.value)}
                      className="w-full h-9 px-3 text-xs sm:text-sm font-normal text-slate-700 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 text-xs font-semibold bg-primary text-white rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

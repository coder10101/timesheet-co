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
} from "lucide-react";
import {
  useProjects,
  useOrgWorkLogs,
  useRoster,
} from "../../hooks/useOrgData";
import { useOfficeHours } from "../../constants/officeHours";
import {
  PROJECT_PRESETS,
  getProjectConfig,
  getDeadlineUrgency,
  STAGE_PIPELINES,
  getNextStage,
  getStageDefaultProgress,
  STATUS_OPTIONS,
  formatProjectDateNepali,
  formatRelativeTime,
  normalizeDateToISO,
  getInitials,
  getProjectTypeBadgeClass,
} from "../../constants/projectPresets";
import { NepaliDatePicker } from "../../components/NepaliDatePicker";
import { todayISO } from "../../utils/workTime";

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
    isDbMigrationRequired,
    refetchDbSchema,
    createProject,
    updateProject,
    updateProjectStageAndDeadline,
    deleteProject,
    syncExcelProjectsWithDb,
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
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [quickStageProject, setQuickStageProject] = useState(null);
  const [quickDeadlineProject, setQuickDeadlineProject] = useState(null);
  const [quickStatusProject, setQuickStatusProject] = useState(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formStatus, setFormStatus] = useState("Active");
  const [formProgress, setFormProgress] = useState(25);
  const [formLead, setFormLead] = useState("");
  const [formLeadId, setFormLeadId] = useState("");
  const [selectedSubIds, setSelectedSubIds] = useState([]);
  const [customSubText, setCustomSubText] = useState("");
  const [formProjectWork, setFormProjectWork] = useState("");
  const [formCurrentStage, setFormCurrentStage] = useState("");
  const [formProjectType, setFormProjectType] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [customStageMode, setCustomStageMode] = useState(false);
  const [customTypeMode, setCustomTypeMode] = useState(false);
  const [customWorkMode, setCustomWorkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Settings Form State
  const [settingsPreset, setSettingsPreset] = useState(config.preset || "architecture");
  const [settingsLeadLabel, setSettingsLeadLabel] = useState(config.leadLabel);
  const [settingsSubLeadLabel, setSettingsSubLeadLabel] = useState(config.subLeadLabel);
  const [settingsWorkLabel, setSettingsWorkLabel] = useState(config.workLabel);
  const [settingsStageLabel, setSettingsStageLabel] = useState(config.stageLabel);
  const [settingsTypeLabel, setSettingsTypeLabel] = useState(config.typeLabel);
  const [settingsEnabled, setSettingsEnabled] = useState(config.enabled !== false);
  const [settingsAllowEmployeeEdit, setSettingsAllowEmployeeEdit] = useState(
    config.allowEmployeeEdit !== false,
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // Quick Edit State
  const [stageInput, setStageInput] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
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

  const getLeadName = (p) => {
    if (p.lead_architect_id) {
      const u = empMap.get(p.lead_architect_id);
      if (u?.name) return u.name;
    }
    return p.lead_architect || "";
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
        const subMatch = (Array.isArray(p.sub_architect_ids) ? p.sub_architect_ids : [])
          .map((id) => empMap.get(id)?.name || "")
          .join(" ")
          .toLowerCase()
          .includes(q);
        if (!nameMatch && !workMatch && !stageMatch && !leadMatch && !subMatch) {
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

  // Toggle Sub-Architect Employee selection
  const toggleSubEmp = (empId) => {
    setSelectedSubIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    );
  };

  // Helper to compute all Sub-Architects for a project (Explicit + Custom + Work Log Contributors)
  const getSubArchitectsList = (p) => {
    const stats = projectStats.get(p.id);
    const names = new Set();

    // 1. Employee roster selections by ID (User Info)
    if (Array.isArray(p.sub_architect_ids)) {
      p.sub_architect_ids.forEach((id) => {
        const emp = empMap.get(id);
        if (emp?.name) names.add(emp.name);
      });
    }

    // 2. Custom sub-architect text if present
    if (p.sub_architects) {
      p.sub_architects
        .split(/[,;/+]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => names.add(s));
    }

    // 3. Anyone who contributed in work logs for this project (excluding lead architect)
    const leadLower = getLeadName(p).trim().toLowerCase();
    const leadId = p.lead_architect_id;
    if (stats?.contributors) {
      stats.contributors.forEach((c) => {
        const cLower = (c.name || "").trim().toLowerCase();
        if (c.id !== leadId && cLower !== leadLower) {
          names.add(c.name);
        }
      });
    }

    return Array.from(names);
  };

  // Advance Project to Next Stage
  const handleAdvanceStage = async (p, e) => {
    e?.stopPropagation();
    const next = getNextStage(p.current_stage);
    if (!next) return;
    const isFinishing = next === "Completed" || next.toLowerCase() === "handover";
    const nextStatus = isFinishing ? "Completed" : (p.status || "Active");
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
    setFormName("");
    setFormColor(PRESET_COLORS[0]);
    setFormStatus("Active");
    setFormProgress(25);
    setFormLead("");
    setFormLeadId("");
    setSelectedSubIds([]);
    setCustomSubText("");
    setFormProjectWork(config.workCategories[0] || "Residence");
    setFormCurrentStage(config.stages[0] || "Concept");
    setFormProjectType(config.types[0] || "Site");
    setFormStartDate(todayISO());
    setFormDeadline("");
    setCustomStageMode(false);
    setCustomTypeMode(false);
    setCustomWorkMode(false);
    setErr("");
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (p) => {
    const stats = projectStats.get(p.id);
    setEditingProject(p);
    setFormName(p.name || "");
    setFormColor(p.color || PRESET_COLORS[0]);
    const currentSt = p.status || stats?.status || "Active";
    setFormStatus(currentSt);
    setFormProgress(
      p.progress !== undefined && p.progress !== null
        ? p.progress
        : getStageDefaultProgress(p.current_stage, currentSt)
    );
    setFormLead(getLeadName(p));
    setFormLeadId(p.lead_architect_id || "");

    // Populate sub-architect IDs from array or parse from string
    const subIds = Array.isArray(p.sub_architect_ids) ? [...p.sub_architect_ids] : [];
    const unmappedSubs = [];

    if (p.sub_architects) {
      const parts = p.sub_architects.split(",").map((s) => s.trim()).filter(Boolean);
      parts.forEach((subName) => {
        const matchedEmp = employees?.find(
          (e) => e.name?.toLowerCase() === subName.toLowerCase(),
        );
        if (matchedEmp) {
          if (!subIds.includes(matchedEmp.id)) {
            subIds.push(matchedEmp.id);
          }
        } else {
          unmappedSubs.push(subName);
        }
      });
    }

    setSelectedSubIds(subIds);
    setCustomSubText(unmappedSubs.join(", "));
    setFormProjectWork(p.project_work || "");
    setFormCurrentStage(p.current_stage || "");
    setFormProjectType(p.project_type || "");
    setFormStartDate(p.start_date ? normalizeDateToISO(p.start_date) : "");
    setFormDeadline(p.end_date || p.deadline ? normalizeDateToISO(p.end_date || p.deadline) : "");


    setCustomStageMode(
      Boolean(
        p.current_stage &&
        !config.stages.includes(p.current_stage) &&
        !STAGE_PIPELINES.standard.includes(p.current_stage)
      )
    );
    setCustomTypeMode(Boolean(p.project_type && !config.types.includes(p.project_type)));
    setCustomWorkMode(Boolean(p.project_work && !config.workCategories.includes(p.project_work)));

    setErr("");
    setIsEditModalOpen(true);
  };

  // Save Project
  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return setErr("Please enter a project title.");

    setSaving(true);
    setErr("");

    const payload = {
      name: formName.trim(),
      color: formColor,
      status: formStatus,
      progress: Number(formProgress) || 0,
      archived: formStatus === "Completed",
      lead_architect_id: formLeadId || null,
      sub_architect_ids: selectedSubIds,
      project_work: formProjectWork.trim(),
      current_stage: formCurrentStage.trim(),
      project_type: formProjectType.trim(),
      start_date: formStartDate ? formStartDate.trim() : "",
      end_date: formDeadline ? formDeadline.trim() : "",
    };

    try {
      if (editingProject) {
        await updateProject(editingProject.id, {
          ...payload,
          actor: { id: me?.id, name: me?.name, role: me?.role },
        });
      } else {
        await createProject({
          ...payload,
          orgId: me.org_id,
          actor: { id: me?.id, name: me?.name, role: me?.role },
        });
      }
      setIsEditModalOpen(false);
      setSuccessMsg(
        editingProject ? "Project updated successfully." : "Project created successfully.",
      );
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      setErr(e.message || "Failed to save project.");
    } finally {
      setSaving(false);
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

  // Quick Stage Update
  const handleSaveQuickStage = async () => {
    if (!quickStageProject || !stageInput.trim()) return;
    setSavingQuick(true);
    try {
      await updateProjectStageAndDeadline({
        id: quickStageProject.id,
        currentStage: stageInput.trim(),
        actor: { id: me?.id, name: me?.name, role: me?.role },
      });
      setQuickStageProject(null);
      setSuccessMsg("Stage updated.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      alert(e.message || "Failed to update stage.");
    } finally {
      setSavingQuick(false);
    }
  };

  // Quick Deadline Update
  const handleSaveQuickDeadline = async () => {
    if (!quickDeadlineProject) return;
    setSavingQuick(true);
    try {
      await updateProjectStageAndDeadline({
        id: quickDeadlineProject.id,
        deadline: deadlineInput.trim(),
        actor: { id: me?.id, name: me?.name, role: me?.role },
      });
      setQuickDeadlineProject(null);
      setSuccessMsg("Deadline updated.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      alert(e.message || "Failed to update deadline.");
    } finally {
      setSavingQuick(false);
    }
  };

  // Sync Excel to DB
  const handleSyncExcelToDb = async () => {
    setSyncing(true);
    setErr("");
    try {
      const res = await syncExcelProjectsWithDb({
        projects: EXCEL_TEMPLATE_PROJECTS,
        orgId: me.org_id,
      });
      setIsSyncModalOpen(false);
      setSuccessMsg(
        `Database synced successfully: updated ${res.updatedCount} projects and added ${res.createdCount} new projects directly into PostgreSQL.`,
      );
      setTimeout(() => setSuccessMsg(""), 5000);
      if (refetchDbSchema) refetchDbSchema();
    } catch (e) {
      setErr(e.message || "Failed to sync Excel data with database.");
    } finally {
      setSyncing(false);
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

  const isProjectsLoading = projects === null;

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

      {err && (
        <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{err}</span>
          </div>
          <button onClick={() => setErr("")} className="cursor-pointer text-rose-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* DATABASE MIGRATION REQUIRED BANNER */}
      {isDbMigrationRequired && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300/90 text-amber-950 shadow-2xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle size={18} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                    Database Schema Migration Required
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                    Action Needed
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 leading-relaxed">
                  Your Supabase <code>projects</code> table is currently missing native columns for <strong>Architects, Sub-Architects, Current Stage, and Deadlines</strong> (only <code>name</code>, <code>color</code>, and <code>archived</code> exist). Run the 1-click SQL migration in Supabase SQL Editor so all fields are stored in the database rows.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 active:scale-95 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-center"
            >
              <Copy size={13} />
              <span>Copy SQL Migration</span>
            </button>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Projects</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium">
              {PROJECT_PRESETS[config.preset]?.name || "Custom"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track initiatives, {config.stageLabel.toLowerCase()}s, team ownership, and upcoming deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* SYNC EXCEL BUTTON */}
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs transition-all cursor-pointer"
            title="Update database with Excel records"
          >
            <RefreshCw size={13} className="text-emerald-600" />
            <span>Sync Excel to DB</span>
          </button>

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
          onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
          className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-slate-300 ${
            statusFilter === "active" ? "border-primary ring-2 ring-primary/10" : "border-slate-200/80"
          }`}
        >
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {isProjectsLoading ? "—" : kpiStats.active}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "urgent" ? "all" : "urgent")}
          className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-amber-300 ${
            statusFilter === "urgent" ? "border-amber-400 ring-2 ring-amber-400/15" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Due &lt; 7 Days</p>
            {kpiStats.urgent > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          </div>
          <p className="text-2xl font-bold font-mono text-amber-900 mt-1">
            {isProjectsLoading ? "—" : kpiStats.urgent}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "delayed" ? "all" : "delayed")}
          className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-rose-300 ${
            statusFilter === "delayed" ? "border-rose-400 ring-2 ring-rose-400/15" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-rose-700 uppercase tracking-wider">Delayed</p>
            {kpiStats.delayed > 0 && <span className="w-2 h-2 rounded-full bg-rose-500" />}
          </div>
          <p className="text-2xl font-bold font-mono text-rose-900 mt-1">
            {isProjectsLoading ? "—" : kpiStats.delayed}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")}
          className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-emerald-300 ${
            statusFilter === "completed" ? "border-emerald-400 ring-2 ring-emerald-400/15" : "border-slate-200/80"
          }`}
        >
          <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-bold font-mono text-emerald-900 mt-1">
            {isProjectsLoading ? "—" : kpiStats.completed}
          </p>
        </div>
      </div>

      {/* TOOLBAR: SEARCH, STATUS FILTER & CARDS/TABLE SWITCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* SEARCH */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
            <div key={i} className="p-4 flex items-center justify-between animate-pulse">
              <div className="w-36 h-4 bg-slate-200 rounded" />
              <div className="w-24 h-4 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-2xs space-y-3">
          <FolderKanban size={40} className="mx-auto text-slate-300 stroke-1" />
          <p className="font-semibold text-slate-800 text-sm">No projects found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "all"
              ? "No initiatives match your active filter."
              : "No projects in the workspace yet. Sync your Excel spreadsheet to populate the database."}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium shadow-xs cursor-pointer"
            >
              Sync Excel Data
            </button>
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
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[220px]">Project List</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap min-w-[180px]">{config.leadLabel}s & Team</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">{config.stageLabel}</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Start Date</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Deadline</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Project Status</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Last Updated</th>
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
                  const progressPct =
                    p.progress !== undefined && p.progress !== null
                      ? p.progress
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

                      {/* 2. ARCHITECTS (INITIALS ONLY, FULL NAME ON HOVER, NORMAL COLORS) */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {leadName ? (
                            <div className="relative inline-flex items-center group/arch">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300/80 text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-200/80"
                                title={`Lead ${config.leadLabel}: ${leadName}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                <span>{getInitials(leadName)}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lead</span>
                              </span>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/arch:flex items-center px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-medium shadow-md whitespace-nowrap z-30 pointer-events-none">
                                Lead {config.leadLabel}: {leadName}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-normal">—</span>
                          )}

                          {subs.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {subs.map((s, idx) => (
                                <div key={idx} className="relative inline-flex items-center group/sub">
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 text-[11px] font-medium cursor-pointer transition-colors hover:bg-slate-100 hover:text-slate-900"
                                    title={`Sub-${config.leadLabel}: ${s}`}
                                  >
                                    {getInitials(s)}
                                  </span>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/sub:flex items-center px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-medium shadow-md whitespace-nowrap z-30 pointer-events-none">
                                    Sub-{config.leadLabel}: {s}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. CURRENT STAGE */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setQuickStageProject(p);
                            setStageInput(p.current_stage || "");
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-white border border-slate-200 text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-2xs hover:border-slate-400"
                          title="Click to edit or choose stage"
                        >
                          <span>{p.current_stage || "Set Stage"}</span>
                          <Pencil size={10} className="text-slate-400 opacity-60 shrink-0" />
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
                        <button
                          onClick={() => {
                            setQuickDeadlineProject(p);
                            setDeadlineInput(p.end_date || p.deadline || "");
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                            urgency.type === "delayed"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : urgency.type === "urgent"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                          title="Click to edit deadline with Nepali Calendar"
                        >
                          <Calendar size={11} className="shrink-0 text-slate-400" />
                          <span>
                            {p.end_date || p.deadline
                              ? `${formatProjectDateNepali(p.end_date || p.deadline)}${urgency.type === "delayed" || urgency.type === "urgent" ? ` (${urgency.label})` : ""}`
                              : "Set Date"}
                          </span>
                        </button>
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
            const progressPct =
              p.progress !== undefined && p.progress !== null
                ? p.progress
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
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${getProjectTypeBadgeClass(p.project_type)}`}>
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
                          stats.status === "Active" || stats.status === "Ongoing"
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
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-medium">{config.stageLabel}:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setQuickStageProject(p);
                            setStageInput(p.current_stage || "");
                          }}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200/70 text-slate-800 font-semibold text-xs truncate max-w-[130px]"
                        >
                          {p.current_stage || "Set Stage"}
                        </button>
                        {nextStage && p.status !== "Completed" && (
                          <button
                            onClick={(e) => handleAdvanceStage(p, e)}
                            className="px-1.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[10px] border border-slate-200"
                            title={`Advance to ${nextStage}`}
                          >
                            ➔ {nextStage}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-medium">Deadline:</span>
                      <button
                        onClick={() => {
                          setQuickDeadlineProject(p);
                          setDeadlineInput(p.end_date || p.deadline || "");
                        }}
                        className={`px-2.5 py-1 rounded-md border text-xs font-medium ${urgency.badgeClass}`}
                      >
                        {p.end_date || p.deadline
                          ? formatProjectDateNepali(p.end_date || p.deadline)
                          : "Set Date"}
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div
                      onClick={() => {
                        setQuickStatusProject(p);
                        setStatusInput(p.status || "Active");
                        setProgressInput(progressPct);
                      }}
                      className="space-y-1 pt-1 cursor-pointer group/prog hover:bg-slate-50 p-1 rounded-lg transition-colors"
                      title="Click to update status and progress"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium group-hover/prog:text-primary transition-colors">Progress</span>
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs truncate max-w-[160px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="truncate">{leadName}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-normal">Unassigned</span>
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
                          {subs.slice(0, 3).map((s, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-[10px] text-slate-700 font-medium border border-slate-200/80 truncate max-w-[120px]"
                              title={s}
                            >
                              {s}
                            </span>
                          ))}
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

      {/* ================= MODAL: EDIT / CREATE PROJECT (REDESIGNED FOR READABILITY) ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-hidden text-left fade-in">
            {/* STICKY HEADER */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                  style={{ backgroundColor: formColor }}
                >
                  <FolderKanban size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {editingProject ? "Edit Project Details" : "Create New Project"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure project details, assign architects, and track milestones
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* SCROLLABLE FORM BODY */}
            <form onSubmit={handleSaveProject} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* CARD 1: PROJECT SCOPE & NAME */}
              <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <FolderKanban size={14} className="text-primary" />
                  <span>1. Project Scope & Name</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Project Title (Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tagal Residence, Attariya Timmure..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full h-11 px-3.5 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl outline-none placeholder:text-slate-400 placeholder:font-normal focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        {config.workLabel} (Category)
                      </label>
                      {customWorkMode ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWorkMode(false);
                            setFormProjectWork(config.workCategories[0] || "Residence");
                          }}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Select list
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCustomWorkMode(true)}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          + Custom
                        </button>
                      )}
                    </div>

                    {!customWorkMode ? (
                      <select
                        value={config.workCategories.includes(formProjectWork) ? formProjectWork : "custom"}
                        onChange={(e) => {
                          if (e.target.value === "custom") {
                            setCustomWorkMode(true);
                          } else {
                            setFormProjectWork(e.target.value);
                          }
                        }}
                        className="w-full h-10 px-3 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary cursor-pointer transition-all"
                      >
                        <option value="">-- Select Work Category --</option>
                        {config.workCategories.map((wc) => (
                          <option key={wc} value={wc}>
                            {wc}
                          </option>
                        ))}
                        <option value="custom">+ Custom Category...</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. Residence, Hospitality, Restaurant..."
                        value={formProjectWork}
                        onChange={(e) => setFormProjectWork(e.target.value)}
                        className="w-full h-10 px-3.5 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl outline-none placeholder:text-slate-400 focus:border-primary transition-all"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Color Accent Tag
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormColor(c)}
                          className={`w-7 h-7 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                            formColor === c ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-xs" : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: c }}
                        >
                          {formColor === c && <Check size={13} className="text-white drop-shadow-xs" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: ARCHITECTS & TEAM */}
              <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Users size={14} className="text-primary" />
                  <span>2. {config.leadLabel} & {config.subLeadLabel}s</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    {config.leadLabel} (Lead)
                  </label>
                  <select
                    value={formLeadId || (formLead ? `custom:${formLead}` : "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith("custom:")) {
                        setFormLead(val.replace("custom:", ""));
                        setFormLeadId("");
                      } else {
                        const emp = employees?.find((emp) => emp.id === val);
                        setFormLeadId(val);
                        setFormLead(emp ? emp.name : "");
                      }
                    }}
                    className="w-full h-10 px-3.5 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary cursor-pointer transition-all"
                  >
                    <option value="">-- Select Lead {config.leadLabel} --</option>
                    {employees?.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                    {formLead && !formLeadId && (
                      <option value={`custom:${formLead}`}>{formLead} (Custom Name)</option>
                    )}
                  </select>
                </div>

                {/* SUB-ARCHITECTS: EMPLOYEE ROSTER SELECTION */}
                <div className="space-y-2 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        {config.subLeadLabel}s (Select from Team Roster)
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Click team members to add or remove them as {config.subLeadLabel.toLowerCase()}s:
                      </p>
                    </div>
                    {selectedSubIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSubIds([])}
                        className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white/70 rounded-xl border border-slate-200/80">
                    {employees?.map((emp) => {
                      const isSelected = selectedSubIds.includes(emp.id);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => toggleSubEmp(emp.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-white shadow-xs font-semibold"
                              : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {isSelected ? (
                            <Check size={12} className="text-white" />
                          ) : (
                            <Plus size={12} className="text-slate-400" />
                          )}
                          <span>{emp.name}</span>
                          {isSelected && <X size={12} className="opacity-70 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* AUTO-CONTRIBUTORS FROM WORK LOGS */}
                  {editingProject && projectStats.get(editingProject.id)?.contributors?.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                          <Sparkles size={13} className="text-amber-600" />
                          Work Log Contributors (Auto-Sub-Architects)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const contribs = projectStats.get(editingProject.id)?.contributors || [];
                            const newIds = [...selectedSubIds];
                            contribs.forEach((c) => {
                              if (c.id && !newIds.includes(c.id)) newIds.push(c.id);
                            });
                            setSelectedSubIds(newIds);
                          }}
                          className="text-[11px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                        >
                          + Select All
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {projectStats.get(editingProject.id)?.contributors.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-amber-900 border border-amber-200 shadow-2xs"
                          >
                            <span>{c.name}</span>
                            <span className="text-amber-600 font-mono text-[11px]">({c.logCount} logs)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CUSTOM / EXTERNAL COLLABORATORS */}
                  <div className="pt-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Additional / External Collaborators (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Metal Facade Works, Site Contractor, Consultant..."
                      value={customSubText}
                      onChange={(e) => setCustomSubText(e.target.value)}
                      className="w-full h-10 px-3.5 text-sm font-normal text-slate-800 bg-white border border-slate-300 rounded-xl outline-none placeholder:text-slate-400 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 3: MILESTONE, TYPE & SCHEDULE */}
              <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Calendar size={14} className="text-primary" />
                  <span>3. Milestone, Status & Schedule</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* CURRENT STAGE */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        {config.stageLabel} (Stage)
                      </label>
                      {customStageMode ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomStageMode(false);
                            setFormCurrentStage(config.stages[0] || "Concept");
                          }}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Select list
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCustomStageMode(true)}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          + Custom stage
                        </button>
                      )}
                    </div>

                    {!customStageMode ? (
                      <select
                        value={formCurrentStage}
                        onChange={(e) => {
                          if (e.target.value === "custom") {
                            setCustomStageMode(true);
                          } else {
                            setFormCurrentStage(e.target.value);
                            setFormProgress(getStageDefaultProgress(e.target.value, formStatus));
                          }
                        }}
                        className="w-full h-10 px-3 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary cursor-pointer transition-all"
                      >
                        <optgroup label="Standard Lifecycle Pipeline">
                          {STAGE_PIPELINES.standard.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Detailed Milestone Stages">
                          {config.stages
                            .filter((st) => !STAGE_PIPELINES.standard.includes(st))
                            .map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                        </optgroup>
                        <option value="custom">+ Custom stage...</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. Concept, Design, Site, Plinth..."
                        value={formCurrentStage}
                        onChange={(e) => setFormCurrentStage(e.target.value)}
                        className="w-full h-10 px-3.5 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                      />
                    )}

                    {/* Quick pipeline progression buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Pipeline:</span>
                      {STAGE_PIPELINES.standard.map((st, idx) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setCustomStageMode(false);
                            setFormCurrentStage(st);
                            setFormProgress(getStageDefaultProgress(st, formStatus));
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            (formCurrentStage || "").toLowerCase() === st.toLowerCase()
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-white border border-slate-200 hover:border-indigo-300 text-slate-700"
                          }`}
                        >
                          {idx + 1}. {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PROJECT TYPE */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        {config.typeLabel}
                      </label>
                      {customTypeMode ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomTypeMode(false);
                            setFormProjectType(config.types[0] || "Site");
                          }}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Select list
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCustomTypeMode(true)}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          + Custom type
                        </button>
                      )}
                    </div>

                    {!customTypeMode ? (
                      <select
                        value={formProjectType}
                        onChange={(e) => {
                          if (e.target.value === "custom") {
                            setCustomTypeMode(true);
                          } else {
                            setFormProjectType(e.target.value);
                          }
                        }}
                        className="w-full h-10 px-3 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary cursor-pointer transition-all"
                      >
                        {config.types.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        <option value="custom">+ Custom type...</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. Site, Desk, Interior..."
                        value={formProjectType}
                        onChange={(e) => setFormProjectType(e.target.value)}
                        className="w-full h-10 px-3.5 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* PROJECT STATUS */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Project Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => {
                        const nextSt = e.target.value;
                        setFormStatus(nextSt);
                        if (nextSt === "Completed") setFormProgress(100);
                      }}
                      className="w-full h-10 px-3 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary cursor-pointer transition-all"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PROGRESS % */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Progress Completion
                      </label>
                      <span className="text-xs font-bold text-slate-800">{formProgress}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={formProgress}
                      onChange={(e) => setFormProgress(Number(e.target.value))}
                      className="w-full accent-primary h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <div className="flex gap-1 pt-0.5">
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setFormProgress(pct)}
                          className={`flex-1 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            formProgress === pct
                              ? "bg-slate-900 text-white"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* START DATE (NEPALI CALENDAR) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Start Date (Nepali Calendar)
                    </label>
                    <NepaliDatePicker
                      value={formStartDate}
                      onChange={setFormStartDate}
                      placeholder="Select Nepali start date"
                      dropUp
                    />
                  </div>

                  {/* DEADLINE (NEPALI CALENDAR) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Target Deadline (Nepali Calendar)
                    </label>
                    <NepaliDatePicker
                      value={formDeadline}
                      onChange={setFormDeadline}
                      placeholder="Select Nepali deadline"
                      dropUp
                    />
                  </div>
                </div>
              </div>

              {/* STICKY FOOTER ACTIONS */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-rose-600 font-medium truncate max-w-[280px]">
                  {err}
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-semibold bg-primary hover:bg-primary-dark active:scale-95 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {saving && <RefreshCw size={12} className="animate-spin" />}
                    <span>{saving ? "Saving..." : editingProject ? "Save Changes" : "Create Project"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUICK STAGE UPDATE ================= */}
      {quickStageProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Update {config.stageLabel}
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-[280px]">
                  Project: <span className="font-semibold text-slate-800">{quickStageProject.name}</span>
                </p>
              </div>
              <button
                onClick={() => setQuickStageProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* STAGE PIPELINE (CONCEPT -> DESIGN -> SITE) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Core Stage Pipeline
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Click to select</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {STAGE_PIPELINES.standard.map((step, idx) => {
                    const isCurrent = stageInput.toLowerCase() === step.toLowerCase();
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setStageInput(step)}
                        className={`px-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-0.5 ${
                          isCurrent
                            ? "bg-primary text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:border-primary/50"
                        }`}
                      >
                        <span className="text-[9px] opacity-70">Step {idx + 1}</span>
                        <span>{step}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SELECT FROM ALL CONFIGURED STAGES */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Or choose from all stages:
                </label>
                <select
                  value={stageInput}
                  onChange={(e) => setStageInput(e.target.value)}
                  className="w-full h-10 px-3 text-xs sm:text-sm font-normal text-slate-800 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                >
                  <optgroup label="Standard Pipeline">
                    {STAGE_PIPELINES.standard.map((s) => (
                      <option key={`std-${s}`} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="Completed">Completed / Handover</option>
                  </optgroup>
                  <optgroup label="Detailed & Domain Stages">
                    {config.stages
                      .filter((s) => !STAGE_PIPELINES.standard.includes(s) && s !== "Completed")
                      .map((s) => (
                        <option key={`cfg-${s}`} value={s}>
                          {s}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* CUSTOM STAGE INPUT */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">
                  Custom Stage Name (optional)
                </label>
                <input
                  type="text"
                  value={stageInput}
                  onChange={(e) => setStageInput(e.target.value)}
                  placeholder="e.g. Municipal Approval..."
                  className="w-full h-9 px-3 text-xs text-slate-700 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickStageProject(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingQuick || !stageInput.trim()}
                  onClick={handleSaveQuickStage}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingQuick ? "Saving..." : "Update Stage"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUICK DEADLINE UPDATE ================= */}
      {quickDeadlineProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4 fade-in my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Update Deadline</h3>
                <p className="text-xs text-slate-500 truncate max-w-[240px]">
                  Project: <span className="font-semibold text-slate-800">{quickDeadlineProject.name}</span>
                </p>
              </div>
              <button
                onClick={() => setQuickDeadlineProject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Target Deadline (Nepali BS Calendar)
                </label>
                <NepaliDatePicker
                  value={normalizeDateToISO(deadlineInput)}
                  onChange={(iso) => setDeadlineInput(iso)}
                  placeholder="Select deadline date..."
                />
              </div>

              {deadlineInput && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Formatted Date
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {formatProjectDateNepali(deadlineInput)}
                    </span>
                  </div>
                  {(() => {
                    const urg = getDeadlineUrgency(deadlineInput);
                    return (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${urg.badgeClass}`}>
                        {urg.label}
                      </span>
                    );
                  })()}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickDeadlineProject(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingQuick}
                  onClick={handleSaveQuickDeadline}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingQuick ? "Saving..." : "Save Deadline"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  Project: <span className="font-semibold text-slate-800">{quickStatusProject.name}</span>
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
                    const isSelected = (statusInput || "").toLowerCase() === st.toLowerCase();
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
                  onClick={() => handleSaveQuickStatus(quickStatusProject, statusInput, progressInput)}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-xl shadow-xs cursor-pointer hover:bg-primary/95"
                >
                  Save Status & Progress
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SYNC EXCEL DATA TO DB ================= */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-5 my-auto fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Sync Excel Data to Database
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update existing database projects and import missing entries.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-xs font-semibold text-slate-900">
                  How database sync works:
                </p>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>
                    <strong>Existing projects</strong> matching names from the Excel (e.g. <em>Tagal Residence, Attariya Timmure, Manaslu Thakali</em>) will have all their fields updated ({config.leadLabel}, Stage, Dates, Status, {config.subLeadLabel}).
                  </li>
                  <li>
                    <strong>Missing projects</strong> from the 21 Excel entries will be automatically created with all fields populated.
                  </li>
                </ul>
              </div>

              {/* SUPABASE SQL MIGRATION CALLOUT */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-indigo-950">Step 1: Run SQL Migration in Supabase</p>
                      {isDbMigrationRequired ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                          Required
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Columns Ready
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-indigo-800 mt-1 leading-relaxed">
                      PostgreSQL requires columns on the <code>projects</code> table before it can store Architects, Stages, and Deadlines in the database rows. Copy this SQL, paste it into your <strong>Supabase Dashboard &gt; SQL Editor</strong>, and click <strong>Run</strong>:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sql = `-- Run in Supabase SQL Editor to add relational project columns:
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_architect_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sub_architect_ids jsonb DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_work text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_stage text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';

-- Clean up any deprecated or unnormalized columns:
ALTER TABLE projects DROP COLUMN IF EXISTS last_updated;
ALTER TABLE projects DROP COLUMN IF EXISTS lead_architect;
ALTER TABLE projects DROP COLUMN IF EXISTS sub_architects;
ALTER TABLE projects DROP COLUMN IF EXISTS deadline;`;
                      navigator.clipboard.writeText(sql);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 3000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-all"
                  >
                    {copiedSql ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                    <span>{copiedSql ? "Copied SQL!" : "Copy SQL"}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleSyncExcelToDb}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
                  <span>{syncing ? "Syncing Database..." : "Sync 21 Projects to DB"}</span>
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
                      Allow employees to update <strong>{settingsStageLabel || "Current Stage"}</strong> and <strong>Deadline</strong> directly from their dashboard.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settingsAllowEmployeeEdit}
                    onClick={() => setSettingsAllowEmployeeEdit((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settingsAllowEmployeeEdit ? "bg-primary" : "bg-slate-300"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settingsAllowEmployeeEdit ? "translate-x-5" : "translate-x-0"
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
                      Activate project and milestone tracking for this organization.
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
                        <span className="text-xs font-semibold text-slate-900">{p.name}</span>
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

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Settings2,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useProjects, useOrgWorkLogs, useRoster } from "../../hooks/useOrgData";
import { useOfficeHours } from "../../constants/officeHours";
import {
  PROJECT_PRESETS,
  getProjectConfig,
} from "../../constants/projectPresets";
import { ProjectFormModal } from "../Projects/components/ProjectFormModal";
import { QuickStageModal } from "../Projects/components/QuickStageModal";
import { QuickDeadlineModal } from "../Projects/components/QuickDeadlineModal";
import { ProjectKpiCards } from "../Projects/components/ProjectKpiCards";
import { ProjectToolbar } from "../Projects/components/ProjectToolbar";
import { ProjectTableView } from "../Projects/components/ProjectTableView";
import { ProjectCardGrid } from "../Projects/components/ProjectCardGrid";
import { ProjectQuickStatusModal } from "../Projects/components/ProjectQuickStatusModal";
import { ProjectSettingsModal } from "../Projects/components/ProjectSettingsModal";
import {
  calculateProjectStats,
  calculateKPIStats,
  filterProjects,
} from "../Projects/utils/projectHelpers";

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
  const [savingQuick, setSavingQuick] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const empMap = useMemo(
    () => new Map((employees || []).map((e) => [e.id, e])),
    [employees],
  );

  const projectStats = useMemo(() => {
    return calculateProjectStats(
      projects,
      entries,
      empMap,
      me?.id,
      me?.name,
    );
  }, [projects, entries, empMap, me?.id, me?.name]);

  const kpiStats = useMemo(() => {
    return calculateKPIStats(projects, projectStats);
  }, [projects, projectStats]);

  const filteredProjects = useMemo(() => {
    return filterProjects(projects, {
      searchQuery,
      statusFilter,
      empMap,
      projectStats,
    });
  }, [projects, searchQuery, statusFilter, empMap, projectStats]);

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

  // Save Project (Create or Full Edit)
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

  // Quick Stage Update
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

  // Quick Deadline Update
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

  // Save Workspace Settings
  const handleSaveSettings = async (newConfig) => {
    if (updateProjectConfig) {
      await updateProjectConfig(newConfig);
      setSuccessMsg("Settings saved.");
      setTimeout(() => setSuccessMsg(""), 3000);
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
            Track initiatives, {config.stageLabel.toLowerCase()}s, team ownership, and upcoming deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs transition-all cursor-pointer"
            title="Configure labels and presets"
          >
            <Settings2 size={13} className="text-slate-500" />
            <span>Settings</span>
          </button>

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
      <ProjectKpiCards
        kpiStats={kpiStats}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        isLoading={isProjectsLoading}
      />

      {/* TOOLBAR */}
      <ProjectToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        leadLabel={config.leadLabel}
      />

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
              : "No projects in the workspace yet. Create one to get started."}
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
        <ProjectTableView
          projects={filteredProjects}
          projectStats={projectStats}
          empMap={empMap}
          config={config}
          isAdmin={true}
          onOpenStage={setQuickStageProject}
          onOpenDeadline={setQuickDeadlineProject}
          onOpenStatus={setQuickStatusProject}
          onEditProject={openEditModal}
          onDeleteProject={handleDeleteProject}
        />
      ) : (
        <ProjectCardGrid
          projects={filteredProjects}
          projectStats={projectStats}
          empMap={empMap}
          config={config}
          isAdmin={true}
          onOpenStage={setQuickStageProject}
          onOpenDeadline={setQuickDeadlineProject}
          onOpenStatus={setQuickStatusProject}
          onEditProject={openEditModal}
          onDeleteProject={handleDeleteProject}
        />
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
        isAdmin={true}
      />

      {/* Shared Quick Deadline Modal */}
      <QuickDeadlineModal
        isOpen={Boolean(quickDeadlineProject)}
        onClose={() => setQuickDeadlineProject(null)}
        project={quickDeadlineProject}
        onSave={handleSaveDeadline}
        saving={savingQuick}
      />

      {/* Quick Status & Progress Modal */}
      <ProjectQuickStatusModal
        isOpen={Boolean(quickStatusProject)}
        project={quickStatusProject}
        onClose={() => setQuickStatusProject(null)}
        onSave={handleSaveQuickStatus}
      />

      {/* Project Workspace Settings Modal */}
      <ProjectSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={config}
        onSaveConfig={handleSaveSettings}
      />
    </div>
  );
}

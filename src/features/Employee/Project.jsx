import { useState, useMemo, useEffect } from "react";
import { FolderKanban, CheckCircle2, X } from "lucide-react";
import {
  useProjects,
  useOrgWorkLogs,
  useRoster,
} from "../../hooks/useOrgData";
import { useOfficeHours } from "../../constants/officeHours";
import { getProjectConfig } from "../../constants/projectPresets";
import { QuickStageModal } from "../Projects/components/QuickStageModal";
import { QuickDeadlineModal } from "../Projects/components/QuickDeadlineModal";
import { ProjectKpiCards } from "../Projects/components/ProjectKpiCards";
import { ProjectToolbar } from "../Projects/components/ProjectToolbar";
import { ProjectTableView } from "../Projects/components/ProjectTableView";
import { ProjectCardGrid } from "../Projects/components/ProjectCardGrid";
import {
  calculateProjectStats,
  calculateKPIStats,
  filterProjects,
} from "../Projects/utils/projectHelpers";

export function EmployeeProjects({ me }) {
  const { projects, updateProjectStageAndDeadline, isLoading: isProjectsLoading } =
    useProjects();
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
      tab,
      empMap,
      projectStats,
    });
  }, [projects, searchQuery, statusFilter, tab, empMap, projectStats]);

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

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Projects
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            View your project milestones, deadlines, and team contributions.
          </p>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <ProjectKpiCards
        kpiStats={kpiStats}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        isLoading={isProjectsLoading}
      />

      {/* TOOLBAR (WITH MY PROJECTS VS ALL PROJECTS TAB) */}
      <ProjectToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        leadLabel={config.leadLabel}
        tab={tab}
        onTabChange={setTab}
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
            {tab === "my"
              ? "You are not assigned to any projects matching this filter yet."
              : "No projects match your active search or filter."}
          </p>
          {tab === "my" && (
            <button
              onClick={() => setTab("all")}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-medium cursor-pointer"
            >
              View All Organization Projects
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <ProjectTableView
          projects={filteredProjects}
          projectStats={projectStats}
          empMap={empMap}
          config={config}
          isAdmin={false}
          onOpenStage={setQuickStageProject}
          onOpenDeadline={setQuickDeadlineProject}
        />
      ) : (
        <ProjectCardGrid
          projects={filteredProjects}
          projectStats={projectStats}
          empMap={empMap}
          config={config}
          isAdmin={false}
          onOpenStage={setQuickStageProject}
          onOpenDeadline={setQuickDeadlineProject}
        />
      )}

      {/* Quick Stage Modal (Employee mode: isAdmin={false}) */}
      <QuickStageModal
        isOpen={Boolean(quickStageProject)}
        onClose={() => setQuickStageProject(null)}
        project={quickStageProject}
        onSave={handleSaveStage}
        saving={savingQuick}
        isAdmin={false}
      />

      {/* Quick Deadline Modal */}
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

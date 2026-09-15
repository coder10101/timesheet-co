import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Activity,
  Users,
  FolderKanban,
} from "lucide-react";
import {
  useProjects,
  useOrgWorkLogs,
  useRoster,
  useWorkLogs,
} from "../../hooks/useOrgData";
import { useOfficeHours } from "../../constants/officeHours";
import {
  getProjectConfig,
  getDeadlineUrgency,
  formatProjectDateNepali,
  normalizeDateToISO,
  getArchitectAssignedRole,
} from "../../constants/projectPresets";
import { formatWorkLogEntryText } from "../../utils/workType";
import { ProjectDetailsHeader } from "./components/details/ProjectDetailsHeader";
import { ProjectSnapshotCard } from "./components/details/ProjectSnapshotCard";
import { ProjectWorkLogsTab } from "./components/details/ProjectWorkLogsTab";
import { ProjectActivityTab } from "./components/details/ProjectActivityTab";
import { ProjectContributorsTab } from "./components/details/ProjectContributorsTab";
import { ProjectTeamCard } from "./components/details/ProjectTeamCard";
import { ProjectTimelineCard } from "./components/details/ProjectTimelineCard";
import { ProjectEditDetailsModal } from "./components/details/ProjectEditDetailsModal";
import { ProjectAddLogModal } from "./components/details/ProjectAddLogModal";

export function ProjectDetails({ me }) {
  const { projectId } = useParams();
  const {
    projects,
    updateProject,
    isLoading: isProjectsLoading,
  } = useProjects();
  const { entries } = useOrgWorkLogs();
  const { employees } = useRoster();
  const officeHours = useOfficeHours();
  const userWorkLogs = useWorkLogs(me?.id);

  const config = officeHours.projectConfig || getProjectConfig();
  const isAdmin = me?.role === "admin";
  const canEdit = isAdmin || config.allowEmployeeEdit;

  // Active Tab: 'worklogs' | 'activity' | 'contributors'
  const [activeTab, setActiveTab] = useState("worklogs");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logMemberFilter, setLogMemberFilter] = useState("all");
  const [logTypeFilter, setLogTypeFilter] = useState("all");

  // Activity History Filter State
  const [activityFilter, setActivityFilter] = useState("all");
  const [activitySearchQuery, setActivitySearchQuery] = useState("");

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Filtered employees roster excluding admins
  const assignableEmployees = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    return employees.filter((e) => {
      const r = (e.role || "").toLowerCase();
      return r !== "admin" && r !== "superadmin";
    });
  }, [employees]);

  // Find target project
  const project = useMemo(() => {
    if (!projects || !projectId) return null;
    let decodedId = projectId;
    try {
      decodedId = decodeURIComponent(projectId);
    } catch {
      decodedId = projectId;
    }
    const targetStr = String(projectId).trim().toLowerCase();
    const decodedTarget = String(decodedId).trim().toLowerCase();
    return (
      projects.find((p) => String(p.id).toLowerCase() === targetStr) ||
      projects.find((p) => String(p.id).toLowerCase() === decodedTarget) ||
      projects.find((p) => (p.name || "").toLowerCase() === targetStr) ||
      projects.find((p) => (p.name || "").toLowerCase() === decodedTarget) ||
      null
    );
  }, [projects, projectId]);

  // Lead Architect resolution
  const leadArchitect = useMemo(() => {
    if (!project) return null;
    if (project.lead_architect_id && employees) {
      const found = employees.find((e) => e.id === project.lead_architect_id);
      if (found) return found;
    }
    if (project.lead_architect && employees) {
      const found = employees.find(
        (e) => e.name?.toLowerCase() === project.lead_architect?.toLowerCase(),
      );
      if (found) return found;
    }
    if (
      project.lead_architect &&
      !/^[0-9a-f-]{36}$/i.test(project.lead_architect)
    ) {
      return { name: project.lead_architect, role: "Lead Architect" };
    }
    return null;
  }, [project?.lead_architect_id, project?.lead_architect, employees]);

  // Sub-Architects / Contributors resolution
  const subArchitects = useMemo(() => {
    if (!project) return [];
    const list = [];
    const seen = new Set();

    // 1. Team members selected by ID
    if (Array.isArray(project.sub_architect_ids)) {
      project.sub_architect_ids.forEach((id) => {
        const found = employees?.find((e) => e.id === id);
        const metaName = project.sub_architect_names?.[id];
        const assignedRole = project.sub_architect_roles?.[id] || "Design";
        let name = found?.name || metaName || "";
        if (!name && !/^[0-9a-f-]{36}$/i.test(id)) {
          name = id;
        } else if (!name) {
          name = "Team Member";
        }
        if (!seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          if (found) {
            list.push({ ...found, assignedRole, isExternal: false });
          } else {
            list.push({
              id,
              name,
              role: "Sub-Architect",
              assignedRole,
              isExternal: false,
            });
          }
        }
      });
    }

    // 2. Additional / External Collaborators text
    if (project.sub_architects) {
      const names = String(project.sub_architects)
        .split(/[,;/+]/)
        .map((s) => s.trim())
        .filter(Boolean);
      names.forEach((n) => {
        if (!seen.has(n.toLowerCase())) {
          seen.add(n.toLowerCase());
          const found = employees?.find(
            (e) => e.name?.toLowerCase() === n.toLowerCase(),
          );
          if (found) {
            const assignedRole =
              project.sub_architect_roles?.[found.id] || "Design";
            list.push({ ...found, assignedRole, isExternal: false });
          } else {
            list.push({
              name: n,
              role: "External Collaborator",
              assignedRole: "Design",
              isExternal: true,
            });
          }
        }
      });
    }
    return list;
  }, [
    project?.sub_architect_ids,
    project?.sub_architect_roles,
    project?.sub_architect_names,
    project?.sub_architects,
    employees,
  ]);

  // Categorize architects by Design vs Site streams
  const designArchitects = useMemo(() => {
    const list = [];
    if (
      leadArchitect &&
      (project?.lead_architect_role === "Design" ||
        project?.lead_architect_role === "Both" ||
        !project?.lead_architect_role)
    ) {
      list.push({ ...leadArchitect, isLead: true });
    }
    subArchitects.forEach((sub) => {
      if (sub.assignedRole === "Design" || sub.assignedRole === "Both") {
        list.push({ ...sub, isLead: false });
      }
    });
    return list;
  }, [leadArchitect, project?.lead_architect_role, subArchitects]);

  const siteArchitects = useMemo(() => {
    const list = [];
    if (
      leadArchitect &&
      (project?.lead_architect_role === "Site" ||
        project?.lead_architect_role === "Both")
    ) {
      list.push({ ...leadArchitect, isLead: true });
    }
    subArchitects.forEach((sub) => {
      if (sub.assignedRole === "Site" || sub.assignedRole === "Both") {
        list.push({ ...sub, isLead: false });
      }
    });
    return list;
  }, [leadArchitect, project?.lead_architect_role, subArchitects]);

  // Project Work Logs
  const projectLogs = useMemo(() => {
    if (!project) return [];
    const sourceLogs =
      entries && Array.isArray(entries) && entries.length > 0
        ? entries
        : userWorkLogs?.entries && Array.isArray(userWorkLogs.entries)
          ? userWorkLogs.entries.map((l) => ({
              ...l,
              employeeName: me?.name || "Me",
              employeeRole: me?.role || "Employee",
            }))
          : [];

    return sourceLogs.filter((log) => {
      const matchId =
        log.project_id && String(log.project_id) === String(project.id);
      const matchName =
        log.project_id &&
        project.name &&
        String(log.project_id).toLowerCase() === project.name.toLowerCase();
      const matchText =
        project.name &&
        log.entry_text &&
        log.entry_text.toLowerCase().includes(project.name.toLowerCase());
      return matchId || matchName || matchText;
    });
  }, [
    project?.id,
    project?.name,
    entries,
    userWorkLogs?.entries,
    me?.name,
    me?.role,
  ]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return projectLogs.filter((log) => {
      if (logMemberFilter !== "all") {
        if (
          log.employee_id !== logMemberFilter &&
          log.employeeName !== logMemberFilter
        ) {
          return false;
        }
      }
      if (logTypeFilter !== "all") {
        const type = (log.work_type || "desk").toLowerCase();
        if (type !== logTypeFilter) return false;
      }
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const inText = (log.entry_text || "").toLowerCase().includes(q);
        const inName = (log.employeeName || "").toLowerCase().includes(q);
        if (!inText && !inName) return false;
      }
      return true;
    });
  }, [projectLogs, logMemberFilter, logTypeFilter, logSearchQuery]);

  // Total Hours & Unique Contributors
  const totalHours = useMemo(() => {
    return projectLogs.reduce(
      (acc, l) => acc + (parseFloat(l.hours_spent) || 0),
      0,
    );
  }, [projectLogs]);

  const uniqueContributors = useMemo(() => {
    const set = new Set();
    projectLogs.forEach((l) => {
      if (l.employee_id) set.add(l.employee_id);
      else if (l.employeeName) set.add(l.employeeName);
    });
    return set.size;
  }, [projectLogs]);

  // Contributor Stats breakdown
  const contributorStats = useMemo(() => {
    const map = {};
    projectLogs.forEach((l) => {
      const key = l.employee_id || l.employeeName || "Unknown";
      if (!map[key]) {
        map[key] = {
          id: l.employee_id,
          name: l.employeeName || "Unknown",
          role: l.employeeRole || "Team Member",
          hours: 0,
          deskHours: 0,
          siteHours: 0,
          entriesCount: 0,
          lastActive: l.date,
        };
      }
      const hrs = parseFloat(l.hours_spent) || 0;
      const type = (l.work_type || "desk").toLowerCase();
      map[key].hours += hrs;
      if (type === "site") {
        map[key].siteHours += hrs;
      } else {
        map[key].deskHours += hrs;
      }
      map[key].entriesCount += 1;
      if (l.date && (!map[key].lastActive || l.date > map[key].lastActive)) {
        map[key].lastActive = l.date;
      }
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [projectLogs]);

  // Activity history
  const projectActivities = useMemo(() => {
    if (!project) return [];
    const list = Array.isArray(project.activity_history)
      ? [...project.activity_history]
      : [];

    const hasCreation = list.some((a) => a.type === "created");
    if (!hasCreation) {
      list.push({
        id: "baseline_init",
        type: "created",
        title: "Project initialized",
        description: `Project setup${
          project.current_stage ? ` at stage "${project.current_stage}"` : ""
        }${
          project.end_date || project.deadline
            ? ` with target deadline ${formatProjectDateNepali(project.end_date || project.deadline)}`
            : ""
        }`,
        user_name: leadArchitect?.name || "Project Administrator",
        user_role: leadArchitect ? "Lead Architect" : "Admin",
        created_at:
          project.created_at ||
          (project.start_date ? normalizeDateToISO(project.start_date) : null) ||
          project.updated_at ||
          new Date().toISOString(),
      });
    }

    return list.sort(
      (a, b) =>
        new Date(b.created_at || b.timestamp || 0) -
        new Date(a.created_at || a.timestamp || 0),
    );
  }, [project, leadArchitect]);

  // Filtered activity history
  const filteredActivities = useMemo(() => {
    return projectActivities.filter((act) => {
      if (activityFilter === "stage" && act.type !== "stage_change")
        return false;
      if (activityFilter === "deadline" && act.type !== "deadline_change")
        return false;
      if (
        activityFilter === "status" &&
        act.type !== "status_change" &&
        act.type !== "progress_change"
      )
        return false;

      if (activitySearchQuery.trim()) {
        const q = activitySearchQuery.toLowerCase();
        const inTitle = (act.title || "").toLowerCase().includes(q);
        const inDesc = (act.description || "").toLowerCase().includes(q);
        const inUser = (act.user_name || "").toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inUser) return false;
      }
      return true;
    });
  }, [projectActivities, activityFilter, activitySearchQuery]);

  const urgency = useMemo(() => {
    if (!project) return null;
    return getDeadlineUrgency(
      project.end_date || project.deadline,
      project.status,
    );
  }, [project]);

  const myAssignedRole = useMemo(() => {
    if (!me || !project) return "Design";
    return getArchitectAssignedRole(project, me.id);
  }, [me?.id, project]);

  // Save Project Edits
  const handleSaveEdit = async (updates) => {
    if (!project) return;
    setIsSavingEdit(true);
    try {
      await updateProject({
        id: project.id,
        ...updates,
        actor: { id: me?.id, name: me?.name, role: me?.role },
      });
      setShowEditModal(false);
    } catch (err) {
      console.error("Error updating project:", err);
      alert("Failed to save changes: " + (err.message || "Unknown error"));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Submit Work Log
  const handleSaveWorkLog = async ({ date, hours, workType, text }) => {
    const formattedText = formatWorkLogEntryText(text, workType, `${hours}h`);
    await userWorkLogs.addEntry({
      text: formattedText,
      date,
      projectId: project.id,
      workType,
    });
  };

  if (isProjectsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">
            Loading project details...
          </p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <FolderKanban size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Project Not Found
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          The requested project "{projectId}" could not be found or has been removed.
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/95 transition-all shadow-sm"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 fade-in pb-12">
      {/* 1. TOP HEADER & METADATA BAR */}
      <ProjectDetailsHeader
        project={project}
        isAdmin={isAdmin}
        canEdit={canEdit}
        onOpenEdit={() => setShowEditModal(true)}
        onOpenAddLog={() => setShowLogModal(true)}
      />

      {/* 2. UNIFIED PROJECT SNAPSHOT CARD */}
      <ProjectSnapshotCard
        project={project}
        config={config}
        urgency={urgency}
        totalHours={totalHours}
        uniqueContributors={uniqueContributors}
        designArchitects={designArchitects}
        siteArchitects={siteArchitects}
        canEdit={canEdit}
        isAdmin={isAdmin}
        onOpenEdit={() => setShowEditModal(true)}
      />

      {/* 3. 2-COLUMN WORKSPACE: LEFT (8 COLS) + RIGHT (4 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: TABS */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs space-y-4">
            {/* TABS HEADER */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setActiveTab("worklogs")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "worklogs"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Clock size={13} />
                  <span>Work Logs Stream</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                    {projectLogs.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "activity"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Activity size={13} />
                  <span>Activity History</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                    {projectActivities.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("contributors")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "contributors"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Users size={13} />
                  <span>Effort Breakdown</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                    {contributorStats.length}
                  </span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === "worklogs" && (
              <ProjectWorkLogsTab
                filteredLogs={filteredLogs}
                contributorStats={contributorStats}
                logSearchQuery={logSearchQuery}
                setLogSearchQuery={setLogSearchQuery}
                logMemberFilter={logMemberFilter}
                setLogMemberFilter={setLogMemberFilter}
                logTypeFilter={logTypeFilter}
                setLogTypeFilter={setLogTypeFilter}
                isAdmin={isAdmin}
                onOpenAddLog={() => setShowLogModal(true)}
              />
            )}

            {activeTab === "activity" && (
              <ProjectActivityTab
                filteredActivities={filteredActivities}
                activityFilter={activityFilter}
                setActivityFilter={setActivityFilter}
                activitySearchQuery={activitySearchQuery}
                setActivitySearchQuery={setActivitySearchQuery}
              />
            )}

            {activeTab === "contributors" && (
              <ProjectContributorsTab
                contributorStats={contributorStats}
                totalHours={totalHours}
              />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ARCHITECTURAL TEAM & TIMELINE */}
        <div className="lg:col-span-4 space-y-4">
          <ProjectTeamCard
            leadArchitect={leadArchitect}
            leadRole={project.lead_architect_role || "Design"}
            subArchitects={subArchitects}
            config={config}
          />

          <ProjectTimelineCard project={project} />
        </div>
      </div>

      {/* MODAL 4: EDIT PROJECT DETAILS */}
      <ProjectEditDetailsModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        project={project}
        isAdmin={isAdmin}
        me={me}
        config={config}
        assignableEmployees={assignableEmployees}
        employees={employees}
        onSave={handleSaveEdit}
        saving={isSavingEdit}
      />

      {/* MODAL 5: ADD WORK LOG */}
      <ProjectAddLogModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        project={project}
        defaultType={myAssignedRole === "Site" ? "site" : "desk"}
        onSaveLog={handleSaveWorkLog}
      />
    </div>
  );
}

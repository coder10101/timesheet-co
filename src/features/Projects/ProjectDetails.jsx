import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  User,
  Users,
  FolderKanban,
  Tag,
  Briefcase,
  Plus,
  Pencil,
  Check,
  X,
  TrendingUp,
  Layers,
  ChevronRight,
  Sparkles,
  Filter,
  Search,
  Building2,
  CalendarDays,
  Activity,
  MapPin,
  History,
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
import { getEmployeeColor } from "../../constants/colors";
import { NepaliDatePicker } from "../../components/NepaliDatePicker";
import { todayISO } from "../../utils/workTime";

const getActivityMeta = (type) => {
  switch (type) {
    case "stage_change":
      return {
        icon: Layers,
        color: "text-purple-600 bg-purple-50 border-purple-200",
        pill: "bg-purple-50 text-purple-700 border-purple-200",
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
        color: "text-indigo-600 bg-indigo-50 border-indigo-200",
        pill: "bg-indigo-50 text-indigo-700 border-indigo-200",
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

export function ProjectDetails({ me }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, updateProject, updateProjectStageAndDeadline, isLoading: isProjectsLoading } = useProjects();
  const { entries, isLoading: isLogsLoading } = useOrgWorkLogs();
  const { employees, isLoading: isRosterLoading } = useRoster();
  const officeHours = useOfficeHours();
  const userWorkLogs = useWorkLogs(me?.id);

  const config = officeHours.projectConfig || getProjectConfig();
  const isAdmin = me?.role === "admin";
  const canEdit = isAdmin || config.allowEmployeeEdit;

  // Active Tab: 'worklogs' | 'activity' | 'contributors'
  const [activeTab, setActiveTab] = useState("worklogs");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logMemberFilter, setLogMemberFilter] = useState("all");
  const [logTypeFilter, setLogTypeFilter] = useState("all"); // 'all' | 'desk' | 'site'

  // Activity History Filter State
  const [activityFilter, setActivityFilter] = useState("all"); // 'all' | 'stage' | 'deadline' | 'status'
  const [activitySearchQuery, setActivitySearchQuery] = useState("");

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  // Edit Stage & Deadline Form State
  const [editStage, setEditStage] = useState("");
  const [editStatus, setEditStatus] = useState("Active");
  const [editProgress, setEditProgress] = useState(0);
  const [editStartDate, setEditStartDate] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Quick Log Work Form State
  const [logDate, setLogDate] = useState(todayISO());
  const [logHours, setLogHours] = useState("4");
  const [logType, setLogType] = useState("desk");
  const [logText, setLogText] = useState("");
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [logFeedback, setLogFeedback] = useState(null);

  // Find project
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
      projects.find(
        (p) =>
          (p.name || "").trim().toLowerCase() === decodedTarget ||
          (p.name || "").trim().toLowerCase() === targetStr
      ) ||
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
        (e) => e.name?.toLowerCase() === project.lead_architect?.toLowerCase()
      );
      if (found) return found;
    }
    if (project.lead_architect) {
      return { name: project.lead_architect, role: "Lead Architect" };
    }
    return null;
  }, [project?.lead_architect_id, project?.lead_architect, employees]);

  // Sub-Architects / Contributors resolution
  const subArchitects = useMemo(() => {
    if (!project) return [];
    const list = [];
    if (Array.isArray(project.sub_architect_ids) && employees) {
      project.sub_architect_ids.forEach((id) => {
        const found = employees.find((e) => e.id === id);
        if (found && !list.some((x) => x.id === found.id)) list.push(found);
      });
    }
    if (list.length === 0 && project.sub_architects) {
      const names = String(project.sub_architects)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      names.forEach((n) => {
        const found = employees?.find(
          (e) => e.name?.toLowerCase() === n.toLowerCase()
        );
        if (found && !list.some((x) => x.id === found.id)) list.push(found);
        else list.push({ name: n, role: "Sub-Architect" });
      });
    }
    return list;
  }, [project?.sub_architect_ids, project?.sub_architects, employees]);

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
      const matchId = log.project_id && String(log.project_id) === String(project.id);
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
  }, [project?.id, project?.name, entries, userWorkLogs?.entries, me?.name, me?.role]);

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

  // Aggregates & Metrics
  const totalHours = useMemo(() => {
    return projectLogs.reduce(
      (acc, l) => acc + (parseFloat(l.hours_spent) || 0),
      0
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

  // Contributor breakdown
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
          entriesCount: 0,
          lastActive: l.date,
        };
      }
      map[key].hours += parseFloat(l.hours_spent) || 0;
      map[key].entriesCount += 1;
      if (l.date > map[key].lastActive) {
        map[key].lastActive = l.date;
      }
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [projectLogs]);

  // Project Activity History
  const projectActivities = useMemo(() => {
    if (!project) return [];
    const list = Array.isArray(project.activity_history) ? [...project.activity_history] : [];

    // Synthesize baseline creation event if none exists
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

    // Sort descending (newest first)
    return list.sort(
      (a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0)
    );
  }, [project, leadArchitect]);

  // Filtered activity history
  const filteredActivities = useMemo(() => {
    return projectActivities.filter((act) => {
      if (activityFilter === "stage" && act.type !== "stage_change") return false;
      if (activityFilter === "deadline" && act.type !== "deadline_change") return false;
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

  const latestActivity = projectActivities[0] || null;

  // Urgency & Status
  const urgency = useMemo(() => {
    if (!project) return null;
    return getDeadlineUrgency(project.end_date || project.deadline, project.status);
  }, [project]);

  // Pipeline stages
  const pipelineStages = useMemo(() => {
    // Base pipeline: Concept -> Design -> Site -> Handover
    const defaultPipeline = ["Concept", "Design", "Site", "Handover"];
    const current = project?.current_stage;
    if (!current) return defaultPipeline;

    // If current is in standard pipeline, return standard
    if (defaultPipeline.some((s) => s.toLowerCase() === current.toLowerCase())) {
      return defaultPipeline;
    }
    // If current is in config stages, use first 4-5 stages
    if (config.stages && config.stages.length) {
      const idx = config.stages.indexOf(current);
      if (idx !== -1) {
        return config.stages.slice(0, Math.max(4, idx + 2));
      }
    }
    return [current, "Design", "Site", "Handover"];
  }, [project, config.stages]);

  // Open edit modal helper
  const handleOpenEdit = () => {
    if (!project) return;
    setEditStage(project.current_stage || "");
    setEditStatus(project.status || "Active");
    setEditProgress(project.progress || getStageDefaultProgress(project.current_stage, project.status));
    setEditStartDate(project.start_date ? normalizeDateToISO(project.start_date) : "");
    setEditDeadline(project.end_date || project.deadline ? normalizeDateToISO(project.end_date || project.deadline) : "");
    setShowEditModal(true);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!project) return;
    setIsSavingEdit(true);
    try {
      const activities = [];
      const nowISO = new Date().toISOString();
      const actorInfo = {
        user_id: me?.id || null,
        user_name: me?.name || "Team Member",
        user_role: me?.role || "Editor",
        created_at: nowISO,
      };

      if (editStage && editStage !== project.current_stage) {
        activities.push({
          id: `act_${Date.now()}_stage`,
          type: "stage_change",
          title: `Stage changed to ${editStage}`,
          description: project.current_stage
            ? `Stage shifted from "${project.current_stage}" to "${editStage}"`
            : `Stage initialized as "${editStage}"`,
          old_value: project.current_stage || "",
          new_value: editStage,
          ...actorInfo,
        });
      }

      const currentDeadlineISO = project.end_date || project.deadline ? normalizeDateToISO(project.end_date || project.deadline) : "";
      const newDeadlineISO = editDeadline ? normalizeDateToISO(editDeadline) : "";
      if (newDeadlineISO !== currentDeadlineISO) {
        activities.push({
          id: `act_${Date.now()}_deadline`,
          type: "deadline_change",
          title: editDeadline ? `Target deadline set to ${formatProjectDateNepali(editDeadline)}` : "Target deadline removed",
          description: currentDeadlineISO
            ? `Target deadline updated from ${formatProjectDateNepali(currentDeadlineISO)} to ${formatProjectDateNepali(editDeadline)}`
            : `Target deadline scheduled for ${formatProjectDateNepali(editDeadline)}`,
          old_value: currentDeadlineISO,
          new_value: editDeadline,
          ...actorInfo,
        });
      }

      if (editStatus && editStatus !== project.status) {
        activities.push({
          id: `act_${Date.now()}_status`,
          type: "status_change",
          title: `Status marked as ${editStatus}`,
          description: `Project status changed from "${project.status || "Active"}" to "${editStatus}"`,
          old_value: project.status || "",
          new_value: editStatus,
          ...actorInfo,
        });
      }

      const currentStartISO = project.start_date ? normalizeDateToISO(project.start_date) : "";
      const newStartISO = editStartDate ? normalizeDateToISO(editStartDate) : "";
      if (newStartISO !== currentStartISO) {
        activities.push({
          id: `act_${Date.now()}_start`,
          type: "start_date_change",
          title: editStartDate ? `Start date set to ${formatProjectDateNepali(editStartDate)}` : "Start date cleared",
          description: currentStartISO
            ? `Start date updated from ${formatProjectDateNepali(currentStartISO)} to ${formatProjectDateNepali(editStartDate)}`
            : `Project start date set to ${formatProjectDateNepali(editStartDate)}`,
          old_value: currentStartISO,
          new_value: editStartDate,
          ...actorInfo,
        });
      }

      if (Number(editProgress) !== Number(project.progress || 0) && (!editStage || editStage === project.current_stage)) {
        activities.push({
          id: `act_${Date.now()}_progress`,
          type: "progress_change",
          title: `Progress updated to ${editProgress}%`,
          description: `Completion progress adjusted from ${project.progress || 0}% to ${editProgress}%`,
          old_value: project.progress || 0,
          new_value: Number(editProgress),
          ...actorInfo,
        });
      }

      await updateProjectStageAndDeadline({
        id: project.id,
        currentStage: editStage,
        deadline: editDeadline,
        endDate: editDeadline,
        progress: Number(editProgress),
        status: editStatus,
        actor: { id: me?.id, name: me?.name, role: me?.role },
        activityRecords: activities,
      });

      if (editStartDate !== (project.start_date || "")) {
        await updateProject(project.id, {
          start_date: editStartDate,
          actor: { id: me?.id, name: me?.name, role: me?.role },
        });
      }
      setShowEditModal(false);
    } catch (err) {
      console.error("Error updating project:", err);
      alert("Failed to save changes: " + (err.message || "Unknown error"));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Advance stage helper
  const handleAdvanceStage = async () => {
    if (!project) return;
    const next = getNextStage(project.current_stage);
    if (!next) return;
    const nextProgress = getStageDefaultProgress(next);
    const nextStatus = next === "Completed" ? "Completed" : project.status;
    const activityRecord = {
      id: `act_${Date.now()}_advance`,
      type: "stage_change",
      title: `Stage advanced to ${next}`,
      description: `Pipeline progressed from "${project.current_stage || "Concept"}" to "${next}"`,
      old_value: project.current_stage || "",
      new_value: next,
      user_id: me?.id || null,
      user_name: me?.name || "Team Member",
      user_role: me?.role || "Project Lead",
      created_at: new Date().toISOString(),
    };
    try {
      await updateProjectStageAndDeadline({
        id: project.id,
        currentStage: next,
        progress: nextProgress,
        status: nextStatus,
        actor: { id: me?.id, name: me?.name, role: me?.role },
        activityRecords: [activityRecord],
      });
    } catch (err) {
      console.error("Error advancing stage:", err);
    }
  };

  // Handle submit work log
  const handleSaveWorkLog = async (e) => {
    e.preventDefault();
    if (!logText.trim()) return;
    setIsSavingLog(true);
    setLogFeedback(null);

    try {
      await userWorkLogs.addEntry({
        text: logText.trim(),
        date: logDate || todayISO(),
        projectId: project.id,
        workType: logType,
      });
      setLogFeedback({ type: "success", message: "Work log entry added successfully!" });
      setLogText("");
      setTimeout(() => {
        setShowLogModal(false);
        setLogFeedback(null);
      }, 1000);
    } catch (err) {
      console.error("Failed to add work log:", err);
      setLogFeedback({ type: "error", message: err.message || "Failed to add work log" });
    } finally {
      setIsSavingLog(false);
    }
  };

  if (isProjectsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-text-muted">Loading project details...</p>
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
        <h2 className="text-xl font-bold text-slate-800 mb-2">Project Not Found</h2>
        <p className="text-sm text-text-muted mb-6">
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

  const currentStageIndex = pipelineStages.findIndex(
    (s) => s.toLowerCase() === (project.current_stage || "").toLowerCase()
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 fade-in pb-12">
      {/* 1. TOP HEADER & METADATA BAR */}
      <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <Link
            to="/projects"
            className="p-2.5 rounded-xl border border-border bg-surface-muted hover:bg-white text-text-muted hover:text-text transition-colors shadow-2xs shrink-0 mt-0.5 sm:mt-0 cursor-pointer"
            title="Back to all projects"
          >
            <ArrowLeft size={17} />
          </Link>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <span>Projects</span>
              <ChevronRight size={12} className="text-text-faint" />
              <span className="text-text truncate">{project.name}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight flex items-center gap-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs shrink-0"
                  style={{ backgroundColor: project.color || "#63537E" }}
                />
                <span className="truncate">{project.name}</span>
              </h1>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  project.status === "Completed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : project.status === "Delayed"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : project.status === "On Hold"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    project.status === "Completed"
                      ? "bg-emerald-500"
                      : project.status === "Delayed"
                      ? "bg-rose-500"
                      : project.status === "On Hold"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                />
                {project.status || "Active"}
              </span>

              {/* Project Type Badge */}
              {project.project_type && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getProjectTypeBadgeClass(
                    project.project_type
                  )}`}
                >
                  <Tag size={11} />
                  {project.project_type}
                </span>
              )}

              {/* Scope Badge */}
              {project.project_work && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-text-muted border border-border">
                  <Building2 size={11} />
                  {project.project_work}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={() => setShowLogModal(true)}
            className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>Log Work</span>
          </button>
          {canEdit && (
            <button
              onClick={handleOpenEdit}
              className="h-9 inline-flex items-center gap-1.5 px-3.5 bg-white border border-border hover:bg-surface-muted rounded-xl text-xs font-semibold text-text transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <Pencil size={13} className="text-text-muted" />
              <span>Edit Details</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. UNIFIED PROJECT SNAPSHOT & STAGE PROGRESSION CARD */}
      <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* 4 KPI METRIC TILES */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Tile 1: Stage & Progress */}
          <div className="p-3.5 rounded-xl bg-surface-muted border border-border-light space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Current Stage
              </span>
              <Layers size={14} className="text-primary" />
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-sm sm:text-base font-bold text-text truncate">
                {project.current_stage || "Not Set"}
              </span>
              <span className="text-xs font-bold text-primary font-mono">
                {project.progress ?? getStageDefaultProgress(project.current_stage, project.status)}%
              </span>
            </div>
            {canEdit && getNextStage(project.current_stage) && (
              <button
                onClick={handleAdvanceStage}
                className="w-full mt-1 inline-flex items-center justify-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 py-1 px-2 rounded-lg transition-colors cursor-pointer"
              >
                <span>Advance to {getNextStage(project.current_stage)}</span>
                <ChevronRight size={11} />
              </button>
            )}
          </div>

          {/* Tile 2: Start Date (Nepali BS) */}
          <div className="p-3.5 rounded-xl bg-surface-muted border border-border-light space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Start Date (BS)
              </span>
              <Calendar size={14} className="text-text-muted" />
            </div>
            <div className="text-sm sm:text-base font-bold text-text truncate">
              {formatProjectDateNepali(project.start_date)}
            </div>
            <div className="text-[10px] text-text-muted truncate">
              Project Kickoff
            </div>
          </div>

          {/* Tile 3: Target Deadline (Nepali BS + Urgency) */}
          <div className="p-3.5 rounded-xl bg-surface-muted border border-border-light space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Target Deadline (BS)
              </span>
              <Clock size={14} className="text-text-muted" />
            </div>
            <div className="text-sm sm:text-base font-bold text-text truncate">
              {formatProjectDateNepali(project.end_date || project.deadline)}
            </div>
            {urgency && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border ${urgency.badgeClass}`}>
                <span className={`w-1 h-1 rounded-full ${urgency.dotClass}`} />
                {urgency.label}
              </span>
            )}
          </div>

          {/* Tile 4: Total Effort Logged */}
          <div className="p-3.5 rounded-xl bg-surface-muted border border-border-light space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Total Effort Logged
              </span>
              <Briefcase size={14} className="text-text-muted" />
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-text truncate">
              {totalHours.toFixed(1)} hrs
            </div>
            <div className="text-[10px] text-text-muted truncate">
              {projectLogs.length} entries by {uniqueContributors} {uniqueContributors === 1 ? "person" : "people"}
            </div>
          </div>
        </div>

        {/* PIPELINE PROGRESSION TRACK */}
        <div className="pt-2 space-y-2 border-t border-border-light">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text text-xs">Stage Progression Track</span>
            <span className="text-[11px] text-text-muted font-mono">
              Overall: {project.progress ?? getStageDefaultProgress(project.current_stage, project.status)}%
            </span>
          </div>

          {/* Connected Steps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
            {pipelineStages.map((stageName, idx) => {
              const isPassed = currentStageIndex !== -1 && idx < currentStageIndex;
              const isCurrent =
                currentStageIndex !== -1
                  ? idx === currentStageIndex
                  : stageName.toLowerCase() === (project.current_stage || "").toLowerCase();

              return (
                <div
                  key={stageName}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                    isCurrent
                      ? "bg-primary-light/40 border-primary/40 ring-1 ring-primary/20 shadow-2xs"
                      : isPassed
                      ? "bg-success-light/40 border-success/30 text-text"
                      : "bg-surface-muted border-border-light text-text-muted opacity-80"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isCurrent
                        ? "bg-primary text-white shadow-xs"
                        : isPassed
                        ? "bg-success text-white"
                        : "bg-surface border border-border text-text-muted"
                    }`}
                  >
                    {isPassed ? <Check size={12} strokeWidth={2.5} /> : idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate ${isCurrent ? "text-primary" : "text-text"}`}>
                      {stageName}
                    </p>
                    <span className="text-[10px] text-text-muted block truncate">
                      {isCurrent ? "Active Stage" : isPassed ? "Completed" : "Upcoming"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall Progress Bar */}
          <div className="w-full bg-surface-muted rounded-full h-1.5 overflow-hidden mt-2 border border-border-light">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  project.progress ??
                    getStageDefaultProgress(project.current_stage, project.status)
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. 2-COLUMN WORKSPACE: WORK LOGS & ACTIVITY (8 COLS) + TEAM & DETAILS (4 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (8 COLS): WORK LOGS STREAM & CONTRIBUTOR BREAKDOWN */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-border rounded-2xl shadow-2xs overflow-hidden">
            {/* CARD HEADER WITH CLEAN TABS */}
            <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-surface-muted/30">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("worklogs")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "worklogs"
                      ? "bg-white text-text shadow-xs border border-border"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <Briefcase size={13} />
                  <span>Work Logs</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-surface-muted text-text">
                    {projectLogs.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "activity"
                      ? "bg-white text-text shadow-xs border border-border"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <History size={13} />
                  <span>Activity History</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-surface-muted text-text">
                    {projectActivities.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("contributors")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "contributors"
                      ? "bg-white text-text shadow-xs border border-border"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <Users size={13} />
                  <span>Effort by Contributor</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-surface-muted text-text">
                    {contributorStats.length}
                  </span>
                </button>
              </div>

              {/* Add Log Quick Button */}
              <button
                type="button"
                onClick={() => setShowLogModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/95 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus size={13} />
                <span>Log Entry</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="p-4 sm:p-5">
              {activeTab === "worklogs" && (
                <div className="space-y-4">
                  {/* FILTERS BAR: SEARCH, CONTRIBUTOR, AND DESK/SITE PILLS */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-3 border-b border-border-light">
                    {/* Search box */}
                    <div className="relative flex-1">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      />
                      <input
                        type="text"
                        value={logSearchQuery}
                        onChange={(e) => setLogSearchQuery(e.target.value)}
                        placeholder="Search logs or staff..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-surface-muted border border-border rounded-xl focus:bg-white focus:outline-hidden focus:border-primary transition-all text-text"
                      />
                      {logSearchQuery && (
                        <button
                          onClick={() => setLogSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Contributor dropdown */}
                    <select
                      value={logMemberFilter}
                      onChange={(e) => setLogMemberFilter(e.target.value)}
                      className="text-xs bg-surface-muted border border-border rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-hidden focus:border-primary text-text font-medium cursor-pointer"
                    >
                      <option value="all">All Contributors</option>
                      {contributorStats.map((c) => (
                        <option key={c.id || c.name} value={c.id || c.name}>
                          {c.name} ({c.entriesCount})
                        </option>
                      ))}
                    </select>

                    {/* Mode filter pills */}
                    <div className="flex items-center p-0.5 bg-surface-muted rounded-xl border border-border-light text-xs shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setLogTypeFilter("all")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          logTypeFilter === "all"
                            ? "bg-white text-text shadow-2xs"
                            : "text-text-muted hover:text-text"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogTypeFilter("desk")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          logTypeFilter === "desk"
                            ? "bg-white text-text shadow-2xs"
                            : "text-text-muted hover:text-text"
                        }`}
                      >
                        Desk
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogTypeFilter("site")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          logTypeFilter === "site"
                            ? "bg-[#63537E] text-white shadow-2xs"
                            : "text-text-muted hover:text-text"
                        }`}
                      >
                        Site
                      </button>
                    </div>
                  </div>

                  {/* LOGS LIST */}
                  {filteredLogs.length > 0 ? (
                    <div className="divide-y divide-border-light">
                      {filteredLogs.map((log) => {
                        const avatarColor = getEmployeeColor(log.employee_id, log.employeeName);
                        return (
                          <div
                            key={log.id}
                            className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-surface-muted/40 p-2.5 rounded-xl transition-colors"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              {/* Member Avatar */}
                              <div
                                className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs"
                                style={{ backgroundColor: avatarColor }}
                              >
                                {getInitials(log.employeeName) || "U"}
                              </div>

                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-bold text-text">
                                    {log.employeeName || "Employee"}
                                  </span>
                                  {log.employeeRole && (
                                    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                                      • {log.employeeRole}
                                    </span>
                                  )}
                                  {/* Mode pill */}
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                      log.work_type === "site"
                                        ? "bg-amber-500/15 text-amber-900 border border-amber-500/30"
                                        : "bg-surface-muted text-text border border-border-light"
                                    }`}
                                  >
                                    {log.work_type === "site" ? (
                                      <MapPin size={10} />
                                    ) : (
                                      <Building2 size={10} />
                                    )}
                                    {log.work_type || "desk"}
                                  </span>
                                </div>

                                <p className="text-xs text-text leading-relaxed break-words whitespace-pre-wrap">
                                  {log.entry_text}
                                </p>
                              </div>
                            </div>

                            {/* Date & Hours Badge */}
                            <div className="sm:text-right shrink-0 pl-11 sm:pl-0 flex sm:flex-col items-center sm:items-end justify-between gap-1">
                              <span className="text-xs font-bold text-text flex items-center gap-1">
                                <CalendarDays size={13} className="text-text-muted" />
                                {formatProjectDateNepali(log.date)}
                              </span>
                              {log.hours_spent ? (
                                <span className="text-[11px] font-bold text-primary bg-primary-light/60 border border-primary/20 px-2 py-0.5 rounded-md font-mono">
                                  {log.hours_spent} hrs
                                </span>
                              ) : (
                                <span className="text-[10px] text-text-muted">
                                  {formatRelativeTime(log.created_at || log.date)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 bg-surface-muted text-text-muted rounded-2xl flex items-center justify-center mx-auto mb-3 border border-border">
                        <Briefcase size={22} />
                      </div>
                      <h4 className="text-sm font-bold text-text mb-1">
                        No work logs found
                      </h4>
                      <p className="text-xs text-text-muted mb-4 max-w-sm mx-auto">
                        {logSearchQuery || logMemberFilter !== "all" || logTypeFilter !== "all"
                          ? "No work log entries match the selected filters."
                          : "No work logs have been submitted for this project yet."}
                      </p>
                      <button
                        onClick={() => setShowLogModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-xs cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Log First Work Entry</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVITY HISTORY TAB */}
              {activeTab === "activity" && (
                <div className="space-y-4">
                  {/* FILTERS BAR: SEARCH AND ACTIVITY TYPE PILLS */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-3 border-b border-border-light">
                    {/* Search box */}
                    <div className="relative flex-1">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                      />
                      <input
                        type="text"
                        value={activitySearchQuery}
                        onChange={(e) => setActivitySearchQuery(e.target.value)}
                        placeholder="Search changes or authors..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-surface-muted border border-border rounded-xl focus:bg-white focus:outline-hidden focus:border-primary transition-all text-text"
                      />
                      {activitySearchQuery && (
                        <button
                          onClick={() => setActivitySearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Filter pills */}
                    <div className="flex items-center p-0.5 bg-surface-muted rounded-xl border border-border-light text-xs shrink-0 overflow-x-auto self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setActivityFilter("all")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activityFilter === "all"
                            ? "bg-white text-text shadow-2xs"
                            : "text-text-muted hover:text-text"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivityFilter("stage")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activityFilter === "stage"
                            ? "bg-white text-text shadow-2xs"
                            : "text-text-muted hover:text-text"
                        }`}
                      >
                        Stages
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivityFilter("deadline")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activityFilter === "deadline"
                            ? "bg-white text-text shadow-2xs"
                            : "text-text-muted hover:text-text"
                        }`}
                      >
                        Deadlines
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivityFilter("status")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activityFilter === "status"
                            ? "bg-white text-text shadow-2xs"
                            : "text-text-muted hover:text-text"
                        }`}
                      >
                        Status & Progress
                      </button>
                    </div>
                  </div>

                  {/* ACTIVITY TIMELINE STREAM */}
                  {filteredActivities.length > 0 ? (
                    <div className="relative pl-6 sm:pl-8 space-y-3.5 pt-1 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border-light">
                      {filteredActivities.map((act) => {
                        const meta = getActivityMeta(act.type);
                        const IconComponent = meta.icon;
                        const authorAvatarColor = getEmployeeColor(act.user_id, act.user_name);

                        return (
                          <div key={act.id} className="relative group">
                            {/* Bullet icon */}
                            <div
                              className={`absolute -left-6 sm:-left-8 top-1 w-6 sm:w-8 h-6 sm:h-8 rounded-full border flex items-center justify-center shadow-2xs transition-transform group-hover:scale-105 ${meta.color}`}
                            >
                              <IconComponent size={13} strokeWidth={2.2} />
                            </div>

                            {/* Event card */}
                            <div className="bg-surface-muted/30 border border-border-light rounded-xl p-3.5 hover:bg-white hover:border-border transition-all shadow-2xs space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${meta.pill}`}
                                  >
                                    {meta.label}
                                  </span>
                                  <h4 className="text-xs font-bold text-text">
                                    {act.title}
                                  </h4>
                                </div>

                                {/* Date & relative time */}
                                <div className="flex items-center gap-2 text-[11px] text-text-muted shrink-0">
                                  <span className="flex items-center gap-1 font-medium">
                                    <CalendarDays size={12} className="text-text-muted" />
                                    {formatProjectDateNepali(act.created_at || act.timestamp)}
                                  </span>
                                  <span className="text-text-faint">•</span>
                                  <span className="font-medium text-text-muted">
                                    {formatRelativeTime(act.created_at || act.timestamp)}
                                  </span>
                                </div>
                              </div>

                              {/* Description */}
                              {act.description && (
                                <p className="text-xs text-text leading-relaxed">
                                  {act.description}
                                </p>
                              )}

                              {/* Old vs New visual transition badges */}
                              {act.old_value !== undefined &&
                                act.new_value !== undefined &&
                                String(act.old_value) !== String(act.new_value) &&
                                act.old_value !== "" && (
                                  <div className="flex items-center gap-2 text-[11px] pt-0.5">
                                    <span className="px-2 py-0.5 rounded bg-surface-muted border border-border-light text-text-muted font-medium line-through">
                                      {String(act.old_value)}
                                    </span>
                                    <ChevronRight size={12} className="text-text-muted" />
                                    <span className="px-2 py-0.5 rounded bg-primary-light/50 border border-primary/30 text-primary font-bold">
                                      {String(act.new_value)}
                                    </span>
                                  </div>
                                )}

                              {/* Author Footer */}
                              <div className="pt-2 border-t border-border-light/60 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 text-text-muted">
                                  <div
                                    className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[8px] font-bold shrink-0"
                                    style={{ backgroundColor: authorAvatarColor }}
                                  >
                                    {getInitials(act.user_name) || "U"}
                                  </div>
                                  <span className="font-semibold text-text">
                                    {act.user_name || "Team Member"}
                                  </span>
                                  {act.user_role && (
                                    <span className="text-text-muted text-[10px]">
                                      ({act.user_role})
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-text-faint font-mono">
                                  {act.id?.slice(0, 14)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 bg-surface-muted text-text-muted rounded-2xl flex items-center justify-center mx-auto mb-3 border border-border">
                        <History size={22} />
                      </div>
                      <h4 className="text-sm font-bold text-text mb-1">
                        No activity logs match
                      </h4>
                      <p className="text-xs text-text-muted max-w-sm mx-auto">
                        {activitySearchQuery || activityFilter !== "all"
                          ? "No project activity records match the selected filters."
                          : "Project timeline changes, stage transitions, and deadline adjustments will be recorded here automatically."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* EFFORT BY CONTRIBUTOR TAB */}
              {activeTab === "contributors" && (
                <div className="space-y-4">
                  {contributorStats.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {contributorStats.map((c) => {
                        const percentOfTotal =
                          totalHours > 0
                            ? Math.round((c.hours / totalHours) * 100)
                            : 0;
                        const avatarColor = getEmployeeColor(c.id, c.name);

                        return (
                          <div
                            key={c.id || c.name}
                            className="p-3.5 rounded-xl border border-border bg-surface-muted/40 hover:bg-white transition-colors flex flex-col justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0"
                                  style={{ backgroundColor: avatarColor }}
                                >
                                  {getInitials(c.name)}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-text truncate">
                                    {c.name}
                                  </h4>
                                  <span className="text-[10px] text-text-muted block truncate">
                                    {c.role} • {c.entriesCount} entries
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xs font-bold font-mono text-primary">
                                  {c.hours.toFixed(1)} hrs
                                </span>
                                <span className="text-[10px] text-text-muted block">
                                  {percentOfTotal}% of effort
                                </span>
                              </div>
                            </div>

                            {/* Effort bar */}
                            <div className="space-y-1">
                              <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${percentOfTotal}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-text-muted">
                                <span>Active Contributor</span>
                                <span>Last: {formatProjectDateNepali(c.lastActive)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-text-muted text-xs">
                      No team member logged work on this project yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4 COLS): ARCHITECTURAL TEAM & SPECIFICATIONS */}
        <div className="lg:col-span-4 space-y-4">
          {/* ARCHITECTURAL TEAM CARD */}
          <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-light">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text">
                  Architectural Team
                </h3>
              </div>
              <span className="text-[10px] font-bold text-text-muted font-mono">
                {uniqueContributors || subArchitects.length + (leadArchitect ? 1 : 0)} assigned
              </span>
            </div>

            {/* Lead Architect */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                {config.leadLabel || "Lead Architect"}
              </span>
              <div className="p-3 rounded-xl bg-surface-muted border border-border-light flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0"
                  style={{
                    backgroundColor: getEmployeeColor(
                      leadArchitect?.id,
                      leadArchitect?.name
                    ),
                  }}
                >
                  {getInitials(leadArchitect?.name) || "LA"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text truncate">
                    {leadArchitect?.name || "Unassigned"}
                  </p>
                  <span className="text-[10px] text-text-muted block truncate">
                    {leadArchitect?.title || leadArchitect?.role || "Project Lead"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-Architects / Contributors */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                {config.subLeadLabel || "Sub-Architects / Contributors"}
              </span>
              {subArchitects.length > 0 ? (
                <div className="space-y-2">
                  {subArchitects.map((sub, idx) => (
                    <div
                      key={sub.id || sub.name || idx}
                      className="p-2.5 rounded-xl bg-surface-muted border border-border-light flex items-center gap-2.5"
                    >
                      <div
                        className="w-7 h-7 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs"
                        style={{
                          backgroundColor: getEmployeeColor(sub.id, sub.name),
                        }}
                      >
                        {getInitials(sub.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-text truncate">
                          {sub.name}
                        </p>
                        <span className="text-[9px] text-text-muted block truncate">
                          {sub.role || "Team Contributor"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic py-2">
                  No sub-architects assigned yet
                </p>
              )}
            </div>
          </div>

          {/* PROJECT SPECIFICATIONS CARD */}
          <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border-light">
              <FolderKanban size={15} className="text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-text">
                Project Overview
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border-light/60">
                <span className="text-text-muted">Scope / Work</span>
                <span className="font-semibold text-text">{project.project_work || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border-light/60">
                <span className="text-text-muted">Project Type</span>
                <span className="font-semibold text-text">{project.project_type || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border-light/60">
                <span className="text-text-muted">Status</span>
                <span className="font-semibold text-text">{project.status || "Active"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border-light/60">
                <span className="text-text-muted">Current Stage</span>
                <span className="font-semibold text-primary">{project.current_stage || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border-light/60">
                <span className="text-text-muted">Target Deadline</span>
                <span className="font-semibold text-text">{formatProjectDateNepali(project.end_date || project.deadline)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border-light/60">
                <span className="text-text-muted">Total Logs</span>
                <span className="font-semibold font-mono text-text">{projectLogs.length} entries</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-text-muted">Latest Activity</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className="font-semibold text-primary hover:underline truncate max-w-[130px] text-right cursor-pointer"
                  title={latestActivity?.title || "View activity"}
                >
                  {latestActivity?.title || "—"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. EDIT PROJECT STAGE & DEADLINE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-border max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-light pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Pencil size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">
                    Edit Project Progress & Timeline
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    {project.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* CURRENT STAGE */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text block">
                  Current Pipeline Stage
                </label>
                <select
                  value={editStage}
                  onChange={(e) => setEditStage(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-surface-muted border border-border rounded-xl focus:bg-white focus:outline-hidden focus:border-primary text-text cursor-pointer"
                >
                  <option value="">Select Stage...</option>
                  {(config.stages || []).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* PROJECT STATUS */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text block">
                  Project Status
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        editStatus === st
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-surface-muted text-text-muted border-border hover:bg-white hover:text-text"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* PROGRESS SLIDER */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-text">Completion Progress</span>
                  <span className="text-primary font-mono">{editProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editProgress}
                  onChange={(e) => setEditProgress(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* NEPALI CALENDAR: START DATE */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text block">
                  Start Date (Nepali Calendar)
                </label>
                <NepaliDatePicker
                  value={normalizeDateToISO(editStartDate)}
                  onChange={(iso) => setEditStartDate(iso)}
                  placeholder="Select Nepali start date..."
                />
              </div>

              {/* NEPALI CALENDAR: TARGET DEADLINE */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text block">
                  Target Deadline (Nepali Calendar)
                </label>
                <NepaliDatePicker
                  value={normalizeDateToISO(editDeadline)}
                  onChange={(iso) => setEditDeadline(iso)}
                  placeholder="Select Nepali target deadline..."
                  dropUp={true}
                />
                {editDeadline && (
                  <div className="text-[11px] text-text-muted font-medium">
                    Formatted: {formatProjectDateNepali(editDeadline)}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border-light pt-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface-muted rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary/95 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. QUICK LOG WORK MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-border max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border-light pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">
                    Log Work on Project
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    {project.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {logFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  logFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {logFeedback.type === "success" ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <AlertCircle size={15} />
                )}
                <span>{logFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveWorkLog} className="space-y-4">
              {/* DATE PICKER */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text block">
                  Date (Nepali Calendar)
                </label>
                <NepaliDatePicker
                  value={normalizeDateToISO(logDate)}
                  onChange={(iso) => setLogDate(iso)}
                  placeholder="Select log date..."
                />
              </div>

              {/* HOURS & WORK MODE */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text block">
                    Hours Spent
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={logHours}
                    onChange={(e) => setLogHours(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-surface-muted border border-border rounded-xl focus:bg-white focus:outline-hidden focus:border-primary font-mono text-text"
                    placeholder="e.g. 4"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text block">
                    Work Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setLogType("desk")}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        logType === "desk"
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-surface-muted text-text-muted border-border hover:bg-white hover:text-text"
                      }`}
                    >
                      Desk
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogType("site")}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        logType === "site"
                          ? "bg-[#63537E] text-white border-[#63537E] shadow-xs"
                          : "bg-surface-muted text-text-muted border-border hover:bg-white hover:text-text"
                      }`}
                    >
                      Site
                    </button>
                  </div>
                </div>
              </div>

              {/* TASK DESCRIPTION */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text block">
                  Work Details / Tasks Performed
                </label>
                <textarea
                  rows={3}
                  value={logText}
                  onChange={(e) => setLogText(e.target.value)}
                  placeholder="Describe the drawings, 3D models, site inspection, or BOQ work completed..."
                  className="w-full text-xs px-3 py-2 bg-surface-muted border border-border rounded-xl focus:bg-white focus:outline-hidden focus:border-primary resize-none leading-relaxed text-text"
                  required
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-border-light pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface-muted rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLog || !logText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary/95 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingLog ? "Saving Entry..." : "Submit Log Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

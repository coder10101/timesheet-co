import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  FolderKanban,
  Users,
  Calendar,
  User,
  Check,
  X,
  AlertCircle,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import {
  useProjects,
  useOrgWorkLogs,
  useRoster,
} from "../../hooks/useOrgData";
import { fmtDate, todayISO } from "../../utils/workTime";
import { NepaliDatePicker } from "../../components/NepaliDatePicker";
import { isoToBS, NEPALI_MONTHS } from "../../utils/nepaliCalendar";

const PRESET_COLORS = [
  "#2563EB", // Blue
  "#0D9488", // Teal
  "#D97706", // Amber
  "#7C3AED", // Purple
  "#E11D48", // Rose
  "#059669", // Emerald
  "#4F46E5", // Indigo
  "#EA580C", // Orange
];

export function AdminProjects({ me }) {
  const { projects, createProject, archiveProject, updateProject } =
    useProjects();
  const { entries } = useOrgWorkLogs();
  const { employees } = useRoster();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formStatus, setFormStatus] = useState("Active");
  const [formLead, setFormLead] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formProgress, setFormProgress] = useState(50);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // Compute stats and contributor counts (Called unconditionally before any early return)
  const projectStats = useMemo(() => {
    const map = new Map();
    const projList = projects || [];
    const entryList = entries || [];

    projList.forEach((p) => {
      const pEntries = entryList.filter((e) => e.project_id === p.id);
      const uniqueEmployees = new Set(
        pEntries.map((e) => e.employee_id).filter(Boolean),
      );

      const status = p.status || (p.archived ? "Completed" : "Active");
      const progress = p.progress ?? (status === "Completed" ? 100 : 65);
      const lead = p.lead || employees?.[0]?.name || "Unassigned";
      const deadline = p.deadline || "";

      map.set(p.id, {
        memberCount: Math.max(uniqueEmployees.size, 1),
        status,
        progress,
        lead,
        deadline,
      });
    });

    return map;
  }, [projects, entries, employees]);

  if (projects === null || entries === null) return null;

  const activeProjects = (projects || []).filter(
    (p) => !p.archived && (p.status === "Active" || !p.status),
  );
  const onHoldProjects = (projects || []).filter(
    (p) => !p.archived && p.status === "On Hold",
  );
  const completedProjects = (projects || []).filter(
    (p) => p.archived || p.status === "Completed",
  );

  const openCreateModal = () => {
    setEditingProject(null);
    setFormName("");
    setFormColor(PRESET_COLORS[0]);
    setFormStatus("Active");
    setFormLead(employees?.[0]?.name || "");
    setFormDeadline("");
    setFormProgress(40);
    setErr("");
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    const stats = projectStats.get(p.id);
    setEditingProject(p);
    setFormName(p.name);
    setFormColor(p.color || PRESET_COLORS[0]);
    setFormStatus(stats?.status || "Active");
    setFormLead(p.lead || stats?.lead || "");
    setFormDeadline(p.deadline || "");
    setFormProgress(stats?.progress ?? 50);
    setErr("");
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return setErr("Please enter a project title.");

    setSaving(true);
    setErr("");

    try {
      if (editingProject) {
        await updateProject(editingProject.id, {
          name: formName.trim(),
          color: formColor,
          status: formStatus,
          lead: formLead,
          deadline: formDeadline,
          progress: Number(formProgress),
          archived: formStatus === "Completed",
        });
      } else {
        await createProject({
          name: formName.trim(),
          color: formColor,
          status: formStatus,
          lead: formLead,
          deadline: formDeadline,
          progress: Number(formProgress),
          orgId: me.org_id,
        });
      }
      setIsModalOpen(false);
    } catch (e) {
      setErr(e.message || "Failed to save project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 fade-in">
      {/* HEADER (REFERENCE IMAGE 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Projects</h1>
          <p className="text-xs text-text-muted">
            Track active projects and team assignments.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>New Project</span>
        </button>
      </div>

      {err && (
        <div className="p-3 rounded-xl bg-alert-light text-alert text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* TOP METRIC CARDS (REFERENCE IMAGE 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* ACTIVE */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-success-light text-success border border-success/30 flex items-center justify-center text-xl font-bold font-mono">
            {activeProjects.length}
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Active</h3>
            <p className="text-xs text-text-muted">projects in progress</p>
          </div>
        </div>

        {/* ON HOLD */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-warning-light text-warning border border-warning/30 flex items-center justify-center text-xl font-bold font-mono">
            {onHoldProjects.length}
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">On Hold</h3>
            <p className="text-xs text-text-muted">temporarily paused</p>
          </div>
        </div>

        {/* COMPLETED */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary border border-primary/30 flex items-center justify-center text-xl font-bold font-mono">
            {completedProjects.length}
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Completed</h3>
            <p className="text-xs text-text-muted">delivered successfully</p>
          </div>
        </div>
      </div>

      {/* 3-COLUMN PROJECTS GRID (REFERENCE IMAGE 2) */}
      {projects.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center text-xs text-text-muted shadow-2xs">
          <FolderKanban size={32} className="mx-auto mb-2 text-text-faint" />
          <p className="font-semibold text-text">No projects yet</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Click "+ New Project" above to create your first team project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const stats = projectStats.get(p.id) || {
              memberCount: 1,
              status: "Active",
              progress: 50,
              lead: "Unassigned",
              deadline: "",
            };

            const deadlineBS = stats.deadline ? isoToBS(stats.deadline) : null;

            return (
              <div
                key={p.id}
                className="group bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-border-light hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* CARD HEADER */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: p.color || "#63537E" }}
                      />
                      <h3 className="text-sm font-bold text-text truncate">
                        {p.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          stats.status === "Active"
                            ? "bg-success-light text-success border-success/30"
                            : stats.status === "On Hold"
                              ? "bg-warning-light text-warning border-warning/30"
                              : "bg-primary-light text-primary border-primary/30"
                        }`}
                      >
                        {stats.status}
                      </span>

                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Edit Project"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </div>

                  {/* METADATA ROWS */}
                  <div className="mt-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-text-muted">
                      <span>Lead</span>
                      <span className="font-semibold text-text truncate max-w-[150px]">
                        {stats.lead}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-text-muted">
                      <span>Team</span>
                      <span className="font-semibold text-text">
                        {stats.memberCount}{" "}
                        {stats.memberCount === 1 ? "member" : "members"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-text-muted">
                      <span>Deadline</span>
                      <span className="font-semibold text-text">
                        {stats.deadline
                          ? deadlineBS
                            ? `${deadlineBS.day} ${NEPALI_MONTHS[deadlineBS.month - 1]} ${deadlineBS.year}`
                            : fmtDate(stats.deadline)
                          : "TBD"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PROGRESS BAR (REFERENCE IMAGE 2) */}
                <div className="space-y-1.5 pt-2 border-t border-border-light">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-text-muted">Progress</span>
                    <span className="font-mono text-xs font-bold text-primary">
                      {stats.progress}%
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${stats.progress}%`,
                        backgroundColor:
                          stats.status === "Completed"
                            ? "#10B981"
                            : p.color || "#2563EB",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PROJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-border rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4 fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-border-light">
              <h3 className="text-base font-bold text-text">
                {editingProject ? "Edit Project" : "Create New Project"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-text block mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Branch Expansion, Annual Audit, Marketing Campaign..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-surface-muted border border-border-light rounded-xl p-2.5 text-xs text-text outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-text block mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-surface-muted border border-border-light rounded-xl p-2.5 text-xs text-text outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-text block mb-1">
                    Project Lead
                  </label>
                  <select
                    value={formLead}
                    onChange={(e) => setFormLead(e.target.value)}
                    className="w-full bg-surface-muted border border-border-light rounded-xl p-2.5 text-xs text-text outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {(employees || []).map((e) => (
                      <option key={e.id} value={e.name}>
                        {e.name} ({e.department || e.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-text block mb-1">
                  Target Deadline
                </label>
                <NepaliDatePicker
                  value={formDeadline}
                  onChange={setFormDeadline}
                  placeholder="Select target deadline"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-text">
                    Progress: {formProgress}%
                  </label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formProgress}
                  onChange={(e) => setFormProgress(e.target.value)}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div>
                <label className="font-bold text-text block mb-1.5">
                  Color Tag
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                        formColor === c ? "ring-2 ring-primary ring-offset-2 scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {formColor === c && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-muted cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formName.trim()}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : editingProject ? "Update Project" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

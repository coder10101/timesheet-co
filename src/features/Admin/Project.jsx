import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  FolderKanban,
  Users,
  Check,
  X,
  AlertCircle,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import {
  useProjects,
  useOrgWorkLogs,
} from "../../hooks/useOrgData";

const PRESET_COLORS = [
  "#63537E", // Plum (Primary)
  "#497833", // Green (Success)
  "#7A5A17", // Amber (Warning)
  "#913030", // Coral (Alert)
  "#2563EB", // Blue
  "#0D9488", // Teal
  "#7C3AED", // Purple
  "#EA580C", // Orange
];

export function AdminProjects({ me }) {
  const { projects, createProject, archiveProject, updateProject } =
    useProjects();
  const { entries } = useOrgWorkLogs();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formStatus, setFormStatus] = useState("Active");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // Compute contributor counts per project
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
      map.set(p.id, {
        memberCount: Math.max(uniqueEmployees.size, 1),
        entryCount: pEntries.length,
        status,
      });
    });

    return map;
  }, [projects, entries]);

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
    setErr("");
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    const stats = projectStats.get(p.id);
    setEditingProject(p);
    setFormName(p.name);
    setFormColor(p.color || PRESET_COLORS[0]);
    setFormStatus(stats?.status || "Active");
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
          archived: formStatus === "Completed",
        });
      } else {
        await createProject({
          name: formName.trim(),
          color: formColor,
          status: formStatus,
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
    <div className="max-w-6xl mx-auto space-y-4 fade-in pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Projects</h1>
          <p className="text-xs text-text-muted">
            Manage organization initiatives and team project categories.
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

      {/* TOP 3 METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* ACTIVE */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-success-light text-success border border-success/30 flex items-center justify-center text-xl font-bold font-mono">
            {activeProjects.length}
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Active</h3>
            <p className="text-xs text-text-muted">initiatives underway</p>
          </div>
        </div>

        {/* ON HOLD */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-warning-light text-warning border border-warning/30 flex items-center justify-center text-xl font-bold font-mono">
            {onHoldProjects.length}
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">On Hold</h3>
            <p className="text-xs text-text-muted">temporarily paused</p>
          </div>
        </div>

        {/* COMPLETED */}
        <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary border border-primary/30 flex items-center justify-center text-xl font-bold font-mono">
            {completedProjects.length}
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Completed</h3>
            <p className="text-xs text-text-muted">delivered / archived</p>
          </div>
        </div>
      </div>

      {/* PROJECTS GRID */}
      {projects.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center text-xs text-text-muted shadow-2xs">
          <FolderKanban size={32} className="mx-auto mb-2 text-text-faint" />
          <p className="font-semibold text-text">No projects yet</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Click "+ New Project" above to create your first team project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {projects.map((p) => {
            const stats = projectStats.get(p.id) || {
              memberCount: 1,
              entryCount: 0,
              status: "Active",
            };

            return (
              <div
                key={p.id}
                className="group bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-border-light hover:shadow-xs transition-all flex flex-col justify-between space-y-3.5"
              >
                <div>
                  {/* CARD HEADER */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
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
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>

                  {/* METADATA ROW */}
                  <div className="mt-3 flex items-center justify-between text-xs text-text-muted pt-2.5 border-t border-border-light">
                    <span className="flex items-center gap-1">
                      <Users size={13} />
                      <span>{stats.memberCount} contributor{stats.memberCount !== 1 ? "s" : ""}</span>
                    </span>
                    <span className="font-mono text-[11px]">
                      {stats.entryCount} log{stats.entryCount !== 1 ? "s" : ""} recorded
                    </span>
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

            <form onSubmit={handleSave} className="space-y-4">
              {/* NAME */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-text block">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Website Redesign, Mobile App..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-10 bg-surface-muted border border-border rounded-xl px-3 text-xs text-text placeholder:text-text-faint focus:border-primary outline-none"
                />
              </div>

              {/* COLOR PRESETS */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text block">
                  Color Tag
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={`w-7 h-7 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                        formColor === c
                          ? "ring-2 ring-primary ring-offset-2 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {formColor === c && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* STATUS */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-text block">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full h-10 bg-surface-muted border border-border rounded-xl px-3 text-xs font-semibold text-text outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text rounded-xl hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-primary hover:bg-primary-dark active:scale-95 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : editingProject ? "Save Changes" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

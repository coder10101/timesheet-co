import { useState } from "react";
import {
  Plus,
  Archive,
  ArchiveRestore,
  Pencil,
  Check,
  X,
  FolderKanban,
  Users,
  AlertCircle,
} from "lucide-react";
import { useProjects, useOrgWorkLogs } from "../../hooks/useOrgData";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";

const PRESET_COLORS = [
  "#3D6B7D",
  "#6B8F71",
  "#E0A458",
  "#B5563A",
  "#7A5A9E",
  "#4A7C8F",
  "#294D5B",
  "#0F3D3E",
];

export function AdminProjects({ me }) {
  const { projects, createProject, archiveProject, updateProject } =
    useProjects();
  const { entries } = useOrgWorkLogs();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [err, setErr] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editErr, setEditErr] = useState("");
  const [saving, setSaving] = useState(false);

  if (projects === null || entries === null) return null;

  const create = async () => {
    setErr("");
    if (!name.trim()) return setErr("Please enter a project name.");
    try {
      await createProject({ name: name.trim(), color, orgId: me.org_id });
      setName("");
      setColor(PRESET_COLORS[0]);
    } catch (e) {
      setErr(e.message || "Failed to create project.");
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditColor(p.color);
    setEditErr("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
    setEditErr("");
  };

  const saveEdit = async (id) => {
    setEditErr("");
    if (!editName.trim()) return setEditErr("Project name cannot be empty.");
    setSaving(true);
    try {
      await updateProject(id, { name: editName.trim(), color: editColor });
      cancelEdit();
    } catch (e) {
      setEditErr(e.message || "Failed to update project.");
    } finally {
      setSaving(false);
    }
  };

  const activeProjects = projects.filter((p) => !p.archived);
  const archivedProjects = projects.filter((p) => p.archived);

  const byProject = (projectId) =>
    entries.filter((e) => e.project_id === projectId);
  const uniqueContributors = (projectEntries) => [
    ...new Set(projectEntries.map((e) => e.employeeName).filter(Boolean)),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-5 fade-in">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-text">Project Tags</h1>
        <p className="text-xs text-text-muted mt-1">
          Create and assign project tags to organize team work logs and track time distribution.
        </p>
      </div>

      {/* NEW PROJECT CREATOR */}
      <Card
        title="Create New Project"
        subtitle="Define a project tag that team members can tag their daily tasks with."
      >
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
              Project Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile App Redesign, Riverside Fitout..."
              className="w-full border border-border rounded-xl px-3 py-2 text-xs sm:text-sm text-text bg-white outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
              Tag Color
            </label>
            <div className="flex gap-1.5 p-1 bg-surface-muted rounded-xl border border-border-light">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-lg transition-transform ${
                    color === c ? "ring-2 ring-text scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <button
            onClick={create}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus size={14} />
            <span>Create Project</span>
          </button>
        </div>

        {err && (
          <div className="mt-3 p-2.5 rounded-xl bg-alert-light text-alert text-xs flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" />
            <span>{err}</span>
          </div>
        )}
      </Card>

      {/* ACTIVE PROJECTS LIST */}
      <Card
        title="Active Projects"
        subtitle={`${activeProjects.length} active tag${
          activeProjects.length !== 1 ? "s" : ""
        }`}
      >
        {activeProjects.length === 0 ? (
          <EmptyState text="No projects created yet — use the form above to add your first tag." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeProjects.map((p) => {
              const isEditing = editingId === p.id;
              const projectEntries = byProject(p.id);
              const contributors = uniqueContributors(projectEntries);

              return (
                <div
                  key={p.id}
                  className="border border-border rounded-2xl p-4 bg-white shadow-xs hover:border-border-light transition-all flex flex-col justify-between"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                          Project Name
                        </label>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full border border-border rounded-xl px-2.5 py-1.5 text-xs text-text bg-white outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                          Color
                        </label>
                        <div className="flex gap-1.5">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditColor(c)}
                              className={`w-5 h-5 rounded-md transition-transform ${
                                editColor === c ? "ring-2 ring-text scale-110" : ""
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      {editErr && (
                        <p className="text-[11px] text-alert">{editErr}</p>
                      )}

                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                        <button
                          onClick={() => saveEdit(p.id)}
                          disabled={saving}
                          className="px-3 py-1.5 rounded-lg bg-success hover:bg-success-dark text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                        >
                          <Check size={12} strokeWidth={2.5} />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-lg shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          <h4 className="text-sm font-semibold text-text truncate">
                            {p.name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(p)}
                            title="Edit project"
                            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => archiveProject(p.id, true)}
                            title="Archive project"
                            className="p-1.5 rounded-lg text-text-muted hover:text-alert hover:bg-alert-light transition-colors"
                          >
                            <Archive size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-text-muted mb-3 flex items-center gap-2">
                        <span>
                          {projectEntries.length} log entr{projectEntries.length !== 1 ? "ies" : "y"}
                        </span>
                        <span>·</span>
                        <span>
                          {contributors.length} contributor{contributors.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {contributors.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border-light">
                          {contributors.map((cname) => (
                            <span
                              key={cname}
                              className="text-[10px] font-medium bg-surface-muted px-2 py-0.5 rounded-md text-text-muted border border-border-light"
                            >
                              {cname}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-text-faint italic pt-2 border-t border-border-light">
                          No logged entries yet
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ARCHIVED PROJECTS */}
      {archivedProjects.length > 0 && (
        <Card
          title="Archived Projects"
          subtitle={`${archivedProjects.length} archived tag${
            archivedProjects.length !== 1 ? "s" : ""
          }`}
        >
          <div className="divide-y divide-border-light">
            {archivedProjects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full opacity-40"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-text-muted line-through">{p.name}</span>
                </div>
                <button
                  onClick={() => archiveProject(p.id, false)}
                  title="Restore project"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-[11px] font-medium text-text hover:bg-surface-muted transition-colors"
                >
                  <ArchiveRestore size={12} />
                  <span>Restore</span>
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

import { useState } from "react";
import { Plus, Archive, ArchiveRestore, Pencil, Check, X } from "lucide-react";
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
    if (!name.trim()) return setErr("Enter a project name.");
    try {
      await createProject({ name: name.trim(), color, orgId: me.org_id });
      setName("");
    } catch (e) {
      setErr(e.message);
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
    if (!editName.trim()) return setEditErr("Name can't be empty.");
    setSaving(true);
    try {
      await updateProject(id, { name: editName.trim(), color: editColor });
      cancelEdit();
    } catch (e) {
      setEditErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const activeProjects = projects.filter((p) => !p.archived);
  const archivedProjects = projects.filter((p) => p.archived);

  const byProject = (projectId) =>
    entries.filter((e) => e.project_id === projectId);
  const uniqueContributors = (projectEntries) => [
    ...new Set(projectEntries.map((e) => e.employeeName)),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-text-muted mt-1">
          Create project tags and see who's working on what.
        </p>
      </div>

      <Card title="New project tag">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
          <div className="flex-1 w-full">
            <label className="block text-[11px] uppercase text-text-muted mb-1">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Riverside Office Fitout"
              className="w-full border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase text-text-muted mb-1">
              Color
            </label>
            <div className="flex gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 ${color === c ? "border-dark" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={create}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium flex items-center gap-1.5"
          >
            <Plus size={15} /> Create
          </button>
        </div>
        {err && <p className="text-[12px] text-alert mt-3">{err}</p>}
      </Card>

      <Card
        title="Active projects"
        subtitle={`${activeProjects.length} project${activeProjects.length !== 1 ? "s" : ""}`}
      >
        {activeProjects.length === 0 ? (
          <EmptyState text="No projects yet — create one above." />
        ) : (
          <div className="space-y-4">
            {activeProjects.map((p) => {
              const isEditing = editingId === p.id;
              const projectEntries = byProject(p.id);
              const contributors = uniqueContributors(projectEntries);

              return (
                <div
                  key={p.id}
                  className="border border-[#E8E3D8] rounded-xl p-4"
                >
                  {isEditing ? (
                    <div className="mb-2">
                      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end mb-2">
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] uppercase text-text-muted mb-1">
                            Name
                          </label>
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full border border-[#E4DFD3] rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-text-muted mb-1">
                            Color
                          </label>
                          <div className="flex gap-1.5">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c}
                                onClick={() => setEditColor(c)}
                                className={`w-6 h-6 rounded-full border-2 ${editColor === c ? "border-dark" : "border-transparent"}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => saveEdit(p.id)}
                            disabled={saving}
                            className="p-1.5 rounded-lg bg-success text-white disabled:opacity-50"
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-lg border border-[#E4DFD3]"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      {editErr && (
                        <p className="text-[11px] text-alert">{editErr}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="text-sm font-semibold">{p.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(p)}
                          title="Rename or recolor"
                          className="p-1.5 rounded-lg text-text-muted hover:bg-[#F5F3EE]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => archiveProject(p.id, true)}
                          title="Archive project"
                          className="p-1.5 rounded-lg text-text-muted hover:bg-[#F5F3EE]"
                        >
                          <Archive size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-text-muted mb-2">
                    {projectEntries.length} log entr
                    {projectEntries.length !== 1 ? "ies" : "y"} ·{" "}
                    {contributors.length} contributor
                    {contributors.length !== 1 ? "s" : ""}
                  </div>
                  {contributors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {contributors.map((cname) => (
                        <span
                          key={cname}
                          className="text-[11px] bg-[#F5F3EE] px-2 py-1 rounded-full"
                        >
                          {cname}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {archivedProjects.length > 0 && (
        <Card
          title="Archived projects"
          subtitle={`${archivedProjects.length} archived`}
        >
          <div className="divide-y divide-border">
            {archivedProjects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full opacity-50"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm text-text-muted">{p.name}</span>
                </div>
                <button
                  onClick={() => archiveProject(p.id, false)}
                  title="Restore project"
                  className="p-1.5 rounded-lg text-text-muted hover:bg-[#F5F3EE]"
                >
                  <ArchiveRestore size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

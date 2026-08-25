import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, ClipboardList } from "lucide-react";
import { todayISO } from "../../../utils/workTime";
import { Card } from "../../../components/Card";

export function TodaysWork({
  entries,
  addEntry,
  updateEntry,
  deleteEntry,
  projects,
  setErr,
  today,
}) {
  const [workText, setWorkText] = useState("");
  const [workProjectId, setWorkProjectId] = useState("");
  const [editingWorkId, setEditingWorkId] = useState(null);
  const [savingWork, setSavingWork] = useState(false);

  const activeProjects = projects.filter((p) => !p.archived);

  const todayWorkLogs = entries.filter((entry) => entry.date === today);

  const saveWork = async () => {
    const text = workText.trim();

    if (!text) return;

    setSavingWork(true);
    setErr("");

    try {
      if (editingWorkId) {
        await updateEntry(editingWorkId, text, workProjectId || null);
      } else {
        await addEntry(text, undefined, workProjectId || null);
      }

      setWorkText("");
      setWorkProjectId("");
      setEditingWorkId(null);
    } catch (error) {
      setErr(error.message);
    } finally {
      setSavingWork(false);
    }
  };

  const startEditWork = (entry) => {
    setEditingWorkId(entry.id);
    setWorkText(entry.entry_text);
    setWorkProjectId(entry.project_id || "");
  };

  const cancelWork = () => {
    setEditingWorkId(null);
    setWorkText("");
    setWorkProjectId("");
  };

  const removeWork = async (id) => {
    if (!window.confirm("Delete this work log?")) {
      return;
    }

    try {
      await deleteEntry(id);
    } catch (error) {
      setErr(error.message);
    }
  };

  return (
    <Card
      title="Today's work"
      subtitle={
        todayWorkLogs.length
          ? `${todayWorkLogs.length} logged`
          : "Nothing logged yet"
      }
    >
      {/* Compose bar */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 flex items-center gap-2 bg-[#F7F5F0] rounded-full pl-1.5 pr-1 py-1 border border-transparent focus-within:border-primary focus-within:bg-white transition-colors">
          <select
            value={workProjectId}
            onChange={(e) => setWorkProjectId(e.target.value)}
            className="bg-transparent text-xs rounded-full px-3 py-2 outline-none text-[#7A7362] w-24 sm:w-32 shrink-0"
          >
            <option value="">No tag</option>
            {activeProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <span className="w-px h-4 bg-[#DDD8CB] shrink-0" />

          <input
            value={workText}
            onChange={(e) => setWorkText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveWork();
            }}
            placeholder="What did you work on?"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none px-2 py-1.5"
          />
        </div>

        {editingWorkId && (
          <button
            onClick={cancelWork}
            title="Cancel edit"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#7A7362] hover:bg-[#F7F5F0] transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        )}

        <button
          onClick={saveWork}
          disabled={!workText.trim() || savingWork}
          title={editingWorkId ? "Update" : "Add"}
          className="w-9 h-9 rounded-full bg-primary hover:bg-[#345B69] active:scale-95 text-white flex items-center justify-center disabled:opacity-40 disabled:active:scale-100 transition-all shrink-0"
        >
          {editingWorkId ? <Check size={15} /> : <Plus size={15} />}
        </button>
      </div>

      {/* Entries — timeline feed */}
      {todayWorkLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="w-8 h-8 rounded-full bg-[#F7F5F0] flex items-center justify-center mb-1.5">
            <ClipboardList size={14} className="text-[#B6B0A2]" />
          </div>
          <p className="text-xs text-[#9A9383]">Nothing logged yet</p>
        </div>
      ) : (
        <div className="pl-1">
          {todayWorkLogs.map((entry, idx) => {
            const project = projects.find((p) => p.id === entry.project_id);
            const dotColor = project?.color || "#B6B0A2";
            const isLast = idx === todayWorkLogs.length - 1;

            return (
              <div
                key={entry.id}
                className="group relative pl-5 pb-2 last:pb-0"
              >
                {!isLast && (
                  <span className="absolute left-[6.5px] top-3.5 bottom-0 w-px bg-[#EDE9DF]" />
                )}
                <span
                  className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-white border-2"
                  style={{ borderColor: dotColor }}
                />

                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs leading-relaxed min-w-0 pt-0.5">
                    {project && (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 text-white align-middle"
                        style={{ backgroundColor: project.color }}
                      >
                        {project.name}
                      </span>
                    )}
                    {entry.entry_text}
                  </span>

                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => startEditWork(entry)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F7F5F0]"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => removeWork(entry.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F7F5F0] text-[#B5563A]"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

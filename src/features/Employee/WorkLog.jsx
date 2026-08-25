import { useState } from "react";
import {
  useAttendance,
  useWorkLogs,
  useProjects,
} from "../../hooks/useOrgData";
import {
  fmtDate,
  fmtTime,
  formatDuration,
  getWorkDifference,
  getWorkedMinutes,
  todayISO,
} from "../../utils/workTime";
import { Pencil, Trash2 } from "lucide-react";

export function EmployeeWorklog({ me }) {
  const { records } = useAttendance(me.id);
  const { entries, addEntry, updateEntry, deleteEntry } = useWorkLogs(me.id);
  const { projects } = useProjects();

  const [text, setText] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  if (records === null || entries === null || projects === null) {
    return null;
  }

  const activeProjects = projects.filter((p) => !p.archived);

  const dates = [
    ...new Set([...records.map((r) => r.date), ...entries.map((e) => e.date)]),
  ].sort((a, b) => new Date(b) - new Date(a));

  const saveEntry = async () => {
    const value = text.trim();
    if (!value) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateEntry(editingId, value, projectId || null);
      } else {
        await addEntry(value, selectedDate, projectId || null);
      }
      setText("");
      setProjectId("");
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (entry) => {
    setSelectedDate(entry.date);
    setEditingId(entry.id);
    setText(entry.entry_text);
    setProjectId(entry.project_id || "");
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Work Log</h1>
        <p className="text-xs text-text-muted mt-1">
          What you worked on and how long you worked
        </p>
      </div>

      {/* ADD WORK */}
      <div className="bg-white border border-[#E4DFD3] rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-medium">
              {editingId ? "Edit work log" : "Add work"}
            </div>
            <div className="text-[10px] text-text-subtle">
              Log work against a specific day
            </div>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-[#DDD8CB] rounded-lg px-2 py-1.5 text-xs"
          />
        </div>

        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full border border-[#DDD8CB] rounded-lg px-2.5 py-1.5 text-xs mb-2 bg-white"
        >
          <option value="">No project tag</option>
          {activeProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          {editingId &&
            (() => {
              const currentProject = projects.find((p) => p.id === projectId);
              const isArchivedAndNotListed = currentProject?.archived;
              return isArchivedAndNotListed ? (
                <option value={currentProject.id}>
                  {currentProject.name} (archived)
                </option>
              ) : null;
            })()}
        </select>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What did you work on?"
          rows={2}
          className="w-full border border-[#DDD8CB] rounded-lg px-3 py-2 text-sm resize-none"
        />

        <div className="flex gap-2 mt-2">
          <button
            onClick={saveEntry}
            disabled={!text.trim() || saving}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-40"
          >
            {saving ? "Saving..." : editingId ? "Update" : "Add work"}
          </button>
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setText("");
                setProjectId("");
              }}
              className="px-3 py-1.5 rounded-lg border border-[#DDD8CB] text-xs"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* HISTORY */}
      <div className="space-y-3">
        {dates.map((date) => {
          const attendance = records.find((r) => r.date === date);
          const dayEntries = entries.filter((e) => e.date === date);
          const worked = attendance?.clock_out
            ? getWorkedMinutes(attendance.clock_in, attendance.clock_out)
            : 0;
          const difference = attendance?.clock_out
            ? getWorkDifference(attendance.clock_in, attendance.clock_out)
            : 0;

          return (
            <div
              key={date}
              className="bg-white border border-[#E4DFD3] rounded-xl overflow-hidden"
            >
              <div className="px-4 py-3 bg-surface border-b border-border-light flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{fmtDate(date)}</div>
                  {attendance?.clock_in && (
                    <div className="text-[10px] text-[#8A8374] mt-0.5">
                      {fmtTime(attendance.clock_in)} {" → "}{" "}
                      {fmtTime(attendance.clock_out)}
                    </div>
                  )}
                </div>
                {attendance?.clock_out && (
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">
                      {formatDuration(worked)}
                    </div>
                    <div
                      className={`font-mono text-[10px] ${difference > 0 ? "text-success" : difference < 0 ? "text-alert" : "text-text-subtle"}`}
                    >
                      {difference > 0
                        ? `+${formatDuration(difference)} OT`
                        : difference < 0
                          ? `-${formatDuration(difference)} under`
                          : "8h target"}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3">
                {dayEntries.length === 0 ? (
                  <div className="text-xs text-text-subtle py-2">
                    No work logged for this day.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {dayEntries.map((entry) => {
                      const proj = projects.find(
                        (p) => p.id === entry.project_id,
                      );
                      return (
                        <div
                          key={entry.id}
                          className="group flex items-start justify-between gap-3 px-2 py-2 rounded-lg hover:bg-surface-muted"
                        >
                          <div className="flex gap-2 text-xs items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <span>
                              {proj && (
                                <span
                                  className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 text-white align-middle"
                                  style={{ backgroundColor: proj.color }}
                                >
                                  {proj.name}
                                </span>
                              )}
                              {entry.entry_text}
                            </span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => startEdit(entry)}
                              className="p-1.5"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="p-1.5 text-alert"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

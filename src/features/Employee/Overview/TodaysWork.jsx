import { useState } from "react";
import {
  Plus,
  Minus,
  Pencil,
  Trash2,
  Check,
  X,
  ClipboardList,
  Building2,
  MapPin,
} from "lucide-react";
import { todayISO } from "../../../utils/workTime";
import { Card } from "../../../components/Card";
import {
  parseWorkLogEntry,
  formatWorkLogEntryText,
} from "../../../utils/workType";
import { useOfficeHours } from "../../../constants/officeHours";

export function TodaysWork({
  entries,
  addEntry,
  updateEntry,
  deleteEntry,
  projects,
  setErr,
  today,
}) {
  const officeHours = useOfficeHours();
  const [workText, setWorkText] = useState("");
  const [workProjectId, setWorkProjectId] = useState("");
  const [workType, setWorkType] = useState("desk"); // 'desk' | 'site'
  const [siteHours, setSiteHours] = useState(2);
  const [isFullDay, setIsFullDay] = useState(false);
  const [editingWorkId, setEditingWorkId] = useState(null);
  const [savingWork, setSavingWork] = useState(false);

  const activeProjects = projects.filter((p) => !p.archived);

  const todayWorkLogs = entries.filter((entry) => entry.date === today);

  const adjustSiteHours = (delta) => {
    setIsFullDay(false);
    setSiteHours((prev) => {
      const next = Math.max(0.5, Math.min(12, Math.round((prev + delta) * 2) / 2));
      return next;
    });
  };

  const saveWork = async () => {
    const text = workText.trim();

    if (!text) return;

    setSavingWork(true);
    setErr("");

    try {
      const finalDuration = isFullDay ? "Full Day" : `${siteHours}h`;
      const formattedText = formatWorkLogEntryText(text, workType, finalDuration);
      if (editingWorkId) {
        await updateEntry({
          entryId: editingWorkId,
          text: formattedText,
          projectId: workProjectId || null,
          workType,
        });
      } else {
        await addEntry({
          text: formattedText,
          projectId: workProjectId || null,
          workType,
        });
      }

      setWorkText("");
      setWorkProjectId("");
      setWorkType("desk");
      setSiteHours(2);
      setIsFullDay(false);
      setEditingWorkId(null);
    } catch (error) {
      setErr(error.message);
    } finally {
      setSavingWork(false);
    }
  };

  const startEditWork = (entry) => {
    const parsed = parseWorkLogEntry(entry);
    setEditingWorkId(entry.id);
    setWorkText(parsed.cleanText);
    setWorkType(parsed.workType);

    if (parsed.workType === "site") {
      if (parsed.duration?.toLowerCase().includes("full")) {
        setIsFullDay(true);
        setSiteHours(officeHours.workDayHours);
      } else {
        setIsFullDay(false);
        const match = parsed.duration?.match(/(\d+(?:\.\d+)?)/);
        setSiteHours(match ? parseFloat(match[1]) : 2);
      }
    } else {
      setIsFullDay(false);
      setSiteHours(2);
    }

    setWorkProjectId(entry.project_id || "");
  };

  const cancelWork = () => {
    setEditingWorkId(null);
    setWorkText("");
    setWorkProjectId("");
    setWorkType("desk");
    setSiteHours(2);
    setIsFullDay(false);
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
      {/* Category selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center p-0.5 bg-surface-muted rounded-xl border border-border-light text-xs">
          <button
            type="button"
            onClick={() => setWorkType("desk")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              workType === "desk"
                ? "bg-white text-text shadow-xs border border-border/50"
                : "text-text-muted hover:text-text"
            }`}
          >
            <Building2 size={12} />
            <span>Desk Work</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkType("site")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              workType === "site"
                ? "bg-[#63537E] text-white shadow-xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            <MapPin size={12} />
            <span>Site Visit</span>
          </button>
        </div>

        {workType === "site" && (
          <div className="flex items-center gap-1.5 flex-wrap animate-fadeIn">
            {/* Number box with Stepper */}
            <div className="flex items-center bg-surface-muted border border-border-light rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                disabled={isFullDay || siteHours <= 0.5}
                onClick={() => adjustSiteHours(-0.5)}
                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white text-text-muted hover:text-text disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Decrease by 30 mins"
              >
                <Minus size={10} />
              </button>

              <div className="flex items-center px-1 font-mono text-xs">
                <input
                  type="number"
                  min="0.5"
                  max="12"
                  step="0.5"
                  disabled={isFullDay}
                  value={isFullDay ? officeHours.workDayHours : siteHours}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      setSiteHours(Math.min(12, Math.max(0.5, val)));
                      setIsFullDay(false);
                    }
                  }}
                  className="w-8 text-center font-bold text-text bg-transparent outline-none disabled:text-text-muted text-xs"
                />
                <span className="text-text-muted text-[10px] font-medium pr-0.5">h</span>
              </div>

              <button
                type="button"
                disabled={isFullDay || siteHours >= 12}
                onClick={() => adjustSiteHours(0.5)}
                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white text-text-muted hover:text-text disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Increase by 30 mins"
              >
                <Plus size={10} />
              </button>
            </div>

            {/* Quick Presets */}
            {[1, 2, 3, 4, 5].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  setSiteHours(h);
                  setIsFullDay(false);
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  !isFullDay && siteHours === h
                    ? "bg-[#EEEAF2] text-[#63537E] border border-[#63537E]/40 shadow-2xs"
                    : "bg-surface-muted/60 text-text-muted hover:text-text"
                }`}
              >
                {h}h
              </button>
            ))}

            {/* Full Day Toggle */}
            <button
              type="button"
              onClick={() => {
                if (isFullDay) {
                  setIsFullDay(false);
                } else {
                  setIsFullDay(true);
                  setSiteHours(officeHours.workDayHours);
                }
              }}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                isFullDay
                  ? "bg-[#63537E] text-white shadow-2xs"
                  : "bg-surface-muted/60 text-text-muted hover:text-text"
              }`}
            >
              Full Day ({officeHours.workDayHours}h)
            </button>
          </div>
        )}
      </div>

      {/* Compose bar */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 flex items-center gap-2 bg-surface-muted rounded-full pl-1.5 pr-1 py-1 border border-transparent focus-within:border-primary focus-within:bg-white transition-colors">
          <select
            value={workProjectId}
            onChange={(e) => setWorkProjectId(e.target.value)}
            className="bg-transparent text-xs rounded-full px-3 py-2 outline-none text-text-muted w-24 sm:w-32 shrink-0"
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
            placeholder={
              workType === "site"
                ? "What did you do during this site visit?"
                : "What did you work on?"
            }
            className="flex-1 min-w-0 bg-transparent text-sm outline-none px-2 py-1.5"
          />
        </div>

        {editingWorkId && (
          <button
            onClick={cancelWork}
            title="Cancel edit"
            className="w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:bg-surface-muted transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        )}

        <button
          onClick={saveWork}
          disabled={!workText.trim() || savingWork}
          title={editingWorkId ? "Update" : "Add"}
          className="w-9 h-9 rounded-full bg-primary hover:bg-primary-dark active:scale-95 text-white flex items-center justify-center disabled:opacity-40 disabled:active:scale-100 transition-all shrink-0"
        >
          {editingWorkId ? <Check size={15} /> : <Plus size={15} />}
        </button>
      </div>

      {/* Entries — timeline feed */}
      {todayWorkLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center mb-1.5">
            <ClipboardList size={14} className="text-text-faint" />
          </div>
          <p className="text-xs text-text-subtle">Nothing logged yet</p>
        </div>
      ) : (
        <div className="pl-1">
          {todayWorkLogs.map((entry, idx) => {
            const project = projects.find((p) => p.id === entry.project_id);
            const dotColor = project?.color || "#B6B0A2";
            const isLast = idx === todayWorkLogs.length - 1;
            const parsed = parseWorkLogEntry(entry);

            return (
              <div
                key={entry.id}
                className="group relative pl-5 pb-2 last:pb-0"
              >
                {!isLast && (
                  <span className="absolute left-[6.5px] top-3.5 bottom-0 w-px bg-border-light" />
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
                    {parsed.workType === "site" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#63537E] bg-[#EEEAF2] border border-[#63537E]/20 px-1.5 py-0.2 rounded mr-1.5 align-middle">
                        <MapPin size={9} /> Site
                        {parsed.duration && ` · ${parsed.duration}`}
                      </span>
                    )}
                    {parsed.cleanText}
                  </span>

                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => startEditWork(entry)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-muted"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => removeWork(entry.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-muted text-alert"
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

import { useState } from "react";
import {
  Plus,
  Trash2,
  Landmark,
  PartyPopper,
  Building2,
  Users,
  User,
  CalendarClock,
  Clock,
  Calendar,
  AlertCircle,
  Flag,
  Sparkles,
} from "lucide-react";
import { useHolidays, useEvents, useRoster } from "../../hooks/useOrgData";
import { Card } from "../../components/Card";
import { fmtDate, fmtTimeAmPm } from "../../utils/workTime";
import { isoToBSLabel } from "../../utils/nepaliCalendar";
import { NepaliDatePicker } from "../../components/NepaliDatePicker";

const HOLIDAY_CATEGORIES = [
  {
    value: "public",
    label: "Public Holiday",
    icon: Landmark,
    color: "#3D6B7D",
  },
  {
    value: "festival",
    label: "Festival (Observed)",
    icon: PartyPopper,
    color: "#B5563A",
  },
  {
    value: "company",
    label: "Company Day Off",
    icon: Building2,
    color: "#6B8F71",
  },
];

const EVENT_TYPES = [
  {
    value: "meeting",
    label: "Meeting (Petrol Teal)",
    icon: Users,
    color: "bg-[#EEF6F8] text-[#1E4E5F] border-[#C5DCE4]",
  },
  {
    value: "deadline",
    label: "Deadline (Red)",
    icon: Flag,
    color: "bg-alert-light text-alert border-alert/20",
  },
  {
    value: "other",
    label: "General Event",
    icon: Sparkles,
    color: "bg-warning-light text-warning border-warning/20",
  },
];

export function AdminCalendar({ me }) {
  const { holidays, addHoliday, deleteHoliday } = useHolidays();
  const { events, createEvent, deleteEvent } = useEvents();
  const { employees } = useRoster();

  const [tab, setTab] = useState("events"); // "events" | "holidays"

  // ---- holiday form state ----
  const [hDate, setHDate] = useState("");
  const [hName, setHName] = useState("");
  const [hCategory, setHCategory] = useState("public");
  const [hErr, setHErr] = useState("");

  // ---- event form state ----
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("meeting");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [allOrg, setAllOrg] = useState(true);
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [eErr, setEErr] = useState("");

  if (holidays === null || events === null || employees === null) return null;

  const addHolidayHandler = async () => {
    setHErr("");
    if (!hDate || !hName.trim()) {
      return setHErr("Please enter both a date and a holiday name.");
    }
    try {
      await addHoliday({
        date: hDate,
        name: hName.trim(),
        category: hCategory,
        orgId: me.org_id,
      });
      setHDate("");
      setHName("");
    } catch (e) {
      setHErr(e.message || "Failed to add holiday.");
    }
  };

  const toggleAssignee = (id) => {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const addEventHandler = async () => {
    setEErr("");
    if (!title.trim() || !date) {
      return setEErr("Please provide an event title and scheduled date.");
    }
    if (!allOrg && assigneeIds.length === 0) {
      return setEErr("Please select at least one assignee or mark for the whole office.");
    }
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim() || null,
        eventType,
        date,
        time: time || null,
        allOrg,
        assigneeIds,
        orgId: me.org_id,
        createdBy: me.id,
      });
      setTitle("");
      setDescription("");
      setDate("");
      setTime("");
      setAssigneeIds([]);
      setAllOrg(true);
    } catch (e) {
      setEErr(e.message || "Failed to create event.");
    }
  };

  const holidayCategoryMeta = (value) =>
    HOLIDAY_CATEGORIES.find((c) => c.value === value) || HOLIDAY_CATEGORIES[0];

  return (
    <div className="max-w-6xl mx-auto space-y-5 fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Calendar Manager</h1>
          <p className="text-xs text-text-muted mt-1">
            Schedule company-wide events, meetings, deadlines, and official holidays.
          </p>
        </div>

        {/* TABS SWITCHER */}
        <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-border-light text-xs">
          <button
            onClick={() => setTab("events")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              tab === "events"
                ? "bg-white text-text shadow-xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            Office Events ({events.length})
          </button>
          <button
            onClick={() => setTab("holidays")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              tab === "holidays"
                ? "bg-white text-text shadow-xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            Official Holidays ({holidays.length})
          </button>
        </div>
      </div>

      {tab === "events" && (
        <div className="space-y-4">
          {/* NEW EVENT FORM */}
          <Card
            title="Schedule New Event"
            subtitle="Add a meeting, deadline, or team gathering to the calendar."
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Event Title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Client Review — Riverside Project"
                    className="w-full border border-border rounded-xl px-3 py-2 text-xs sm:text-sm text-text bg-white outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Category
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-xs text-text bg-white outline-none focus:border-primary transition-colors"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Scheduled Date (B.S. / A.D.)
                  </label>
                  <NepaliDatePicker
                    value={date}
                    onChange={setDate}
                    placeholder="Pick calendar date"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-xs text-text bg-white outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                  Description / Agenda (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Meeting agenda, zoom links, or deliverables checklist..."
                  rows={2}
                  className="w-full border border-border rounded-xl px-3 py-2 text-xs text-text bg-white outline-none focus:border-primary resize-none transition-colors"
                />
              </div>

              {/* TARGET AUDIENCE */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                  Target Attendees
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setAllOrg(true)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      allOrg
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "border-border bg-white text-text-muted hover:text-text"
                    }`}
                  >
                    <Users size={13} />
                    <span>Whole Office</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllOrg(false)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      !allOrg
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "border-border bg-white text-text-muted hover:text-text"
                    }`}
                  >
                    <User size={13} />
                    <span>Specific Team Members</span>
                  </button>
                </div>

                {!allOrg && (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-surface-muted border border-border-light">
                    {employees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleAssignee(emp.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                          assigneeIds.includes(emp.id)
                            ? "bg-primary text-white border-primary"
                            : "bg-white border-border text-text-muted hover:text-text"
                        }`}
                      >
                        {emp.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {eErr && (
                <div className="p-2.5 rounded-xl bg-alert-light text-alert text-xs flex items-center gap-1.5">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{eErr}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={addEventHandler}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold shadow-xs transition-all"
                >
                  <Plus size={14} />
                  <span>Add Event</span>
                </button>
              </div>
            </div>
          </Card>

          {/* EVENTS LIST */}
          <Card
            title="Scheduled Events"
            subtitle={`${events.length} total event${events.length !== 1 ? "s" : ""}`}
          >
            {events.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                No events scheduled yet.
              </div>
            ) : (
              <div className="divide-y divide-border-light">
                {events
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((ev) => {
                    const isDeadline = ev.event_type === "deadline";
                    const isMeeting = ev.event_type === "meeting";

                    const badgeClass = isDeadline
                      ? "bg-alert-light text-alert border-alert/20 font-bold"
                      : isMeeting
                        ? "bg-[#EEF6F8] text-[#1E4E5F] border-[#C5DCE4] font-bold"
                        : "bg-warning-light text-warning border-warning/20 font-semibold";

                    const Icon = isDeadline
                      ? Flag
                      : isMeeting
                        ? Users
                        : CalendarClock;

                    return (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between py-3 gap-3 text-xs"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${badgeClass}`}
                          >
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-text truncate">
                                {ev.title}
                              </h4>
                              <span
                                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeClass}`}
                              >
                                {ev.event_type}
                              </span>
                            </div>

                          <div className="text-[11px] text-text-muted font-mono mt-0.5 flex flex-wrap items-center gap-2">
                            <span>{isoToBSLabel(ev.date)}</span>
                            <span>·</span>
                            <span>{fmtDate(ev.date)}</span>
                            {ev.time && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {fmtTimeAmPm(ev.time)}
                                </span>
                              </>
                            )}
                            <span>·</span>
                            <span className="font-sans">
                              {ev.all_org
                                ? "Whole office"
                                : (ev.event_assignees || [])
                                    .map((a) => a.profiles?.name)
                                    .join(", ") || "No assignees"}
                            </span>
                          </div>

                          {ev.description && (
                            <p className="text-xs text-text-muted mt-1 leading-relaxed">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => deleteEvent(ev.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-alert hover:bg-alert-light transition-colors shrink-0"
                        title="Delete event"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "holidays" && (
        <div className="space-y-4">
          {/* NEW HOLIDAY FORM */}
          <Card
            title="Add Official Holiday"
            subtitle="Define observed office holidays and festival dates."
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Holiday Date
                  </label>
                  <NepaliDatePicker
                    value={hDate}
                    onChange={setHDate}
                    placeholder="Select date"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Holiday / Festival Name
                  </label>
                  <input
                    value={hName}
                    onChange={(e) => setHName(e.target.value)}
                    placeholder="e.g. Dashain (Vijaya Dashami), New Year..."
                    className="w-full border border-border rounded-xl px-3 py-2 text-xs sm:text-sm text-text bg-white outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Category
                  </label>
                  <select
                    value={hCategory}
                    onChange={(e) => setHCategory(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-xs text-text bg-white outline-none focus:border-primary transition-colors"
                  >
                    {HOLIDAY_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {hErr && (
                <div className="p-2.5 rounded-xl bg-alert-light text-alert text-xs flex items-center gap-1.5">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{hErr}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={addHolidayHandler}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold shadow-xs transition-all"
                >
                  <Plus size={14} />
                  <span>Add Holiday</span>
                </button>
              </div>
            </div>
          </Card>

          {/* HOLIDAYS LIST */}
          <Card
            title="Official Holidays"
            subtitle={`${holidays.length} total registered holiday${
              holidays.length !== 1 ? "s" : ""
            }`}
          >
            {holidays.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                No holidays registered yet.
              </div>
            ) : (
              <div className="divide-y divide-border-light">
                {holidays
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((h) => {
                    const meta = holidayCategoryMeta(h.category);
                    const Icon = meta.icon;

                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between py-3 gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${meta.color}18`,
                              color: meta.color,
                            }}
                          >
                            <Icon size={15} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-text truncate">
                                {h.name}
                              </h4>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-muted text-text-muted border border-border-light">
                                {meta.label}
                              </span>
                            </div>

                            <div className="text-[11px] text-text-muted font-mono mt-0.5 flex items-center gap-2">
                              <span>{isoToBSLabel(h.date)}</span>
                              <span>·</span>
                              <span>{fmtDate(h.date)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteHoliday(h.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-alert hover:bg-alert-light transition-colors shrink-0"
                          title="Delete holiday"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

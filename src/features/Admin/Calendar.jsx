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
} from "lucide-react";
import { useHolidays, useEvents, useRoster } from "../../hooks/useOrgData";
import { Card } from "../../components/Card";
import { fmtDate } from "../../utils/workTime";
import { NepaliDatePicker } from "../../components/NepaliDatePicker";

const HOLIDAY_CATEGORIES = [
  {
    value: "public",
    label: "Public holiday",
    icon: Landmark,
    color: "#3D6B7D",
  },
  {
    value: "festival",
    label: "Festival (observed)",
    icon: PartyPopper,
    color: "#E0A458",
  },
  {
    value: "company",
    label: "Company day off",
    icon: Building2,
    color: "#6B8F71",
  },
];

const EVENT_TYPES = [
  { value: "meeting", label: "Meeting" },
  { value: "deadline", label: "Deadline" },
  { value: "other", label: "Other" },
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
    if (!hDate || !hName.trim())
      return setHErr("Enter both a date and a name.");
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
      setHErr(e.message);
    }
  };

  const toggleAssignee = (id) => {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const addEventHandler = async () => {
    setEErr("");
    if (!title.trim() || !date) return setEErr("Enter a title and date.");
    if (!allOrg && assigneeIds.length === 0)
      return setEErr("Pick at least one person, or mark it as whole office.");
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
      setEErr(e.message);
    }
  };

  const holidayCategoryMeta = (value) =>
    HOLIDAY_CATEGORIES.find((c) => c.value === value) || HOLIDAY_CATEGORIES[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-text-muted mt-1">
          Holidays, meetings, and deadlines for the whole office.
        </p>
      </div>

      <div className="flex gap-1 bg-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("events")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium ${tab === "events" ? "bg-white shadow-sm" : "text-text-muted"}`}
        >
          Events
        </button>
        <button
          onClick={() => setTab("holidays")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium ${tab === "holidays" ? "bg-white shadow-sm" : "text-text-muted"}`}
        >
          Holidays
        </button>
      </div>

      {tab === "events" && (
        <>
          <Card title="New event">
            <div className="grid md:grid-cols-2 gap-2 mb-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Client review — Riverside"
                className="border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm bg-white"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid md:grid-cols-2 gap-2 mb-2">
              <NepaliDatePicker
                value={date}
                onChange={setDate}
                placeholder="Select date"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
              rows={2}
              className="w-full border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm mb-3"
            />

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setAllOrg(true)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 ${allOrg ? "bg-primary text-white border-primary" : "border-[#E4DFD3] text-text-muted"}`}
              >
                <Users size={13} /> Whole office
              </button>
              <button
                onClick={() => setAllOrg(false)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 ${!allOrg ? "bg-primary text-white border-primary" : "border-[#E4DFD3] text-text-muted"}`}
              >
                <User size={13} /> Specific people
              </button>
            </div>

            {!allOrg && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => toggleAssignee(emp.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] border ${
                      assigneeIds.includes(emp.id)
                        ? "bg-primary text-white border-primary"
                        : "border-[#E4DFD3] text-text-muted"
                    }`}
                  >
                    {emp.name}
                  </button>
                ))}
              </div>
            )}

            {eErr && <p className="text-[12px] text-alert mb-2">{eErr}</p>}
            <button
              onClick={addEventHandler}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium flex items-center gap-1.5"
            >
              <Plus size={15} /> Add event
            </button>
          </Card>

          <Card
            title="Upcoming & past events"
            subtitle={`${events.length} total`}
          >
            {events.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted border border-dashed border-[#E4DFD3] rounded-lg">
                No events yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <CalendarClock size={13} />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{ev.title}</div>
                        <div className="text-[11px] text-text-muted font-mono">
                          {fmtDate(ev.date)}
                          {ev.time ? ` · ${ev.time}` : ""} · {ev.event_type}
                          {" · "}
                          {ev.all_org
                            ? "Whole office"
                            : (ev.event_assignees || [])
                                .map((a) => a.profiles?.name)
                                .join(", ") || "No one assigned"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="p-1.5 rounded-lg text-alert hover:bg-[#FDEDEA]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === "holidays" && (
        <>
          <Card title="Add a holiday">
            <div className="grid md:grid-cols-4 gap-2 mb-2">
              <NepaliDatePicker
                value={hDate}
                onChange={setHDate}
                placeholder="Select date"
              />
              <input
                value={hName}
                onChange={(e) => setHName(e.target.value)}
                placeholder="e.g. Dashain (Day 1)"
                className="md:col-span-2 border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={hCategory}
                onChange={(e) => setHCategory(e.target.value)}
                className="border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm bg-white"
              >
                {HOLIDAY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={addHolidayHandler}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium flex items-center gap-1.5"
            >
              <Plus size={15} /> Add holiday
            </button>
            {hErr && <p className="text-[12px] text-alert mt-2">{hErr}</p>}
          </Card>

          <Card title="All holidays" subtitle={`${holidays.length} total`}>
            {holidays.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted border border-dashed border-[#E4DFD3] rounded-lg">
                No holidays added yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {holidays.map((h) => {
                  const meta = holidayCategoryMeta(h.category);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${meta.color}1A`,
                            color: meta.color,
                          }}
                        >
                          <Icon size={13} />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{h.name}</div>
                          <div className="text-[11px] text-text-muted font-mono">
                            {fmtDate(h.date)} · {meta.label}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteHoliday(h.id)}
                        className="p-1.5 rounded-lg text-alert hover:bg-[#FDEDEA]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

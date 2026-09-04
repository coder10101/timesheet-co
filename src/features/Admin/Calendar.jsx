import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Lock,
  ChevronLeft,
  ChevronRight,
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
  X,
  Info,
} from "lucide-react";
import { useHolidays, useEvents, useRoster } from "../../hooks/useOrgData";
import { fmtDate, fmtTimeAmPm, todayISO } from "../../utils/workTime";
import {
  isoToBS,
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
  getTodayBS,
  addMonths,
  bsDateToISO,
  getDaysInBSMonth,
} from "../../utils/nepaliCalendar";
import bs from "bikram-sambat";
import { NepaliDatePicker } from "../../components/NepaliDatePicker";

export function AdminCalendar({ me }) {
  const { holidays, addHoliday, updateHoliday, deleteHoliday } = useHolidays();
  const { events, createEvent, updateEvent, deleteEvent } = useEvents();
  const { employees } = useRoster();

  const todayStr = todayISO();
  const isPastDate = (d) => !!d && d < todayStr;

  // Current viewed Nepali BS Month & Year (1-indexed month)
  const [viewBS, setViewBS] = useState(() => {
    const today = getTodayBS();
    return { year: today.year, month: today.month };
  });

  // Selected Day Modal State (for viewing all items on a day)
  const [selectedDay, setSelectedDay] = useState(null);

  // Event Modal State (Add or Edit)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eTitle, setETitle] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [eType, setEType] = useState("meeting");
  const [eDate, setEDate] = useState("");
  const [eTime, setETime] = useState("");
  const [eAllOrg, setEAllOrg] = useState(true);
  const [eAssigneeIds, setEAssigneeIds] = useState([]);
  const [eErr, setEErr] = useState("");
  const [savingE, setSavingE] = useState(false);

  // Holiday Modal State (Add or Edit)
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [hDate, setHDate] = useState("");
  const [hName, setHName] = useState("");
  const [hCategory, setHCategory] = useState("public");
  const [hErr, setHErr] = useState("");
  const [savingH, setSavingH] = useState(false);

  // BS Month Calculations
  const bsYear = viewBS.year;
  const bsMonth = viewBS.month; // 1-12
  const monthNameBS = NEPALI_MONTHS[bsMonth - 1];
  const totalBSDays = getDaysInBSMonth(bsYear, bsMonth);

  const startGreg = bs.toGreg(bsYear, bsMonth, 1);
  const startD = new Date(startGreg.year, startGreg.month - 1, startGreg.day);
  const firstWeekday = startD.getDay(); // 0 = Sun ... 6 = Sat

  const prevMonth = () => {
    setViewBS((prev) => addMonths(prev.year, prev.month, -1));
  };

  const nextMonth = () => {
    setViewBS((prev) => addMonths(prev.year, prev.month, 1));
  };

  // Calendar cells mapping (Called unconditionally before any early return)
  const calendarDays = useMemo(() => {
    const days = [];
    const holidayList = holidays || [];
    const eventList = events || [];

    // Empty lead cells
    for (let i = 0; i < firstWeekday; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }

    // Month days
    for (let d = 1; d <= totalBSDays; d++) {
      const isoDate = bsDateToISO(bsYear, bsMonth, d);
      const dayHolidays = holidayList.filter((h) => h.date === isoDate);
      const dayEvents = eventList.filter((e) => e.date === isoDate);
      const isToday = isoDate === todayStr;
      const isPast = isoDate < todayStr;
      const greg = bs.toGreg(bsYear, bsMonth, d);

      days.push({
        empty: false,
        dayNumBS: d,
        gregDay: greg.day,
        gregMonth: greg.month,
        isoDate,
        holidays: dayHolidays,
        events: dayEvents,
        isToday,
        isPast,
        key: isoDate,
      });
    }

    return days;
  }, [bsYear, bsMonth, totalBSDays, firstWeekday, holidays, events, todayStr]);

  if (holidays === null || events === null || employees === null) return null;

  // --- OPEN MODAL HANDLERS ---
  const openAddEvent = (initialDate = "") => {
    const targetDate = initialDate || todayStr;
    if (isPastDate(targetDate)) {
      setEErr("Cannot create events in past dates.");
    }
    setEditingEvent(null);
    setETitle("");
    setEDescription("");
    setEType("meeting");
    setEDate(targetDate >= todayStr ? targetDate : todayStr);
    setETime("");
    setEAllOrg(true);
    setEAssigneeIds([]);
    setEErr("");
    setIsEventModalOpen(true);
  };

  const openEditEvent = (ev) => {
    if (isPastDate(ev.date)) {
      alert("Past events cannot be edited.");
      return;
    }
    setEditingEvent(ev);
    setETitle(ev.title || "");
    setEDescription(ev.description || "");
    setEType(ev.event_type || "meeting");
    setEDate(ev.date || todayStr);
    setETime(ev.time || "");
    setEAllOrg(ev.all_org !== false);
    setEAssigneeIds(
      (ev.event_assignees || []).map((a) => a.employee_id).filter(Boolean),
    );
    setEErr("");
    setIsEventModalOpen(true);
  };

  const openAddHoliday = (initialDate = "") => {
    const targetDate = initialDate || todayStr;
    setEditingHoliday(null);
    setHName("");
    setHCategory("public");
    setHDate(targetDate >= todayStr ? targetDate : todayStr);
    setHErr("");
    setIsHolidayModalOpen(true);
  };

  const openEditHoliday = (h) => {
    if (isPastDate(h.date)) {
      alert("Past holidays cannot be edited.");
      return;
    }
    setEditingHoliday(h);
    setHName(h.name || "");
    setHCategory(h.category || "public");
    setHDate(h.date || todayStr);
    setHErr("");
    setIsHolidayModalOpen(true);
  };

  // --- SAVE HANDLERS ---
  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    setHErr("");

    if (!hDate || !hName.trim()) {
      return setHErr("Please enter both a date and a holiday name.");
    }

    if (isPastDate(hDate)) {
      return setHErr("Past dates cannot be selected for holidays.");
    }

    setSavingH(true);
    try {
      if (editingHoliday) {
        await updateHoliday({
          id: editingHoliday.id,
          date: hDate,
          name: hName.trim(),
          category: hCategory,
          orgId: me?.org_id || editingHoliday.org_id,
          oldDate: editingHoliday.date,
          oldName: editingHoliday.name,
        });
      } else {
        await addHoliday({
          date: hDate,
          name: hName.trim(),
          category: hCategory,
          orgId: me.org_id,
        });
      }
      setIsHolidayModalOpen(false);
    } catch (err) {
      setHErr(err.message || "Failed to save holiday.");
    } finally {
      setSavingH(false);
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setEErr("");

    if (!eTitle.trim() || !eDate) {
      return setEErr("Please provide an event title and scheduled date.");
    }

    if (isPastDate(eDate)) {
      return setEErr("Past dates cannot be selected for events.");
    }

    setSavingE(true);
    try {
      if (editingEvent) {
        await updateEvent({
          id: editingEvent.id,
          title: eTitle.trim(),
          description: eDescription.trim() || null,
          eventType: eType,
          date: eDate,
          time: eTime || null,
          allOrg: eAllOrg,
          assigneeIds: eAssigneeIds,
        });
      } else {
        await createEvent({
          title: eTitle.trim(),
          description: eDescription.trim() || null,
          eventType: eType,
          date: eDate,
          time: eTime || null,
          allOrg: eAllOrg,
          assigneeIds: eAssigneeIds,
          orgId: me.org_id,
          createdBy: me.id,
        });
      }
      setIsEventModalOpen(false);
    } catch (err) {
      setEErr(err.message || "Failed to save event.");
    } finally {
      setSavingE(false);
    }
  };

  const toggleAssignee = (id) => {
    setEAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Calendar</h1>
          <p className="text-xs text-text-muted">
            Manage company holidays, meetings, deadlines, and important office dates.
          </p>
        </div>

        <button
          onClick={() => openAddEvent(todayStr)}
          className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Add Event</span>
        </button>
      </div>

      {/* 2-COLUMN CALENDAR & HOLIDAYS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT / CENTER: NEPALI MONTH GRID CALENDAR */}
        <div className="lg:col-span-8 bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          {/* MONTH NAVIGATION & LEGEND */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-light">
            {/* MONTH SWITCHER */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text">
                  {monthNameBS} {bsYear}
                </h2>
              </div>

              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* LEGEND */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>Public</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span>Company</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary-dark" />
                <span>Meeting</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-alert" />
                <span>Deadline</span>
              </div>
            </div>
          </div>

          {/* WEEKDAY LABELS (SUN - SAT) */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <span className="text-alert">SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span className="text-warning">SAT</span>
          </div>

          {/* DAYS GRID */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDays.map((cell) => {
              if (cell.empty) {
                return (
                  <div
                    key={cell.key}
                    className="min-h-[72px] sm:min-h-[88px] p-1 rounded-xl bg-surface-muted/20 opacity-30"
                  />
                );
              }

              return (
                <div
                  key={cell.key}
                  onClick={() => setSelectedDay(cell)}
                  className={`group relative min-h-[72px] sm:min-h-[88px] p-1 sm:p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    cell.isToday
                      ? "border-primary bg-primary-light/40 ring-2 ring-primary/20 shadow-xs"
                      : cell.isPast
                        ? "border-border-light bg-surface-muted/40 hover:border-border"
                        : "border-border-light hover:border-primary/40 hover:bg-surface-muted/50 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* NEPALI BS DAY ONLY */}
                    <span
                      className={`text-xs font-bold font-mono ${
                        cell.isToday
                          ? "w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[11px]"
                          : cell.isPast
                            ? "text-text-muted"
                            : "text-text"
                      }`}
                    >
                      {cell.dayNumBS}
                    </span>
                  </div>

                  {/* PILLS */}
                  <div className="space-y-1 mt-1">
                    {cell.holidays.map((h) => (
                      <div
                        key={h.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!cell.isPast) openEditHoliday(h);
                          else setSelectedDay(cell);
                        }}
                        className={`text-[9px] sm:text-[10px] font-semibold px-1 sm:px-1.5 py-0.5 rounded truncate transition-transform hover:scale-[1.02] ${
                          h.category === "company"
                            ? "bg-success-light text-success border border-success/30"
                            : "bg-primary-light text-primary-dark border border-primary/20"
                        }`}
                        title={
                          cell.isPast
                            ? `${h.name} (Past - Read Only)`
                            : `${h.name} (Click to edit)`
                        }
                      >
                        {h.name}
                      </div>
                    ))}

                    {cell.events.map((ev) => {
                      const isMeeting = ev.event_type === "meeting";
                      const isDeadline = ev.event_type === "deadline";

                      const pillClass = isMeeting
                        ? "bg-primary-light text-primary-dark border border-primary/30"
                        : isDeadline
                          ? "bg-alert-light text-alert border border-alert/30"
                          : "bg-warning-light text-warning border border-warning/30";

                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!cell.isPast) openEditEvent(ev);
                            else setSelectedDay(cell);
                          }}
                          className={`text-[9px] sm:text-[10px] font-semibold px-1 sm:px-1.5 py-0.5 rounded truncate transition-transform hover:scale-[1.02] ${pillClass}`}
                          title={
                            cell.isPast
                              ? `${ev.title} (Past - Read Only)`
                              : `${ev.title} (Click to edit)`
                          }
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: PUBLIC & COMPANY HOLIDAYS LIST */}
        <div className="lg:col-span-4 bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-light">
            <h3 className="text-sm font-bold text-text">
              Holidays ({bsYear})
            </h3>
            <span className="text-xs text-text-muted font-mono font-medium">
              {holidays.length} listed
            </span>
          </div>

          {holidays.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              No holidays registered for {bsYear}.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {holidays
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((h) => {
                  const isPast = isPastDate(h.date);
                  const isCompany = h.category === "company";
                  const isFestival = h.category === "festival";
                  const dotColor = isCompany
                    ? "bg-success"
                    : isFestival
                      ? "bg-warning"
                      : "bg-primary";
                  const badgeClass = isCompany
                    ? "bg-success-light text-success border-success/30"
                    : isFestival
                      ? "bg-warning-light text-warning border-warning/30"
                      : "bg-primary-light text-primary-dark border-primary/20";

                  const bsDate = isoToBS(h.date);

                  return (
                    <div
                      key={h.id}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        isPast
                          ? "bg-surface-muted/30 border-border-light opacity-80"
                          : "bg-surface-muted/50 border-border-light hover:bg-surface-muted"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-text truncate">
                              {h.name}
                            </h4>
                            {isPast && (
                              <span className="text-[9px] text-text-muted bg-surface-muted px-1.5 py-0.2 rounded font-mono">
                                Past
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-text-muted mt-0.5">
                            {bsDate
                              ? `${bsDate.day} ${NEPALI_MONTHS[bsDate.month - 1]} ${bsDate.year}`
                              : h.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize ${badgeClass}`}
                        >
                          {h.category}
                        </span>

                        {isPast ? (
                          <div
                            className="p-1 text-text-faint"
                            title="Past holidays cannot be edited"
                          >
                            <Lock size={12} />
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditHoliday(h)}
                              className="p-1 text-text-muted hover:text-text rounded-lg hover:bg-surface-muted transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Edit Holiday"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete holiday "${h.name}"?`)) {
                                  deleteHoliday(h.id);
                                }
                              }}
                              className="p-1 text-text-muted hover:text-alert rounded-lg hover:bg-alert-light transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Delete Holiday"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* ADD HOLIDAY BUTTON */}
          <button
            onClick={() => openAddHoliday(todayStr)}
            className="w-full py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary-light/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      {/* DAY DETAILS MODAL (WHEN A DAY CELL IS CLICKED) */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden fade-in">
            {/* MODAL HEADER */}
            <div className="px-6 pt-5 pb-4 border-b border-border-light flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">
                  {selectedDay.dayNumBS} {monthNameBS} {bsYear}
                </h3>
                {selectedDay.isPast && (
                  <p className="text-xs text-alert font-mono mt-0.5">
                    Past Date · Archived
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {selectedDay.isPast && (
                <div className="p-3 rounded-xl bg-alert-light border border-alert/20 text-alert text-xs flex items-center gap-2.5">
                  <Info size={15} className="shrink-0 text-alert" />
                  <span>Past events and holidays are archived and cannot be edited.</span>
                </div>
              )}

              {/* LIST OF ITEMS ON THIS DAY */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  Scheduled on this date
                </h4>

                {selectedDay.holidays.length === 0 &&
                selectedDay.events.length === 0 ? (
                  <div className="py-6 text-center text-xs text-text-muted bg-surface-muted rounded-xl border border-dashed border-border">
                    No events or holidays scheduled for this date.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedDay.holidays.map((h) => (
                      <div
                        key={h.id}
                        className="p-3 rounded-xl border border-primary/20 bg-primary-light/40 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-text block truncate">
                            {h.name}
                          </span>
                          <span className="text-[10px] text-primary font-semibold capitalize">
                            {h.category} Holiday
                          </span>
                        </div>
                        {!selectedDay.isPast && (
                          <button
                            onClick={() => {
                              setSelectedDay(null);
                              openEditHoliday(h);
                            }}
                            className="p-1.5 text-primary hover:bg-primary-light rounded-lg cursor-pointer transition-colors"
                            title="Edit Holiday"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                      </div>
                    ))}

                    {selectedDay.events.map((ev) => {
                      const isMeeting = ev.event_type === "meeting";
                      const isDeadline = ev.event_type === "deadline";
                      const cardClass = isMeeting
                        ? "border-primary/20 bg-primary-light/40 text-text"
                        : isDeadline
                          ? "border-alert/20 bg-alert-light/40 text-text"
                          : "border-warning/20 bg-warning-light/40 text-text";

                      return (
                        <div
                          key={ev.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${cardClass}`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold truncate">
                                {ev.title}
                              </span>
                              {ev.time && (
                                <span className="text-[10px] font-mono opacity-70">
                                  ({fmtTimeAmPm(ev.time)})
                                </span>
                              )}
                            </div>
                            {ev.description && (
                              <p className="text-[11px] text-text-muted truncate mt-0.5">
                                {ev.description}
                              </p>
                            )}
                          </div>
                          {!selectedDay.isPast && (
                            <button
                              onClick={() => {
                                setSelectedDay(null);
                                openEditEvent(ev);
                              }}
                              className="p-1.5 hover:bg-black/5 rounded-lg cursor-pointer shrink-0 transition-colors"
                              title="Edit Event"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="px-6 py-4 bg-surface-muted border-t border-border-light flex items-center justify-end gap-2">
              {!selectedDay.isPast ? (
                <>
                  <button
                    onClick={() => {
                      const d = selectedDay.isoDate;
                      setSelectedDay(null);
                      openAddHoliday(d);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-border bg-white hover:bg-surface text-text text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                  >
                    <Plus size={13} />
                    <span>Add Holiday</span>
                  </button>
                  <button
                    onClick={() => {
                      const d = selectedDay.isoDate;
                      setSelectedDay(null);
                      openAddEvent(d);
                    }}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark active:scale-98 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Plus size={13} />
                    <span>Add Event</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="px-4 py-2 rounded-xl bg-surface border border-border text-text font-semibold text-xs cursor-pointer transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-border overflow-hidden fade-in">
            {/* MODAL HEADER */}
            <div className="px-6 pt-5 pb-4 border-b border-border-light flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">
                  {editingEvent ? "Edit Office Event" : "Schedule Office Event"}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Set meeting, deadline, or general office reminder.
                </p>
              </div>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent}>
              <div className="p-6 space-y-4">
                {/* EVENT TITLE */}
                <div>
                  <label className="text-xs font-semibold text-text block mb-1.5">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quarterly Review, Client Meeting, Board Presentation..."
                    value={eTitle}
                    onChange={(e) => setETitle(e.target.value)}
                    className="w-full bg-surface-muted border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-text placeholder:text-text-faint focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>

                {/* EVENT TYPE SELECTOR */}
                <div>
                  <label className="text-xs font-semibold text-text block mb-1.5">
                    Event Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEType("meeting")}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        eType === "meeting"
                          ? "bg-primary-light border-primary/40 text-primary-dark ring-2 ring-primary/20 shadow-2xs font-bold"
                          : "bg-surface-muted border-border text-text-muted hover:bg-white"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span>Meeting</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEType("deadline")}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        eType === "deadline"
                          ? "bg-alert-light border-alert/40 text-alert ring-2 ring-alert/20 shadow-2xs font-bold"
                          : "bg-surface-muted border-border text-text-muted hover:bg-white"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-alert shrink-0" />
                      <span>Deadline</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEType("other")}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        eType === "other"
                          ? "bg-warning-light border-warning/40 text-warning ring-2 ring-warning/20 shadow-2xs font-bold"
                          : "bg-surface-muted border-border text-text-muted hover:bg-white"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
                      <span>General</span>
                    </button>
                  </div>
                </div>

                {/* DATE & TIME (SIDE BY SIDE) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text block mb-1.5">
                      Scheduled Date (Nepali B.S.)
                    </label>
                    <NepaliDatePicker
                      value={eDate}
                      onChange={setEDate}
                      placeholder="Pick Nepali date"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-text block mb-1.5">
                      Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={eTime}
                      onChange={(e) => setETime(e.target.value)}
                      className="w-full h-10 bg-surface-muted border border-border rounded-xl px-3.5 text-xs text-text focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* DESCRIPTION / AGENDA */}
                <div>
                  <label className="text-xs font-semibold text-text block mb-1.5">
                    Description / Agenda (Optional)
                  </label>
                  <textarea
                    value={eDescription}
                    onChange={(e) => setEDescription(e.target.value)}
                    placeholder="Discussion points, agenda, venue, notes..."
                    rows={2}
                    className="w-full bg-surface-muted border border-border rounded-xl p-3 text-xs sm:text-sm text-text placeholder:text-text-faint focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
                  />
                </div>

                {/* TARGET ATTENDEES */}
                <div>
                  <label className="text-xs font-semibold text-text block mb-1.5">
                    Target Attendees
                  </label>
                  <div className="flex gap-2 mb-2 bg-surface-muted p-1 rounded-xl border border-border-light">
                    <button
                      type="button"
                      onClick={() => setEAllOrg(true)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        eAllOrg
                          ? "bg-primary text-white shadow-xs font-bold"
                          : "text-text-muted hover:text-text"
                      }`}
                    >
                      <Users size={13} />
                      <span>Whole Office</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEAllOrg(false)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        !eAllOrg
                          ? "bg-primary text-white shadow-xs font-bold"
                          : "text-text-muted hover:text-text"
                      }`}
                    >
                      <User size={13} />
                      <span>Specific Members</span>
                    </button>
                  </div>

                  {!eAllOrg && (
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-surface-muted border border-border max-h-28 overflow-y-auto">
                      {employees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => toggleAssignee(emp.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border cursor-pointer ${
                            eAssigneeIds.includes(emp.id)
                              ? "bg-primary text-white border-primary shadow-2xs font-semibold"
                              : "bg-white border-border text-text-muted hover:border-text-subtle"
                          }`}
                        >
                          {emp.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {eErr && (
                  <div className="p-3 rounded-xl bg-alert-light border border-alert/20 text-alert text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{eErr}</span>
                  </div>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div className="px-6 py-4 bg-surface-muted border-t border-border-light flex items-center justify-between">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`Delete event "${editingEvent.title}"?`)) {
                        await deleteEvent(editingEvent.id);
                        setIsEventModalOpen(false);
                      }
                    }}
                    className="px-3 py-2 rounded-xl text-alert hover:bg-alert-light font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface cursor-pointer font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingE || !eTitle.trim() || !eDate}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark active:scale-98 text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {savingE
                      ? "Saving..."
                      : editingEvent
                        ? "Save Changes"
                        : "Add Event"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT HOLIDAY MODAL */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-border overflow-hidden fade-in">
            {/* MODAL HEADER */}
            <div className="px-6 pt-5 pb-4 border-b border-border-light flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">
                  {editingHoliday ? "Edit Holiday" : "Add Holiday"}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Official public, festival, or company day off.
                </p>
              </div>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text block mb-1.5">
                    Holiday Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dashain, Tihar, Buddha Jayanti, Constitution Day..."
                    value={hName}
                    onChange={(e) => setHName(e.target.value)}
                    className="w-full bg-surface-muted border border-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-text placeholder:text-text-faint focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                </div>

                {/* CATEGORY (CLEAN PILLS) */}
                <div>
                  <label className="text-xs font-semibold text-text block mb-1.5">
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setHCategory("public")}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        hCategory === "public"
                          ? "bg-primary-light border-primary/40 text-primary-dark ring-2 ring-primary/20 shadow-2xs font-bold"
                          : "bg-surface-muted border-border text-text-muted hover:bg-white"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span>Public</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHCategory("company")}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        hCategory === "company"
                          ? "bg-success-light border-success/40 text-success ring-2 ring-success/20 shadow-2xs font-bold"
                          : "bg-surface-muted border-border text-text-muted hover:bg-white"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                      <span>Company</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHCategory("festival")}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        hCategory === "festival"
                          ? "bg-warning-light border-warning/40 text-warning ring-2 ring-warning/20 shadow-2xs font-bold"
                          : "bg-surface-muted border-border text-text-muted hover:bg-white"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
                      <span>Festival</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text block mb-1.5">
                    Date (Nepali B.S.)
                  </label>
                  <NepaliDatePicker
                    value={hDate}
                    onChange={setHDate}
                    placeholder="Pick Nepali date"
                  />
                </div>

                {hErr && (
                  <div className="p-3 rounded-xl bg-alert-light border border-alert/20 text-alert text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{hErr}</span>
                  </div>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div className="px-6 py-4 bg-surface-muted border-t border-border-light flex items-center justify-between">
                {editingHoliday ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`Delete holiday "${editingHoliday.name}"?`)) {
                        await deleteHoliday(editingHoliday.id);
                        setIsHolidayModalOpen(false);
                      }
                    }}
                    className="px-3 py-2 rounded-xl text-alert hover:bg-alert-light font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsHolidayModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface cursor-pointer font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingH || !hName.trim() || !hDate}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark active:scale-98 text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {savingH
                      ? "Saving..."
                      : editingHoliday
                        ? "Save Changes"
                        : "Add Holiday"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  ArrowRight,
  Clock,
  PartyPopper,
  Sun,
  Users,
  Flag,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import {
  NEPALI_MONTHS,
  WEEKDAY_LABELS,
  getTodayBS,
  buildMonthGrid,
  addMonths,
  isoToBS,
  isoToBSLabel,
} from "../../utils/nepaliCalendar";
import { useHolidays, useEvents, useLeaveRequests } from "../../hooks/useOrgData";
import { Card } from "../../components/Card";
import { fmtDate, fmtTimeAmPm, todayISO } from "../../utils/workTime";

export function EmployeeCalendar({ me }) {
  const todayBS = useMemo(() => getTodayBS(), []);
  const today = todayISO();

  const [view, setView] = useState({
    year: todayBS.year,
    month: todayBS.month,
  });

  const [selectedDate, setSelectedDate] = useState(today);
  const [feedFilter, setFeedFilter] = useState("all"); // "all" | "deadlines" | "meetings" | "holidays" | "leaves"

  const { holidays } = useHolidays();
  const { events } = useEvents();
  const { requests: myLeaves } = useLeaveRequests(me?.id, "mine");

  // Approved leave dates map
  const approvedLeavesByIso = useMemo(() => {
    const map = new Map();
    (myLeaves || [])
      .filter((r) => r.status === "Approved")
      .forEach((r) => {
        const [sy, sm, sd] = r.start_date.split("-").map(Number);
        const [ey, em, ed] = r.end_date.split("-").map(Number);
        const start = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);
        const cur = new Date(start);
        while (cur <= end) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, "0");
          const d = String(cur.getDate()).padStart(2, "0");
          map.set(`${y}-${m}-${d}`, r);
          cur.setDate(cur.getDate() + 1);
        }
      });
    return map;
  }, [myLeaves]);

  const holidaysByIso = useMemo(() => {
    const map = {};
    (holidays || []).forEach((h) => {
      map[h.date] = h.name;
    });
    return map;
  }, [holidays]);

  const eventsByIso = useMemo(() => {
    const map = {};
    (events || []).forEach((e) => {
      (map[e.date] ||= []).push({
        id: e.id,
        title: e.title,
        event_type: e.event_type || "meeting",
        time: e.time,
        description: e.description,
        all_org: e.all_org,
        event_assignees: e.event_assignees,
      });
    });
    return map;
  }, [events]);

  const weeks = useMemo(
    () => buildMonthGrid(view.year, view.month, holidaysByIso, eventsByIso),
    [view, holidaysByIso, eventsByIso],
  );

  const flatCells = useMemo(() => weeks.flat(), [weeks]);

  // Selected cell data
  const selectedCell = useMemo(() => {
    if (!selectedDate) return null;
    return (
      flatCells.find((cell) => cell?.isoDate === selectedDate) || {
        isoDate: selectedDate,
        bsDay: isoToBS(selectedDate).day,
        holidayName: holidaysByIso[selectedDate] || null,
        events: eventsByIso[selectedDate] || [],
      }
    );
  }, [selectedDate, flatCells, holidaysByIso, eventsByIso]);

  const selectedHoliday = useMemo(() => {
    return (holidays || []).find((h) => h.date === selectedDate);
  }, [holidays, selectedDate]);

  const selectedLeave = useMemo(() => {
    return approvedLeavesByIso.get(selectedDate);
  }, [approvedLeavesByIso, selectedDate]);

  const selectedEvents = useMemo(() => {
    return eventsByIso[selectedDate] || [];
  }, [eventsByIso, selectedDate]);

  const selectedMeetings = useMemo(() => {
    return selectedEvents.filter((e) => e.event_type === "meeting");
  }, [selectedEvents]);

  const selectedDeadlines = useMemo(() => {
    return selectedEvents.filter((e) => e.event_type === "deadline");
  }, [selectedEvents]);

  const selectedOtherEvents = useMemo(() => {
    return selectedEvents.filter(
      (e) => e.event_type !== "meeting" && e.event_type !== "deadline",
    );
  }, [selectedEvents]);

  // Upcoming items feed
  const upcomingFeed = useMemo(() => {
    const list = [];

    // Holidays
    (holidays || [])
      .filter((h) => h.date >= today)
      .forEach((h) => {
        list.push({
          id: `holiday-${h.id || h.date}`,
          date: h.date,
          time: null,
          title: h.name,
          category: "holiday",
          meta: h,
        });
      });

    // Events (Meetings, Deadlines, Other)
    (events || [])
      .filter((e) => e.date >= today)
      .forEach((e) => {
        const cat =
          e.event_type === "deadline"
            ? "deadline"
            : e.event_type === "meeting"
              ? "meeting"
              : "event";
        list.push({
          id: `event-${e.id}`,
          date: e.date,
          time: e.time,
          title: e.title,
          category: cat,
          meta: e,
        });
      });

    // Approved leaves
    (myLeaves || [])
      .filter((l) => l.status === "Approved" && l.end_date >= today)
      .forEach((l) => {
        list.push({
          id: `leave-${l.id}`,
          date: l.start_date,
          time: null,
          title: `${l.type} Leave (${l.days} days)`,
          category: "leave",
          meta: l,
        });
      });

    return list
      .filter((item) => {
        if (feedFilter === "all") return true;
        if (feedFilter === "deadlines") return item.category === "deadline";
        if (feedFilter === "meetings") return item.category === "meeting";
        if (feedFilter === "holidays") return item.category === "holiday";
        if (feedFilter === "leaves") return item.category === "leave";
        return true;
      })
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.time || "").localeCompare(b.time || ""),
      )
      .slice(0, 8);
  }, [holidays, events, myLeaves, today, feedFilter]);

  const jumpToDate = (iso) => {
    const bs = isoToBS(iso);
    setView({ year: bs.year, month: bs.month });
    setSelectedDate(iso);
  };

  const jumpToToday = () => {
    const bs = getTodayBS();
    setView({ year: bs.year, month: bs.month });
    setSelectedDate(today);
  };

  const relativeDayLabel = (isoDate) => {
    const [ey, em, ed] = isoDate.split("-").map(Number);
    const [ty, tm, td] = today.split("-").map(Number);
    const eventDate = new Date(ey, em - 1, ed);
    const todayDate = new Date(ty, tm - 1, td);
    const diffDays = Math.round(
      (eventDate.getTime() - todayDate.getTime()) / 86400000,
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 6) return `In ${diffDays} days`;
    return fmtDate(isoDate);
  };

  if (holidays === null || events === null || myLeaves === null) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 fade-in">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Calendar
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Official holidays, meetings, project deadlines, and your approved
            leaves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={jumpToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-surface-muted text-xs font-semibold text-text transition-colors shadow-xs"
          >
            <CalendarDays size={13} className="text-primary" />
            <span>Today</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
        {/* LEFT COLUMN: INTERACTIVE NEPALI CALENDAR */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-xs space-y-4">
          {/* MONTH NAVIGATION BAR */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView(addMonths(view.year, view.month, -1))}
              className="p-1.5 rounded-xl border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="text-center">
              <h2 className="text-base font-semibold text-text">
                {NEPALI_MONTHS[view.month - 1]} {view.year}
              </h2>
              <p className="text-[11px] text-text-muted">Bikram Sambat</p>
            </div>

            <button
              onClick={() => setView(addMonths(view.year, view.month, 1))}
              className="p-1.5 rounded-xl border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* WEEKDAYS HEADER */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((label, idx) => (
              <div
                key={label}
                className={`text-[11px] font-semibold uppercase tracking-wider py-1 ${
                  idx === 6
                    ? "text-alert"
                    : idx === 0
                      ? "text-primary"
                      : "text-text-muted"
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* CALENDAR DAYS GRID */}
          <div className="grid grid-cols-7 gap-1.5">
            {weeks.flat().map((cell, i) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[72px] sm:min-h-[82px] rounded-xl bg-surface-muted/30 border border-transparent"
                  />
                );
              }

              const isToday = cell.isoDate === today;
              const isSelected = cell.isoDate === selectedDate;
              const isHoliday = !!cell.holidayName;
              const isLeave = approvedLeavesByIso.has(cell.isoDate);
              const isSaturday = cell.isWeekend;

              const cellEvents = cell.events || [];
              const cellDeadlines = cellEvents.filter(
                (e) => e.event_type === "deadline",
              );
              const cellMeetings = cellEvents.filter(
                (e) => e.event_type === "meeting",
              );
              const cellOtherEvents = cellEvents.filter(
                (e) =>
                  e.event_type !== "deadline" && e.event_type !== "meeting",
              );

              const hasDeadline = cellDeadlines.length > 0;
              const hasMeeting = cellMeetings.length > 0;
              const hasOther = cellOtherEvents.length > 0;

              // Gregorian date day number
              const [gy, gm, gd] = cell.isoDate.split("-").map(Number);
              const gregDay = new Date(gy, gm - 1, gd).getDate();

              return (
                <button
                  key={cell.isoDate}
                  onClick={() => setSelectedDate(cell.isoDate)}
                  className={`
                    relative min-h-[72px] sm:min-h-[82px] rounded-xl p-1.5
                    flex flex-col justify-between items-start
                    border text-left transition-all
                    ${
                      isSelected
                        ? "border-primary bg-primary-light/40 ring-2 ring-primary/30 shadow-xs"
                        : isToday
                          ? "border-primary/60 bg-primary-light/20 ring-1 ring-primary/20"
                          : hasDeadline
                            ? "border-alert/30 bg-[#FFF7F5] hover:border-alert/50"
                            : hasMeeting
                              ? "border-[#1E4E5F]/30 bg-[#EEF6F8]/50 hover:border-[#1E4E5F]/50"
                              : isHoliday
                                ? "border-alert/20 bg-alert-light/30 hover:border-alert/40"
                                : isLeave
                                  ? "border-primary/20 bg-primary-light/20 hover:border-primary/40"
                                  : "border-border-light bg-white hover:border-border hover:bg-surface-muted/40"
                    }
                  `}
                >
                  {/* TOP ROW: BS DAY & GREGORIAN DAY */}
                  <div className="w-full flex items-start justify-between">
                    <span
                      className={`font-mono text-xs sm:text-sm font-bold ${
                        isToday
                          ? "text-primary"
                          : hasDeadline
                            ? "text-alert"
                            : isHoliday || isSaturday
                              ? "text-alert"
                              : "text-text"
                      }`}
                    >
                      {cell.bsDay}
                    </span>

                    <span className="font-mono text-[9px] text-text-faint">
                      {gregDay}
                    </span>
                  </div>

                  {/* EVENT CHIPS / LABELS IN CELL */}
                  <div className="w-full space-y-1 my-1">
                    {/* DEADLINE CHIP */}
                    {hasDeadline && (
                      <div
                        className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-alert-light text-alert border border-alert/20 text-[8px] font-bold truncate leading-tight shadow-2xs"
                        title={`Deadline: ${cellDeadlines[0].title}`}
                      >
                        <Flag size={7} className="shrink-0 text-alert" />
                        <span className="truncate">
                          {cellDeadlines[0].title}
                        </span>
                      </div>
                    )}

                    {/* MEETING CHIP */}
                    {hasMeeting && !hasDeadline && (
                      <div
                        className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-[#EEF6F8] text-[#1E4E5F] border border-[#C5DCE4] text-[8px] font-bold truncate leading-tight shadow-2xs"
                        title={`Meeting: ${cellMeetings[0].title}`}
                      >
                        <Users size={7} className="shrink-0 text-[#1E4E5F]" />
                        <span className="truncate">
                          {cellMeetings[0].title}
                        </span>
                      </div>
                    )}

                    {/* HOLIDAY CHIP (if no meeting/deadline shown) */}
                    {isHoliday && !hasDeadline && !hasMeeting && (
                      <div
                        className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-alert-light/60 text-alert border border-alert/20 text-[8px] font-semibold truncate leading-tight"
                        title={cell.holidayName}
                      >
                        <PartyPopper size={7} className="shrink-0" />
                        <span className="truncate">{cell.holidayName}</span>
                      </div>
                    )}

                    {/* LEAVE CHIP */}
                    {isLeave &&
                      !isHoliday &&
                      !hasDeadline &&
                      !hasMeeting && (
                        <div
                          className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-primary-light text-primary border border-primary/20 text-[8px] font-semibold truncate leading-tight"
                          title="Approved Leave"
                        >
                          <Sun size={7} className="shrink-0" />
                          <span className="truncate">Leave</span>
                        </div>
                      )}
                  </div>

                  {/* BOTTOM INDICATOR DOTS */}
                  <div className="w-full flex items-center gap-1 overflow-hidden mt-auto pt-0.5">
                    {hasDeadline && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-alert shrink-0"
                        title="Deadline"
                      />
                    )}
                    {hasMeeting && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#1E4E5F] shrink-0"
                        title="Meeting"
                      />
                    )}
                    {hasOther && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-warning shrink-0"
                        title="Event"
                      />
                    )}
                    {isHoliday && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-alert shrink-0"
                        title={cell.holidayName}
                      />
                    )}
                    {isLeave && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                        title="Approved Leave"
                      />
                    )}
                    {isToday && (
                      <span className="text-[7px] uppercase tracking-wide font-bold text-primary ml-auto">
                        Today
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* LEGEND BAR */}
          <div className="pt-3 border-t border-border-light flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-text-muted">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-primary-light" />
              Today
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-alert" />
              Holiday / Sat
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-alert" />
              <Flag size={10} className="text-alert" />
              Deadline (Red)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1E4E5F]" />
              <Users size={10} className="text-[#1E4E5F]" />
              Meeting (Petrol Teal)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              Leave
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: SELECTED DATE BREAKDOWN & UPCOMING FEED */}
        <div className="space-y-4">
          <Card
            title={
              selectedDate ? (
                <div className="flex items-center gap-2">
                  <span>{isoToBSLabel(selectedDate)}</span>
                </div>
              ) : (
                "Date Details"
              )
            }
            subtitle={
              selectedDate ? `${fmtDate(selectedDate)} (Gregorian)` : ""
            }
          >
            <div className="space-y-3">
              {/* HOLIDAY BANNER */}
              {selectedHoliday && (
                <div className="p-3 rounded-xl bg-alert-light border border-alert/20 text-alert flex items-start gap-2.5">
                  <PartyPopper size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold">
                      {selectedHoliday.name}
                    </h4>
                    <p className="text-[11px] text-alert/80 mt-0.5">
                      Public / Observed Office Holiday
                    </p>
                  </div>
                </div>
              )}

              {/* APPROVED LEAVE BANNER */}
              {selectedLeave && (
                <div className="p-3 rounded-xl bg-primary-light border border-primary/20 text-primary flex items-start gap-2.5">
                  <Sun size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold">
                      Approved {selectedLeave.type} Leave
                    </h4>
                    <p className="text-[11px] text-primary/80 mt-0.5">
                      {selectedLeave.days} day
                      {selectedLeave.days !== 1 ? "s" : ""} ·{" "}
                      {fmtDate(selectedLeave.start_date)} to{" "}
                      {fmtDate(selectedLeave.end_date)}
                    </p>
                    {selectedLeave.reason && (
                      <p className="text-[11px] italic mt-1 bg-white/50 px-2 py-0.5 rounded">
                        "{selectedLeave.reason}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* DEADLINES SECTION (CRIMSON/RED) */}
              {selectedDeadlines.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-alert flex items-center gap-1.5">
                    <Flag size={12} className="text-alert" />
                    <span>Deadlines ({selectedDeadlines.length})</span>
                  </h4>
                  {selectedDeadlines.map((dl) => (
                    <div
                      key={dl.id}
                      className="p-3 rounded-xl bg-[#FFF6F4] border border-[#FCD9D1] text-text space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-alert text-white">
                            Deadline
                          </span>
                          <span className="text-xs font-bold text-text">
                            {dl.title}
                          </span>
                        </div>

                        {dl.time && (
                          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-alert bg-white px-2 py-0.5 rounded-full border border-alert/20">
                            <Clock size={10} />
                            Due {fmtTimeAmPm(dl.time)}
                          </span>
                        )}
                      </div>

                      {dl.description && (
                        <p className="text-xs text-text-muted leading-relaxed">
                          {dl.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-text-muted pt-0.5">
                        <Users size={11} className="text-text-subtle" />
                        <span>
                          {dl.all_org
                            ? "Whole office"
                            : (dl.event_assignees || [])
                                .map((a) => a.profiles?.name)
                                .join(", ") || "Assigned team members"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MEETINGS SECTION (PETROL TEAL) */}
              {selectedMeetings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#1E4E5F] flex items-center gap-1.5">
                    <Users size={12} className="text-[#1E4E5F]" />
                    <span>Meetings ({selectedMeetings.length})</span>
                  </h4>
                  {selectedMeetings.map((mt) => (
                    <div
                      key={mt.id}
                      className="p-3 rounded-xl bg-[#EEF6F8] border border-[#C5DCE4] text-text space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#1E4E5F] text-white">
                            Meeting
                          </span>
                          <span className="text-xs font-bold text-text">
                            {mt.title}
                          </span>
                        </div>

                        {mt.time && (
                          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#1E4E5F] bg-white px-2 py-0.5 rounded-full border border-[#C5DCE4]">
                            <Clock size={10} />
                            {fmtTimeAmPm(mt.time)}
                          </span>
                        )}
                      </div>

                      {mt.description && (
                        <p className="text-xs text-text-muted leading-relaxed">
                          {mt.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-text-muted pt-0.5">
                        <Users size={11} className="text-text-subtle" />
                        <span>
                          {mt.all_org
                            ? "Whole office"
                            : (mt.event_assignees || [])
                                .map((a) => a.profiles?.name)
                                .join(", ") || "Assigned team members"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* OTHER EVENTS SECTION */}
              {selectedOtherEvents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-warning flex items-center gap-1.5">
                    <Sparkles size={12} className="text-warning" />
                    <span>Other Events ({selectedOtherEvents.length})</span>
                  </h4>
                  {selectedOtherEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl bg-warning-light border border-warning/20 text-text space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-warning text-white">
                            Event
                          </span>
                          <span className="text-xs font-bold text-text">
                            {ev.title}
                          </span>
                        </div>

                        {ev.time && (
                          <span className="text-[10px] font-mono font-bold text-warning bg-white px-2 py-0.5 rounded-full border border-warning/20">
                            {fmtTimeAmPm(ev.time)}
                          </span>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-xs text-text-muted leading-relaxed">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* EMPTY DAY NOTE */}
              {!selectedHoliday &&
                !selectedLeave &&
                selectedEvents.length === 0 && (
                  <div className="py-6 text-center text-xs text-text-muted bg-surface-muted/40 rounded-xl border border-dashed border-border-light">
                    Regular working day · No meetings, deadlines, or holidays
                    scheduled.
                  </div>
                )}
            </div>
          </Card>

          {/* UPCOMING FEED CARD */}
          <Card
            title="Upcoming Schedule"
            subtitle="Meetings, deadlines, holidays, and leaves from today onwards."
            right={
              <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-border-light text-[10px]">
                <button
                  onClick={() => setFeedFilter("all")}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    feedFilter === "all"
                      ? "bg-white text-text shadow-xs"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFeedFilter("deadlines")}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    feedFilter === "deadlines"
                      ? "bg-white text-alert shadow-xs"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Deadlines
                </button>
                <button
                  onClick={() => setFeedFilter("meetings")}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    feedFilter === "meetings"
                      ? "bg-white text-[#1E4E5F] shadow-xs font-bold"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Meetings
                </button>
                <button
                  onClick={() => setFeedFilter("holidays")}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                    feedFilter === "holidays"
                      ? "bg-white text-alert shadow-xs"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Holidays
                </button>
              </div>
            }
          >
            {upcomingFeed.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted">
                No upcoming{" "}
                {feedFilter === "all" ? "schedule items" : feedFilter}.
              </div>
            ) : (
              <div className="space-y-1.5">
                {upcomingFeed.map((item) => {
                  const isHoliday = item.category === "holiday";
                  const isLeave = item.category === "leave";
                  const isDeadline = item.category === "deadline";
                  const isMeeting = item.category === "meeting";

                  const badgeClass = isHoliday
                    ? "bg-alert-light text-alert border-alert/20"
                    : isDeadline
                      ? "bg-[#FDEDEA] text-[#B5563A] border-[#FAD8CF]"
                      : isMeeting
                        ? "bg-[#EEF6F8] text-[#1E4E5F] border-[#C5DCE4]"
                        : isLeave
                          ? "bg-primary-light text-primary border-primary/20"
                          : "bg-warning-light text-warning border-warning/20";

                  const Icon = isHoliday
                    ? PartyPopper
                    : isDeadline
                      ? Flag
                      : isMeeting
                        ? Users
                        : isLeave
                          ? Sun
                          : CalendarClock;

                  return (
                    <button
                      key={item.id}
                      onClick={() => jumpToDate(item.date)}
                      className="w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-muted/60 transition-colors group border border-transparent hover:border-border-light"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${badgeClass}`}
                        >
                          <Icon size={13} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                            <span className="font-mono">
                              {isoToBSLabel(item.date)}
                            </span>
                            {item.time && (
                              <>
                                <span>·</span>
                                <span className="font-mono">
                                  {fmtTimeAmPm(item.time)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-text-muted bg-surface-muted px-2 py-0.5 rounded-md border border-border-light">
                          {relativeDayLabel(item.date)}
                        </span>
                        <ArrowRight
                          size={11}
                          className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

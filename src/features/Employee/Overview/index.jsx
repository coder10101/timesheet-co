import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  useAttendance,
  useWorkLogs,
  useLeaveRequests,
  useProjects,
  useHolidays,
  useEvents,
} from "../../../hooks/useOrgData";
import { todayISO } from "../../../utils/workTime";
import UpcomingEvents from "../../../components/UpcomingEvents";
import { LeaveBalance } from "./LeaveBalance";
import { TodaysWork } from "./TodaysWork";
import { Today } from "./Today";
import { WeekAtGlance } from "./WeekAtGlance";
import { Header } from "./Header";
import { MissedClockOutModal } from "./MissedClockOutModal";
import { MissingAttendanceBanner } from "./MissingAttendanceBanner";
import { QuickLogAttendanceModal } from "./QuickLogAttendanceModal";

export function EmployeeOverview({ me }) {
  const {
    records,
    clockIn,
    clockOut,
    clockInPending,
    startBreak,
    startBreakPending,
    endBreak,
    endBreakPending,
    updateAttendance,
  } = useAttendance(me.id);

  const { entries, addEntry, updateEntry, deleteEntry } = useWorkLogs(me.id);

  const { requests: myLeave } = useLeaveRequests(me.id, "mine");

  const { projects } = useProjects();

  const { holidays } = useHolidays();

  const { events } = useEvents();

  const [err, setErr] = useState("");
  const [quickLogDate, setQuickLogDate] = useState(null);
  const [quickLogSaving, setQuickLogSaving] = useState(false);
  const [quickLogError, setQuickLogError] = useState("");

  const handleSaveQuickLog = async ({ date, clockIn, clockOut, breakMinutes }) => {
    setQuickLogSaving(true);
    setQuickLogError("");
    try {
      await updateAttendance({
        date,
        clockIn: `${date}T${clockIn}`,
        clockOut: clockOut ? `${date}T${clockOut}` : null,
        breakMinutes: Number(breakMinutes) || 0,
      });
      try {
        localStorage.removeItem(`dismissed_missing_attendance_${me?.id}_${date}`);
      } catch (_) {}
      setQuickLogDate(null);
    } catch (error) {
      setQuickLogError(error.message || "Failed to save attendance.");
    } finally {
      setQuickLogSaving(false);
    }
  };

  if (
    records === null ||
    entries === null ||
    myLeave === null ||
    projects === null ||
    holidays === null ||
    events === null
  ) {
    return null;
  }
  const today = todayISO();

  return (
    <div className="w-full max-w-7xl mx-auto">
      <MissedClockOutModal
        records={records}
        today={today}
        me={me}
        updateAttendance={updateAttendance}
      />
      <Header holidays={holidays} records={records} me={me} today={today} />

      {/* MISSING ATTENDANCE DAYS BANNER */}
      <MissingAttendanceBanner
        records={records}
        leaveRequests={myLeave}
        holidays={holidays}
        today={today}
        me={me}
        onLogDate={(date) => {
          setQuickLogError("");
          setQuickLogDate(date);
        }}
      />

      {err && (
        <div className="mb-4 px-3 py-2.5 rounded-lg bg-alert-light text-alert text-xs flex items-center gap-2">
          <AlertCircle size={14} />
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-4">
        <Today
          records={records}
          entries={entries}
          myLeave={myLeave}
          clockIn={clockIn}
          clockOut={clockOut}
          clockInPending={clockInPending}
          startBreak={startBreak}
          startBreakPending={startBreakPending}
          endBreak={endBreak}
          endBreakPending={endBreakPending}
          setErr={setErr}
          today={today}
        />
        <WeekAtGlance
          records={records}
          leaveRequests={myLeave}
          holidays={holidays}
          today={today}
          onLogAttendance={(date) => {
            setQuickLogError("");
            setQuickLogDate(date);
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-4 mt-4 items-start">
        <TodaysWork
          entries={entries}
          addEntry={addEntry}
          updateEntry={updateEntry}
          deleteEntry={deleteEntry}
          projects={projects}
          setErr={setErr}
          today={today}
        />
        <div className="space-y-4">
          <LeaveBalance myLeave={myLeave} me={me} />
          <UpcomingEvents events={events} holidays={holidays} today={today} />
        </div>
      </div>

      {quickLogDate && (
        <QuickLogAttendanceModal
          date={quickLogDate}
          onClose={() => setQuickLogDate(null)}
          onSave={handleSaveQuickLog}
          saving={quickLogSaving}
          error={quickLogError}
          setError={setQuickLogError}
        />
      )}
    </div>
  );
}

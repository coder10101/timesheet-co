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

export function EmployeeOverview({ me }) {
  const { records, clockIn, clockOut, clockInPending } = useAttendance(me.id);

  const { entries, addEntry, updateEntry, deleteEntry } = useWorkLogs(me.id);

  const { requests: myLeave } = useLeaveRequests(me.id, "mine");

  const { projects } = useProjects();

  const { holidays } = useHolidays();

  const { events } = useEvents();

  const [err, setErr] = useState("");

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
      <Header holidays={holidays} records={records} me={me} today={today} />

      {err && (
        <div className="mb-4 px-3 py-2.5 rounded-lg bg-[#FCEDEA] text-[#B5563A] text-xs flex items-center gap-2">
          <AlertCircle size={14} />
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-4">
        <Today
          records={records}
          clockIn={clockIn}
          clockOut={clockOut}
          clockInPending={clockInPending}
          setErr={setErr}
          today={today}
        />
        <WeekAtGlance records={records} leaveRequests={myLeave} today={today} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 mt-4 items-start">
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
    </div>
  );
}

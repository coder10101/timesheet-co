import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Clock,
  FileText,
  Sunrise,
  Users,
} from "lucide-react";
import { useState } from "react";
import { EmployeeOverview } from "./Employee/Overview";
import { EmployeeAttendance } from "./Employee/Attendance";
import { EmployeeWorklog } from "./Employee/WorkLog";
import { EmployeeLeave } from "./Employee/Leave";
import { AdminOverview } from "./Admin/Overview";
import { AdminAttendance } from "./Admin/Attendance";
import { AdminLeave } from "./Admin/Leave";
import { AdminWorklogs } from "./Admin/WorkLogs";

export function Dashboard({ me, onLogout }) {
  const isAdmin = me.role === "admin";
  const [tab, setTab] = useState("overview");

  const employeeTabs = [
    { id: "overview", label: "Overview", icon: <Sunrise size={15} /> },
    { id: "attendance", label: "Attendance", icon: <Calendar size={15} /> },
    { id: "worklog", label: "Work Log", icon: <ClipboardList size={15} /> },
    { id: "leave", label: "Leave", icon: <FileText size={15} /> },
  ];
  const adminTabs = [
    { id: "overview", label: "Team Overview", icon: <Users size={15} /> },
    {
      id: "attendance",
      label: "Attendance Records",
      icon: <Calendar size={15} />,
    },
    {
      id: "leaveApprovals",
      label: "Leave Approvals",
      icon: <FileText size={15} />,
    },
    { id: "worklogs", label: "Work Logs", icon: <ClipboardList size={15} /> },
  ];
  const tabs = isAdmin ? adminTabs : employeeTabs;

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#1A2332] font-sans">
      <div className="flex flex-col md:flex-row">
        <aside className="md:w-60 shrink-0 bg-[#101820] text-[#EDE7DA] md:min-h-screen">
          <div className="flex items-center gap-2 px-5 py-5 border-b border-[#26333F]">
            <div className="w-8 h-8 rounded bg-[#3D6B7D] flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-[#8FA6AE] uppercase">
                Timesheet Co.
              </div>
              <div className="font-semibold text-sm leading-none">
                Attendance Ledger
              </div>
            </div>
          </div>
          <nav className="px-3 py-4 flex md:flex-col gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors ${tab === t.id ? "bg-[#3D6B7D] text-white" : "text-[#8FA6AE] hover:bg-[#1C2933] hover:text-[#EDE7DA]"}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto px-4 py-4 border-t border-[#26333F] hidden md:block">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-8 h-8 rounded-full bg-[#3D6B7D] flex items-center justify-center text-[11px] font-mono">
                {me.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className="text-sm font-medium">{me.name}</div>
                <div className="text-[11px] text-[#8FA6AE]">{me.role}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-[12px] text-[#8FA6AE] hover:text-[#EDE7DA] flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 p-5 md:p-8">
          {!isAdmin && tab === "overview" && <EmployeeOverview me={me} />}
          {!isAdmin && tab === "attendance" && <EmployeeAttendance me={me} />}
          {!isAdmin && tab === "worklog" && <EmployeeWorklog me={me} />}
          {!isAdmin && tab === "leave" && <EmployeeLeave me={me} />}
          {isAdmin && tab === "overview" && <AdminOverview />}
          {isAdmin && tab === "attendance" && <AdminAttendance />}
          {isAdmin && tab === "leaveApprovals" && <AdminLeave me={me} />}
          {isAdmin && tab === "worklogs" && <AdminWorklogs />}
        </main>
      </div>
    </div>
  );
}

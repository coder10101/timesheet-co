import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Clock,
  FileText,
  Sunrise,
  Tag,
  Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function Dashboard({ me, onLogout }) {
  const isAdmin = me.role === "admin";

  const employeeTabs = [
    { to: "overview", label: "Overview", icon: <Sunrise size={15} /> },
    { to: "attendance", label: "Attendance", icon: <Calendar size={15} /> },
    { to: "worklog", label: "Work Log", icon: <ClipboardList size={15} /> },
    { to: "leave", label: "Leave", icon: <FileText size={15} /> },
  ];
  const adminTabs = [
    { to: "overview", label: "Team Overview", icon: <Users size={15} /> },
    {
      to: "attendance",
      label: "Attendance Records",
      icon: <Calendar size={15} />,
    },
    {
      to: "leave-approvals",
      label: "Leave Approvals",
      icon: <FileText size={15} />,
    },
    { to: "worklogs", label: "Work Logs", icon: <ClipboardList size={15} /> },
    { to: "projects", label: "Projects", icon: <Tag size={15} /> },
    { to: "team", label: "Team", icon: <Users size={15} /> },
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
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-[#3D6B7D] text-white"
                      : "text-[#8FA6AE] hover:bg-[#1C2933] hover:text-[#EDE7DA]"
                  }`
                }
              >
                {t.icon}
                {t.label}
              </NavLink>
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
              className="text-[12px] text-[#8FA6AE] hover:text-[#EDE7DA] flex items-center gap-1 mb-4"
            >
              <ArrowLeft size={12} /> Sign out
            </button>
            <p className="text-[10px] text-[#5B6B73] leading-relaxed pt-3 border-t border-[#1C2933]">
              © 2026 Aditi Acharya. All rights reserved.
            </p>
          </div>
        </aside>

        <main className="flex-1 p-5 md:p-8 flex flex-col min-h-screen md:min-h-0">
          <div className="flex-1">
            <Outlet />
          </div>
          <footer className="mt-10 pt-4 border-t border-[#E4DFD3] text-[10px] text-[#9A9383]">
            © 2026 Aditi Acharya. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}

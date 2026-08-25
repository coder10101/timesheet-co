import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Grid2X2,
  Tag,
  Users,
} from "lucide-react";

import { NavLink, Outlet } from "react-router-dom";

export function Dashboard({ me, onLogout }) {
  const isAdmin = me.role === "admin";

  const employeeTabs = [
    {
      to: "overview",
      label: "Overview",
      icon: <Grid2X2 size={16} />,
    },
    {
      to: "attendance",
      label: "Attendance",
      icon: <Clock size={16} />,
    },
    {
      to: "worklog",
      label: "Work Log",
      icon: <ClipboardList size={16} />,
    },
    {
      to: "leave",
      label: "Leave",
      icon: <FileText size={16} />,
    },
    {
      to: "calendar",
      label: "Calendar",
      icon: <CalendarDays size={16} />,
    },
  ];

  const adminTabs = [
    {
      to: "overview",
      label: "Overview",
      icon: <Grid2X2 size={16} />,
    },
    {
      to: "attendance",
      label: "Attendance",
      icon: <Clock size={16} />,
    },
    {
      to: "leave-approvals",
      label: "Leave",
      icon: <FileText size={16} />,
    },
    {
      to: "worklogs",
      label: "Work Logs",
      icon: <ClipboardList size={16} />,
    },
    {
      to: "projects",
      label: "Projects",
      icon: <Tag size={16} />,
    },
    {
      to: "team",
      label: "Team",
      icon: <Users size={16} />,
    },
    {
      to: "calendar",
      label: "Calendar",
      icon: <CalendarDays size={16} />,
    },
  ];

  const tabs = isAdmin ? adminTabs : employeeTabs;

  return (
    <div className="min-h-screen bg-surface text-text">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 bg-[#011E26] text-white sticky top-0 h-screen">
          {/* LOGO */}

          <div className="px-5 py-6 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Clock size={16} strokeWidth={2} />
              </div>

              <div>
                <p className="text-sm font-bold tracking-tight">
                  Timesheet Co.
                </p>

                <p className="text-[9px] uppercase tracking-[0.15em] text-white/30 mt-0.5">
                  Attendance
                </p>
              </div>
            </div>
          </div>

          {/* NAVIGATION */}

          <nav className="flex-1 px-3 py-4 space-y-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `
                    flex items-center gap-3
                    px-3 py-2.5
                    rounded-lg
                    text-sm
                    transition-all
                    ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    }
                  `
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-primary" : ""}>
                      {tab.icon}
                    </span>

                    <span>{tab.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* USER */}

          <div className="px-4 py-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                {me.name.slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{me.name}</p>

                <p className="text-[10px] text-white/30 truncate">{me.role}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="mt-4 flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition"
            >
              <ArrowLeft size={11} />
              Sign out
            </button>
          </div>
        </aside>

        <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#0E1117] text-white flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Clock size={14} />
            </div>

            <div>
              <p className="text-sm font-bold">WorkPulse</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold"
          >
            {me.name.slice(0, 2).toUpperCase()}
          </button>
        </header>

        <main className="flex-1 min-w-0">
          <div className="pt-14 md:pt-0 p-4 sm:p-5 md:p-7 lg:p-8 pb-24 md:pb-8">
            <Outlet />
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E1117] border-t border-white/5 flex items-stretch overflow-x-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex-1 min-w-[70px] flex flex-col items-center justify-center gap-1 py-2.5 text-[9px]"
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? "text-primary" : "text-white/30"}>
                    {tab.icon}
                  </span>

                  <span className={isActive ? "text-white" : "text-white/30"}>
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

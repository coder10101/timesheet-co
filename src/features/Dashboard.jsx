import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Clock3,
  Briefcase,
  LayoutDashboard,
  FolderKanban,
  Users,
  CalendarCheck,
} from "lucide-react";

import { NavLink, Outlet } from "react-router-dom";

export function Dashboard({ me, onLogout }) {
  const isAdmin = me.role === "admin";

  const employeeTabs = [
    {
      to: "overview",
      label: "Overview",
      icon: <LayoutDashboard size={17} />,
    },
    {
      to: "attendance",
      label: "Attendance",
      icon: <Clock3 size={17} />,
    },
    {
      to: "worklog",
      label: "Work Log",
      icon: <Briefcase size={17} />,
    },
    {
      to: "leave",
      label: "Leave",
      icon: <CalendarCheck size={17} />,
    },
    {
      to: "calendar",
      label: "Calendar",
      icon: <CalendarDays size={17} />,
    },
  ];

  const adminTabs = [
    {
      to: "overview",
      label: "Overview",
      icon: <LayoutDashboard size={17} />,
    },
    {
      to: "attendance",
      label: "Attendance",
      icon: <Clock3 size={17} />,
    },
    {
      to: "leave-approvals",
      label: "Leave",
      icon: <CalendarCheck size={17} />,
    },
    {
      to: "worklogs",
      label: "Work Logs",
      icon: <Briefcase size={17} />,
    },
    {
      to: "projects",
      label: "Projects",
      icon: <FolderKanban size={17} />,
    },
    {
      to: "team",
      label: "Team",
      icon: <Users size={17} />,
    },
    {
      to: "calendar",
      label: "Calendar",
      icon: <CalendarDays size={17} />,
    },
  ];

  const tabs = isAdmin ? adminTabs : employeeTabs;

  return (
    <div className="min-h-screen bg-surface text-text">
      <div className="flex min-h-screen">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 bg-[#011E26] text-white sticky top-0 h-screen border-r border-white/5">
          {/* BRAND LOGO */}
          <div className="px-5 py-5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1E4E5F] to-[#0A2630] border border-white/15 flex items-center justify-center shadow-xs">
                <Clock size={16} className="text-white" strokeWidth={2.2} />
              </div>

              <div>
                <p className="text-sm font-bold tracking-tight text-white">
                  Timesheet Co.
                </p>
                <p className="text-[9px] uppercase tracking-[0.15em] text-white/40 font-medium">
                  Attendance & HR
                </p>
              </div>
            </div>
          </div>

          {/* NAVIGATION */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-white/10 text-white font-semibold shadow-2xs"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-primary" : "text-white/40"}>
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
              <div className="w-8 h-8 rounded-full bg-primary/30 border border-primary/40 text-primary-light flex items-center justify-center text-[10px] font-bold shrink-0">
                {me.name.slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold truncate text-white">{me.name}</p>
                <p className="text-[10px] text-white/40 truncate capitalize">{me.role}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="mt-3.5 flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/80 transition-colors cursor-pointer"
            >
              <ArrowLeft size={12} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* MOBILE TOP HEADER */}
        <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#011E26] border-b border-white/10 text-white flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1E4E5F] to-[#0A2630] border border-white/15 flex items-center justify-center shadow-xs">
              <Clock size={14} className="text-white" strokeWidth={2.2} />
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight text-white">Timesheet Co.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/30 border border-primary/40 text-primary-light flex items-center justify-center text-[9px] font-bold">
              {me.name.slice(0, 2).toUpperCase()}
            </div>
            <button
              onClick={onLogout}
              className="p-1 rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Sign out"
            >
              <ArrowLeft size={13} />
            </button>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="flex-1 min-w-0">
          <div className="pt-16 md:pt-0 p-4 sm:p-5 md:p-7 lg:p-8 pb-24 md:pb-8">
            <Outlet />
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#011E26]/95 backdrop-blur-lg border-t border-white/10 flex items-stretch px-1 py-1 shadow-xl">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex-1 min-w-[55px] flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? "text-white font-semibold"
                    : "text-white/40 hover:text-white/70"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-9 h-7 rounded-lg flex items-center justify-center transition-all ${
                      isActive ? "bg-white/15 text-white scale-105" : ""
                    }`}
                  >
                    {tab.icon}
                  </div>
                  <span className="text-[10px] tracking-tight leading-none">
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

import { useState } from "react";
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
  MoreHorizontal,
  X,
} from "lucide-react";

import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getEmployeeColor } from "../constants/colors";
import { OfficeHoursProvider } from "../constants/officeHours";

export function Dashboard({ me, onLogout }) {
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const location = useLocation();
  const isAdmin = me.role === "admin";

  const employeeDesktopTabs = [
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

  // Mobile Core 4 navigation for Employee (3 primary + More)
  const employeeMobilePrimary = [
    {
      to: "overview",
      label: "Overview",
      icon: <LayoutDashboard size={20} />,
    },
    {
      to: "attendance",
      label: "Attendance",
      icon: <Clock3 size={20} />,
    },
    {
      to: "worklog",
      label: "Work Log",
      icon: <Briefcase size={20} />,
    },
  ];

  // Items accessed via "More" bottom sheet on Mobile for Employee
  const employeeMobileMore = [
    {
      to: "calendar",
      label: "Company Calendar",
      desc: "Holidays, shifts & monthly schedule",
      icon: <CalendarDays size={18} />,
    },
    {
      to: "leave",
      label: "Leave & Balances",
      desc: "Quota balances, approvals & history",
      icon: <CalendarCheck size={18} />,
    },
  ];

  const adminDesktopTabs = [
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

  // Mobile Core 4 items for Admin (3 primary + More)
  const adminMobilePrimary = [
    {
      to: "overview",
      label: "Overview",
      icon: <LayoutDashboard size={20} />,
    },
    {
      to: "attendance",
      label: "Attendance",
      icon: <Clock3 size={20} />,
    },
    {
      to: "leave-approvals",
      label: "Leave",
      icon: <CalendarCheck size={20} />,
    },
  ];

  // Items accessed via "More" bottom sheet on Mobile for Admin
  const adminMobileMore = [
    {
      to: "worklogs",
      label: "Work Logs",
      desc: "Team accomplishments & hours",
      icon: <Briefcase size={18} />,
    },
    {
      to: "projects",
      label: "Projects",
      desc: "Project registry & allocations",
      icon: <FolderKanban size={18} />,
    },
    {
      to: "team",
      label: "Team",
      desc: "Staff directory & employee roster",
      icon: <Users size={18} />,
    },
    {
      to: "calendar",
      label: "Calendar",
      desc: "Holidays, shifts & schedule",
      icon: <CalendarDays size={18} />,
    },
  ];

  const isEmployeeMoreActive =
    !isAdmin &&
    (location.pathname.includes("leave") ||
      location.pathname.includes("calendar"));

  const isAdminMoreActive =
    isAdmin &&
    (location.pathname.includes("worklogs") ||
      adminMobileMore.some((t) => location.pathname.includes(t.to)));

  const isMoreActive = isAdmin ? isAdminMoreActive : isEmployeeMoreActive;
  const desktopTabs = isAdmin ? adminDesktopTabs : employeeDesktopTabs;

  return (
    <OfficeHoursProvider orgId={me?.org_id}>
      <div className="min-h-screen bg-surface text-text w-full max-w-full overflow-x-hidden">
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
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
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {desktopTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white/10 text-white font-semibold shadow-xs"
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
              <div
                className="w-8 h-8 rounded-full border border-white/20 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs"
                style={{ backgroundColor: getEmployeeColor(me) }}
              >
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
        <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#011E26]/95 backdrop-blur-md border-b border-white/10 text-white flex items-center justify-between px-4 pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1E4E5F] to-[#0A2630] border border-white/15 flex items-center justify-center shadow-xs">
              <Clock size={14} className="text-white" strokeWidth={2.2} />
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight text-white">Timesheet Co.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full border border-white/20 text-white flex items-center justify-center text-[9px] font-bold shadow-xs"
              style={{ backgroundColor: getEmployeeColor(me) }}
            >
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
        <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden">
          <div className="w-full max-w-full overflow-x-hidden pt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:pt-0 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-8 p-3.5 sm:p-5 md:p-7 lg:p-8">
            <Outlet />
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR (CORE 4 TABS FOR BOTH EMPLOYEE AND ADMIN) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#011E26]/95 backdrop-blur-xl border-t border-white/10 flex items-stretch px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-2xl">
          {/* 3 PRIMARY TABS */}
          {(isAdmin ? adminMobilePrimary : employeeMobilePrimary).map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[46px] select-none active:scale-95 ${
                  isActive
                    ? "text-white font-bold"
                    : "text-white/45 hover:text-white/70"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-10 h-7 rounded-xl flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-white/15 text-white scale-105 shadow-2xs"
                        : ""
                    }`}
                  >
                    {tab.icon}
                  </div>
                  <span className="text-[11px] font-semibold tracking-tight leading-none mt-1">
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* 4TH TAB: MORE BUTTON */}
          <button
            type="button"
            onClick={() => setShowMoreDrawer(true)}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[46px] select-none active:scale-95 ${
              isMoreActive || showMoreDrawer
                ? "text-white font-bold"
                : "text-white/45 hover:text-white/70"
            }`}
          >
            <div
              className={`w-10 h-7 rounded-xl flex items-center justify-center transition-all relative ${
                isMoreActive || showMoreDrawer
                  ? "bg-white/15 text-white scale-105 shadow-2xs"
                  : ""
              }`}
            >
              <MoreHorizontal size={20} />
              {isMoreActive && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-[#011E26]" />
              )}
            </div>
            <span className="text-[11px] font-semibold tracking-tight leading-none mt-1">
              More
            </span>
          </button>
        </nav>

        {/* MOBILE MORE MANAGEMENT TOOLS / QUICK ACTIONS BOTTOM DRAWER */}
        {showMoreDrawer && (
          <>
            {/* BACKDROP OVERLAY */}
            <div
              className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity fade-in"
              onClick={() => setShowMoreDrawer(false)}
            />

            {/* BOTTOM SHEET */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#011E26] border-t border-white/15 rounded-t-3xl p-4 sm:p-5 space-y-3.5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] text-white shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
              {/* DRAG HANDLE PILL */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-1" />

              {/* HEADER */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-primary">
                    <MoreHorizontal size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {isAdmin ? "Admin Management" : "Quick Actions & Menu"}
                    </h3>
                    <p className="text-[10px] text-white/50">
                      {isAdmin
                        ? "Administrative tools & registries"
                        : "Shortcuts, company calendar & leave"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMoreDrawer(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* EMPLOYEE QUICK ACTIONS */}
              {!isAdmin && (
                <div className="space-y-2 pt-0.5 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-1">
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <NavLink
                      to="worklog"
                      onClick={() => setShowMoreDrawer(false)}
                      className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Briefcase size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">
                          Log Work
                        </p>
                        <p className="text-[10px] text-white/50 mt-0.5">
                          Desk or site
                        </p>
                      </div>
                    </NavLink>

                    <NavLink
                      to="leave"
                      onClick={() => setShowMoreDrawer(false)}
                      className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#2E6B56] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <CalendarCheck size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">
                          Apply Leave
                        </p>
                        <p className="text-[10px] text-white/50 mt-0.5">
                          Full or half day
                        </p>
                      </div>
                    </NavLink>
                  </div>
                </div>
              )}

              {/* NAVIGATION CARDS */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-1">
                  {isAdmin ? "Registries & Views" : "Additional Pages"}
                </p>
                {(isAdmin ? adminMobileMore : employeeMobileMore).map((tab) => {
                  const isActive = location.pathname.includes(tab.to);
                  return (
                    <NavLink
                      key={tab.to}
                      to={tab.to}
                      onClick={() => setShowMoreDrawer(false)}
                      className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all ${
                        isActive
                          ? "bg-white/15 border-primary/50 text-white font-bold"
                          : "bg-white/5 border-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-primary text-white"
                            : "bg-white/10 text-primary"
                        }`}
                      >
                        {tab.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white">
                          {tab.label}
                        </p>
                        <p className="text-[10px] text-white/50">{tab.desc}</p>
                      </div>
                    </NavLink>
                  );
                })}
              </div>

              {/* USER PROFILE & LOGOUT */}
              <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full border border-white/20 text-white flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: getEmployeeColor(me) }}
                  >
                    {me.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate text-white">
                      {me.name}
                    </p>
                    <p className="text-[10px] text-white/40 truncate capitalize">
                      {me.role}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreDrawer(false);
                    onLogout();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={12} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </OfficeHoursProvider>
  );
}

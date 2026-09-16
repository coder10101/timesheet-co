import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthProvider";
import Login from "./components/Login";
import { Dashboard } from "./features/Dashboard";
import { EmployeeLeave } from "./features/Employee/Leave";
import { EmployeeWorklog } from "./features/Employee/WorkLog";
import { EmployeeAttendance } from "./features/Employee/Attendance";
import { AdminWorklogs } from "./features/Admin/WorkLogs";
import { AdminAttendance } from "./features/Admin/Attendance";
import { AdminLeave } from "./features/Admin/Leave";
import { AdminOverview } from "./features/Admin/Overview";
import { AdminProjects } from "./features/Admin/Project";
import { AdminTeam } from "./features/Admin/Team";
import { AdminCalendar } from "./features/Admin/Calendar";
import { EmployeeOverview } from "./features/Employee/Overview";
import { EmployeeCalendar } from "./features/Employee/Calendar";
import { EmployeeProjects } from "./features/Employee/Project";
import { ProjectDetails } from "./features/Projects/ProjectDetails";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

function Root() {
  const {
    isAuthLoading,
    user,
    profile,
    profileLoading,
    signOut,
    revokedNotice,
  } = useAuth();

  if (isAuthLoading || (user && profileLoading && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101820] text-[#EDE7DA] font-mono text-sm">
        loading workspace…
      </div>
    );
  }
  if (revokedNotice || (profile && profile.is_active === false)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101820] text-[#EDE7DA] text-sm flex-col gap-2">
        <p>
          Your access has been revoked. Contact your admin if this seems
          wrong.
        </p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101820] text-[#EDE7DA] text-sm gap-3 flex-col">
        <p>Couldn't load your profile.</p>
        <button onClick={signOut} className="underline text-[#8FA6AE]">
          Sign out and try again
        </button>
      </div>
    );
  }

  const isAdmin = profile.role === "admin";

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Dashboard me={profile} onLogout={signOut} />}>
          <Route index element={<Navigate to="/overview" replace />} />
          {!isAdmin && (
            <>
              <Route
                path="overview"
                element={<EmployeeOverview me={profile} />}
              />
              <Route
                path="attendance"
                element={<EmployeeAttendance me={profile} />}
              />
              <Route path="worklog" element={<EmployeeWorklog me={profile} />} />
              <Route
                path="projects"
                element={<EmployeeProjects me={profile} />}
              />
              <Route
                path="projects/:projectId"
                element={<ProjectDetails me={profile} />}
              />
              <Route path="leave" element={<EmployeeLeave me={profile} />} />
              <Route
                path="calendar"
                element={<EmployeeCalendar me={profile} />}
              />
              <Route path="worklogs" element={<Navigate to="/worklog" replace />} />
              <Route path="work-logs" element={<Navigate to="/worklog" replace />} />
              <Route path="leave-approvals" element={<Navigate to="/leave" replace />} />
            </>
          )}
          {isAdmin && (
            <>
              <Route path="overview" element={<AdminOverview me={profile} />} />
              <Route path="attendance" element={<AdminAttendance />} />
              <Route
                path="leave-approvals"
                element={<AdminLeave me={profile} />}
              />
              <Route path="leave" element={<Navigate to="/leave-approvals" replace />} />
              <Route path="worklogs" element={<AdminWorklogs />} />
              <Route path="worklog" element={<Navigate to="/worklogs" replace />} />
              <Route path="work-logs" element={<Navigate to="/worklogs" replace />} />
              <Route path="projects" element={<AdminProjects me={profile} />} />
              <Route
                path="projects/:projectId"
                element={<ProjectDetails me={profile} />}
              />
              <Route path="team" element={<AdminTeam me={profile} />} />
              <Route path="calendar" element={<AdminCalendar me={profile} />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

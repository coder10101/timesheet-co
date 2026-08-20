import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthProvider";
import Login from "./components/Login";
import { Dashboard } from "./features/Dashboard";
import { EmployeeOverview } from "./features/Employee/Overview";
import { EmployeeLeave } from "./features/Employee/Leave";
import { EmployeeWorklog } from "./features/Employee/WorkLog";
import { EmployeeAttendance } from "./features/Employee/Attendance";
import { AdminWorklogs } from "./features/Admin/WorkLogs";
import { AdminAttendance } from "./features/Admin/Attendance";
import { AdminLeave } from "./features/Admin/Leave";
import { AdminOverview } from "./features/Admin/Overview";

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

function Root() {
  const { isAuthLoading, user, profile, profileLoading, signOut } = useAuth();

  if (isAuthLoading || (user && profileLoading && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101820] text-[#EDE7DA] font-mono text-sm">
        loading workspace…
      </div>
    );
  }
  if (!user) return <Login />;
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
    <Routes>
      <Route path="/" element={<Dashboard me={profile} onLogout={signOut} />}>
        <Route index element={<Navigate to="overview" replace />} />
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
            <Route path="leave" element={<EmployeeLeave me={profile} />} />
          </>
        )}
        {isAdmin && (
          <>
            <Route path="overview" element={<AdminOverview />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route
              path="leave-approvals"
              element={<AdminLeave me={profile} />}
            />
            <Route path="worklogs" element={<AdminWorklogs />} />
          </>
        )}
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Route>
    </Routes>
  );
}

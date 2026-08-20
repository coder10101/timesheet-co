import { AuthProvider, useAuth } from "./lib/AuthProvider";
import Login from "./components/Login";
import { Dashboard } from "./features/Dashboard";

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
  return <Dashboard me={profile} onLogout={signOut} />;
}

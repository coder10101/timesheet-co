import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

const getCachedProfile = (userId) => {
  if (!userId || typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(`auth_profile_${userId}`);
    const parsed = cached ? JSON.parse(cached) : null;
    if (parsed && parsed.is_active === false) return null;
    return parsed;
  } catch (_) {
    return null;
  }
};

const setCachedProfile = (userId, profileData) => {
  if (!userId || typeof window === "undefined") return;
  try {
    if (profileData) {
      localStorage.setItem(`auth_profile_${userId}`, JSON.stringify(profileData));
    } else {
      localStorage.removeItem(`auth_profile_${userId}`);
    }
  } catch (_) {}
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [revokedNotice, setRevokedNotice] = useState(false);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return;

    // Immediately restore cached profile to eliminate blank/loading screen
    setProfile((prev) => {
      if (!prev) {
        const cached = getCachedProfile(userId);
        if (cached) return cached;
      }
      return prev;
    });

    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("fetchProfile network/auth notice (retaining existing session):", error);
        // Do not wipe out valid profile state on momentary network blips or wakeups
        return;
      }

      if (data && data.is_active === false) {
        await supabase.auth.signOut();
        setCachedProfile(userId, null);
        setProfile(null);
        setSession(null);
        setRevokedNotice(true);
        return;
      }

      if (data) {
        setCachedProfile(userId, data);
        setProfile(data);
      }
    } catch (err) {
      console.warn("fetchProfile error (retaining existing profile):", err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        fetchProfile(newSession.user.id);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [fetchProfile]);

  // step 1: send a one-time code to the given email.
  // `name` is only used the first time this email signs up (stored as raw_user_meta_data.name
  // and picked up by the handle_new_user() trigger in schema.sql).
  const sendOtp = async (email, name, orgCode) => {
    const { data: isValid, error: codeError } = await supabase.rpc(
      "validate_org_code",
      { code: orgCode },
    );
    if (codeError) throw codeError;
    if (!isValid)
      throw new Error(
        "That organization code isn't valid. Check with your admin.",
      );

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { data: { name, org_code: orgCode }, shouldCreateUser: true },
    });
    if (error) throw error;
  };

  // step 2: verify the 6-digit code the user received by email
  const verifyOtp = async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (session?.user?.id) {
      setCachedProfile(session.user.id, null);
    }
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = () => session?.user && fetchProfile(session.user.id);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        profileLoading,
        revokedNotice,
        isAuthLoading: session === undefined,
        sendOtp,
        verifyOtp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

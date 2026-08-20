import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async (userId) => {
    setProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) console.error("fetchProfile error:", error);

    if (data && !data.is_active) {
      await supabase.auth.signOut();
      setProfile(null);
      setRevokedNotice(true);
      setProfileLoading(false);
      return;
    }

    setProfile(data || null);
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
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
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = () => session?.user && fetchProfile(session.user.id);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        profileLoading,
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

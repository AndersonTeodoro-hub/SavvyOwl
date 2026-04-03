import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setMonitoringUser, clearMonitoringUser } from "@/lib/monitoring";
import i18n from "@/i18n";

type Profile = {
  id: string;
  full_name: string | null;
  plan: string;
  monthly_budget_eur: number;
  content_preference: string | null;
  onboarding_completed: boolean;
  language: string;
  credits_balance: number;
  credits_total_purchased: number;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const applyLanguage = (lang: string) => {
    if (lang && lang !== "auto") {
      localStorage.setItem("savvyowl-language", lang);
      i18n.changeLanguage(lang);
    } else {
      localStorage.setItem("savvyowl-language", "auto");
      const detected = navigator.language?.split("-")[0];
      const supported = ["en", "pt", "fr", "es"];
      i18n.changeLanguage(supported.includes(detected) ? detected : "en");
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      const p = data as Profile;
      setProfile(p);
      applyLanguage(p.language);
      setMonitoringUser(userId, undefined, p.plan);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      // 1) Handle OAuth hash tokens FIRST (Google redirect lands with #access_token=...)
      const hash = window.location.hash;
      if (hash && hash.includes("access_token=")) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) console.error("Error setting session from OAuth:", error);
        }
      }

      // 2) Subscribe to future auth changes (token refresh, sign-out, etc.)
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user) {
            setTimeout(() => fetchProfile(newSession.user.id), 0);
          } else {
            setProfile(null);
          }
        }
      );
      subscription = sub;

      // 3) Read persisted session from localStorage AFTER hash is processed
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        await fetchProfile(existingSession.user.id);
      }

      // 4) Single point of setLoading(false) — everything is resolved
      setLoading(false);
    };

    init();

    return () => { subscription?.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    clearMonitoringUser();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

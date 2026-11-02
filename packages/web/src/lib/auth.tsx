import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, clearSession, getSessionUser, saveSession } from "./session";
import type { SessionUser } from "../types";
import type { PlanTier } from "@framecoach/shared";

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
  setAuth: (token: string, user: SessionUser) => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(getSessionUser());
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const data = await api<{ user: SessionUser }>("/api/auth/me");
      setUser(data.user);
      const token = localStorage.getItem("framecoach.token");
      if (token) saveSession(token, data.user);
    } catch {
      /* keep cached user for local demo if API is down */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (getSessionUser()) refresh();
    else setLoading(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      refresh,
      signOut: () => {
        clearSession();
        setUser(null);
      },
      setAuth: (token, u) => {
        saveSession(token, u);
        setUser(u);
      },
    }),
    [user, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth");
  return ctx;
}

export function useTier(): PlanTier {
  return useAuth().user?.tier ?? "free";
}

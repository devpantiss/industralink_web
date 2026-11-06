import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthResponse, Role, User } from "@/types";
import { authApi } from "@/api/auth";
import { UNAUTHORIZED_EVENT } from "@/api/client";
import { session } from "@/lib/session";

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (res: AuthResponse) => void;
  signOut: () => void;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthState | null>(null);

export const homeFor = (role: Role) => `/${role}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!session.get());
  const qc = useQueryClient();

  useEffect(() => {
    if (!session.get()) return;
    authApi.me().then(setUser).catch(() => session.clear()).finally(() => setLoading(false));
  }, []);

  const signOut = useCallback(() => {
    authApi.logout().catch(() => undefined);
    session.clear();
    setUser(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    const onUnauthorized = () => { setUser(null); qc.clear(); };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [qc]);

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    signIn: (res) => { session.set(res.token); qc.clear(); setUser(res.user); },
    signOut,
    setUser,
  }), [user, loading, signOut, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** For pages that only render for a logged-in user. */
export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error("useUser called without a logged-in user");
  return user;
}

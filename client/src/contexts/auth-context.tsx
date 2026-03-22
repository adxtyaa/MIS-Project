import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "../lib/mock-data";
import {
  login as apiLogin,
  register as apiRegister,
  getProfile,
} from "../lib/mock-api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (params: {
    email: string;
    password: string;
    pgpId: string;
    name: string;
  }) => Promise<{ error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app load
  useEffect(() => {
    const token = localStorage.getItem("mc_access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    getProfile()
      .then((u) => {
        if (u) {
          setUser(u);
        } else {
          // Token expired or invalid — clear
          localStorage.removeItem("mc_access_token");
          localStorage.removeItem("mc_refresh_token");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    if (result.error) return { error: result.error };
    if (result.user) setUser(result.user);
    return {};
  }, []);

  const register = useCallback(
    async (params: { email: string; password: string; pgpId: string; name: string }) => {
      const result = await apiRegister(params);
      if (result.error) return { error: result.error };
      if (result.user) setUser(result.user);
      return {};
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("mc_access_token");
    localStorage.removeItem("mc_refresh_token");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await getProfile();
    if (u) setUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

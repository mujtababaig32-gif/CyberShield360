import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SESSION_EXPIRED_EVENT } from "../api/client";
import { clearAuthStorage, getAuthStorage, setRemember } from "./storage";
import type { AuthResponse } from "../types";

type RawAuthResponse = {
  accessToken?: string;
  AccessToken?: string;
  refreshToken?: string;
  RefreshToken?: string;
  expiresUtc?: string;
  ExpiresUtc?: string;
  tenantId?: string;
  TenantId?: string;
  email?: string;
  Email?: string;
  roles?: string[];
  Roles?: string[];
};

interface AuthState {
  user: AuthResponse | null;
  login: (auth: RawAuthResponse, remember?: boolean) => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function getSavedUser(): AuthResponse | null {
  try {
    const raw = getAuthStorage().getItem("cs360_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    clearAuthStorage(["cs360_token", "cs360_user"]);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(() => getSavedUser());

  const login = (auth: RawAuthResponse, remember: boolean = true) => {
    const token = auth.accessToken ?? auth.AccessToken;

    if (!token) {
      console.error("No token found in auth response:", auth);
      return;
    }

    const normalizedAuth: AuthResponse = {
      accessToken: token,
      refreshToken: auth.refreshToken ?? auth.RefreshToken ?? "",
      expiresUtc: auth.expiresUtc ?? auth.ExpiresUtc ?? "",
      tenantId: auth.tenantId ?? auth.TenantId ?? "",
      email: auth.email ?? auth.Email ?? "",
      roles: auth.roles ?? auth.Roles ?? [],
    };

    setRemember(remember);
    const storage = getAuthStorage();
    storage.setItem("cs360_token", token);
    storage.setItem("cs360_user", JSON.stringify(normalizedAuth));
    setUser(normalizedAuth);
  };

  const logout = () => {
    clearAuthStorage(["cs360_token", "cs360_user"]);
    setUser(null);
  };

  const hasRole = (role: string) => user?.roles?.includes(role) ?? false;

  useEffect(() => {
    const handleSessionExpired = () => logout();
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
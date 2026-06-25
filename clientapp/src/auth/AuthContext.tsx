import { createContext, useContext, useState, type ReactNode } from "react";
import type { AuthResponse } from "../types";

interface AuthState {
  user: AuthResponse | null;
  login: (auth: AuthResponse | any) => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function getSavedUser(): AuthResponse | null {
  try {
    const raw = localStorage.getItem("cs360_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem("cs360_user");
    localStorage.removeItem("cs360_token");
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(() => getSavedUser());

  const login = (auth: AuthResponse | any) => {
    const token = auth.accessToken ?? auth.AccessToken;

    if (!token) {
      console.error("No token found in auth response:", auth);
      return;
    }

    const normalizedAuth = {
      ...auth,
      accessToken: token,
      refreshToken: auth.refreshToken ?? auth.RefreshToken,
      expiresUtc: auth.expiresUtc ?? auth.ExpiresUtc,
      tenantId: auth.tenantId ?? auth.TenantId,
      email: auth.email ?? auth.Email,
      roles: auth.roles ?? auth.Roles ?? [],
    };

    localStorage.setItem("cs360_token", token);
    localStorage.setItem("cs360_user", JSON.stringify(normalizedAuth));
    setUser(normalizedAuth);
  };

  const logout = () => {
    localStorage.removeItem("cs360_token");
    localStorage.removeItem("cs360_user");
    setUser(null);
  };

  const hasRole = (role: string) => user?.roles?.includes(role) ?? false;

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
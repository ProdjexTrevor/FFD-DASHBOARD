import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearStoredAuth, getStoredAuth, setStoredAuth } from "../lib/auth";
import { fetchWhoami } from "../lib/api";

interface AuthContextValue {
  user: { username: string; displayName: string } | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ username: string; displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setStoredAuth({ username, password });
    try {
      const profile = await fetchWhoami();
      setUser(profile);
    } catch (error) {
      clearStoredAuth();
      throw error;
    }
  }, []);

  useEffect(() => {
    const stored = getStoredAuth();
    if (!stored) {
      setLoading(false);
      return;
    }

    fetchWhoami()
      .then((profile) => setUser(profile))
      .catch(() => {
        clearStoredAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
    }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

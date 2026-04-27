"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import { fetchWithRefresh } from "@/lib/api";
import type { AuthUser } from "@/types/auth.types";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (userData: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let authBootstrapPromise: Promise<AuthUser | null> | null = null;
let authBootstrapResolved = false;
let authBootstrapUser: AuthUser | null = null;

const resetAuthBootstrap = () => {
  authBootstrapPromise = null;
  authBootstrapResolved = false;
  authBootstrapUser = null;
};

const getAuthBootstrapPromise = () => {
  if (!authBootstrapPromise) {
    authBootstrapPromise = (async () => {
      try {
        const res = await fetchWithRefresh("/api/auth/me");
        if (!res.ok) return null;

        const json = await res.json();
        return (json.data?.user ?? null) as AuthUser | null;
      } catch {
        return null;
      }
    })();
  }

  return authBootstrapPromise;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => authBootstrapUser);
  const [isLoading, setIsLoading] = useState(() => !authBootstrapResolved);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authUser = await getAuthBootstrapPromise();
        authBootstrapUser = authUser;
        authBootstrapResolved = true;
        setUser(authUser);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = (userData: AuthUser) => {
    authBootstrapUser = userData;
    authBootstrapResolved = true;
    authBootstrapPromise = Promise.resolve(userData);
    setUser(userData);
    setIsLoading(false);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // silent
    } finally {
      resetAuthBootstrap();
      setUser(null);
      setIsLoading(false);
      toast.info("Sesión cerrada");
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};

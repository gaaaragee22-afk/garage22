"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin";
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  user: User;
}

interface SessionResponse {
  authenticated: boolean;
  user: User | null;
}

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        setUser(null);
        return;
      }

      const data = (await response.json()) as SessionResponse;

      if (!data.authenticated || !data.user) {
        setUser(null);
        return;
      }

      setUser(data.user);
    } catch (error) {
      console.error("Erro ao buscar sessão:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let componentIsMounted = true;

    async function loadInitialSession() {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (componentIsMounted) {
            setUser(null);
          }

          return;
        }

        const data = (await response.json()) as SessionResponse;

        if (!componentIsMounted) {
          return;
        }

        if (!data.authenticated || !data.user) {
          setUser(null);
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error("Erro ao carregar sessão inicial:", error);

        if (componentIsMounted) {
          setUser(null);
        }
      } finally {
        if (componentIsMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialSession();

    return () => {
      componentIsMounted = false;
    };
  }, []);

  const login = useCallback(
    async ({ email, password }: LoginCredentials) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = (await response.json()) as
        | LoginResponse
        | { message: string };

      if (!response.ok) {
        throw new Error(data.message || "Não foi possível realizar o login.");
      }

      if (!("user" in data)) {
        throw new Error("O servidor não retornou os dados do usuário.");
      }

      setUser(data.user);

      router.replace("/dashboard");
      router.refresh();
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Não foi possível finalizar a sessão.");
      }
    } catch (error) {
      console.error("Erro ao sair da conta:", error);
    } finally {
      setUser(null);

      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  const value = useMemo<AuthContextData>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      refreshSession,
    }),
    [user, isLoading, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider.");
  }

  return context;
}

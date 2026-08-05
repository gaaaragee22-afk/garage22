"use client";

import axios from "axios";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface StoreStatus {
  isOpen: boolean;
  closedMessage: string;
  lastStatusChangeAt: string;
  updatedAt: string;
}

interface StoreStatusResponse {
  success: boolean;
  message?: string;
  store?: StoreStatus;
}

interface StoreStatusContextData {
  store: StoreStatus | null;
  isOpen: boolean;
  isLoading: boolean;
  error: string;

  refreshStoreStatus: () => Promise<StoreStatus | null>;
}

const DEFAULT_CLOSED_MESSAGE =
  "No momento, nossa loja está fechada para novos pedidos.";

const StoreStatusContext = createContext<StoreStatusContextData | null>(null);

interface StoreStatusProviderProps {
  children: ReactNode;
}

function getRequestErrorMessage(error: unknown): string {
  if (axios.isAxiosError<StoreStatusResponse>(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      "Não foi possível consultar o funcionamento da loja."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível consultar o funcionamento da loja.";
}

export function StoreStatusProvider({ children }: StoreStatusProviderProps) {
  const [store, setStore] = useState<StoreStatus | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState("");

  const refreshStoreStatus =
    useCallback(async (): Promise<StoreStatus | null> => {
      try {
        const response = await axios.get<StoreStatusResponse>(
          "/api/store/status",
          {
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },

            params: {
              timestamp: Date.now(),
            },
          },
        );

        if (!response.data.success || !response.data.store) {
          throw new Error(
            response.data.message ||
              "A API não retornou o funcionamento da loja.",
          );
        }

        setStore(response.data.store);
        setError("");

        return response.data.store;
      } catch (requestError) {
        console.error(
          "[StoreStatusProvider] Erro ao consultar loja:",
          requestError,
        );

        setError(getRequestErrorMessage(requestError));

        /*
         * Em caso de falha, não alteramos o último status
         * confirmado. Se ainda não houver status, isOpen
         * continuará false por segurança.
         */
        return null;
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    let active = true;

    async function loadStoreStatus(): Promise<void> {
      if (!active) {
        return;
      }

      await refreshStoreStatus();
    }

    /*
     * O timeout evita iniciar uma atualização de estado
     * diretamente no corpo síncrono do effect.
     */
    const initialTimeout = window.setTimeout(() => {
      void loadStoreStatus();
    }, 0);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadStoreStatus();
      }
    }, 30_000);

    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible") {
        void loadStoreStatus();
      }
    }

    function handleWindowFocus(): void {
      void loadStoreStatus();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      active = false;

      window.clearTimeout(initialTimeout);

      window.clearInterval(intervalId);

      document.removeEventListener("visibilitychange", handleVisibilityChange);

      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [refreshStoreStatus]);

  const value = useMemo<StoreStatusContextData>(
    () => ({
      store,

      /*
       * A loja só é considerada aberta quando a API
       * confirmou explicitamente isOpen === true.
       */
      isOpen: store?.isOpen === true,

      isLoading,
      error,
      refreshStoreStatus,
    }),
    [store, isLoading, error, refreshStoreStatus],
  );

  return (
    <StoreStatusContext.Provider value={value}>
      {children}
    </StoreStatusContext.Provider>
  );
}

export function useStoreStatus(): StoreStatusContextData {
  const context = useContext(StoreStatusContext);

  if (!context) {
    throw new Error(
      "useStoreStatus precisa ser usado dentro de StoreStatusProvider.",
    );
  }

  return context;
}

export function getDefaultClosedMessage(): string {
  return DEFAULT_CLOSED_MESSAGE;
}

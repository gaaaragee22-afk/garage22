"use client";

import axios from "axios";
import {
  Clock3,
  LoaderCircle,
  LockKeyhole,
  RefreshCcw,
  Store,
} from "lucide-react";
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
  isRefreshing: boolean;
  error: string;
  refreshStoreStatus: () => Promise<StoreStatus | null>;
}

interface StoreClosedBannerProps {
  children: ReactNode;
}

const DEFAULT_CLOSED_MESSAGE =
  "No momento, nossa loja está fechada para novos pedidos.";

const StoreStatusContext = createContext<StoreStatusContextData | null>(null);

export function useStoreStatus(): StoreStatusContextData {
  const context = useContext(StoreStatusContext);

  if (!context) {
    throw new Error(
      "useStoreStatus precisa ser usado dentro de StoreClosedBanner.",
    );
  }

  return context;
}

export default function StoreClosedBanner({
  children,
}: StoreClosedBannerProps) {
  const [store, setStore] = useState<StoreStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refreshStoreStatus =
    useCallback(async (): Promise<StoreStatus | null> => {
      try {
        setError("");

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

        return response.data.store;
      } catch (requestError) {
        console.error(
          "[StoreClosedBanner] Erro ao consultar funcionamento:",
          requestError,
        );

        setError(
          axios.isAxiosError<StoreStatusResponse>(requestError)
            ? requestError.response?.data?.message ||
                "Não foi possível consultar o funcionamento da loja."
            : "Não foi possível consultar o funcionamento da loja.",
        );

        return null;
      }
    }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialStatus() {
      try {
        setIsLoading(true);

        const status = await refreshStoreStatus();

        if (!active) {
          return;
        }

        if (!status) {
          console.warn(
            "[StoreClosedBanner] Funcionamento não confirmado. Pedidos continuarão bloqueados.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialStatus();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshStoreStatus();
      }
    }, 30_000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshStoreStatus();
      }
    }

    window.addEventListener("focus", handleVisibilityChange);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;

      window.clearInterval(intervalId);

      window.removeEventListener("focus", handleVisibilityChange);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshStoreStatus]);

  async function handleRefresh() {
    try {
      setIsRefreshing(true);

      await refreshStoreStatus();
    } finally {
      setIsRefreshing(false);
    }
  }

  const contextValue = useMemo<StoreStatusContextData>(
    () => ({
      store,

      /*
       * Enquanto não for possível confirmar o funcionamento,
       * a loja é considerada fechada por segurança.
       */
      isOpen: store?.isOpen === true,

      isLoading,
      isRefreshing,
      error,
      refreshStoreStatus,
    }),
    [store, isLoading, isRefreshing, error, refreshStoreStatus],
  );

  const isOpen = store?.isOpen === true;
  const showClosedState = !isLoading && !isOpen;

  if (isLoading) {
    return (
      <StoreStatusContext.Provider value={contextValue}>
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="flex flex-col items-center gap-3">
            <LoaderCircle size={30} className="animate-spin text-[#7f3c19]" />

            <span className="text-sm font-bold text-zinc-500">
              Consultando funcionamento...
            </span>
          </div>
        </div>
      </StoreStatusContext.Provider>
    );
  }

  return (
    <StoreStatusContext.Provider value={contextValue}>
      {!isOpen && (
        <div className="sticky top-0 z-[80] border-b border-red-200 bg-red-50">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <LockKeyhole size={20} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

                  <strong className="text-sm font-black text-red-900">
                    Loja fechada para pedidos
                  </strong>
                </div>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-red-700">
                  {store?.closedMessage || DEFAULT_CLOSED_MESSAGE}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void handleRefresh();
              }}
              disabled={isRefreshing}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw
                size={17}
                className={isRefreshing ? "animate-spin" : ""}
              />

              {isRefreshing ? "Verificando..." : "Verificar novamente"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-800">
          {error}
        </div>
      )}

      {children}

      {showClosedState && (
        <div className="fixed bottom-4 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-3xl border border-zinc-700 bg-zinc-950 p-4 text-white shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Store size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-black">
                Pedidos indisponíveis
              </strong>

              <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                <Clock3 size={13} />
                Aguarde a loja reabrir.
              </div>
            </div>
          </div>
        </div>
      )}
    </StoreStatusContext.Provider>
  );
}

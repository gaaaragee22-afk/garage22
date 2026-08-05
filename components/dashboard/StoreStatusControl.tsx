"use client";

import axios, { AxiosError } from "axios";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  Power,
  Store,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface StoreStatus {
  isOpen: boolean;
  closedMessage: string;
  lastStatusChangeAt: string;
  updatedAt: string;
}

interface StoreStatusResponse {
  success: boolean;
  message?: string;
  store: StoreStatus;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Não foi possível alterar o funcionamento da loja.";
  }

  const axiosError = error as AxiosError<ApiErrorResponse>;

  return (
    axiosError.response?.data?.message ||
    "Não foi possível alterar o funcionamento da loja."
  );
}

function formatStatusDate(value?: string): string {
  if (!value) {
    return "Horário não informado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Horário não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function StoreStatusControl() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [store, setStore] = useState<StoreStatus | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isUpdating, setIsUpdating] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);

  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [closedMessage, setClosedMessage] = useState(
    "No momento, nossa loja está fechada para novos pedidos.",
  );

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStoreStatus() {
      try {
        const response = await axios.get<StoreStatusResponse>(
          "/api/store/status",
          {
            signal: controller.signal,

            headers: {
              "Cache-Control": "no-cache",
            },
          },
        );

        if (controller.signal.aborted) {
          return;
        }

        setStore(response.data.store);

        setClosedMessage(
          response.data.store.closedMessage ||
            "No momento, nossa loja está fechada para novos pedidos.",
        );

        setError("");
      } catch (requestError) {
        if (controller.signal.aborted || axios.isCancel(requestError)) {
          return;
        }

        setError(getErrorMessage(requestError));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void fetchStoreStatus();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSuccessMessage("");
    }, 3500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [successMessage]);

  async function updateStoreStatus(nextStatus: boolean) {
    try {
      setIsUpdating(true);
      setError("");
      setSuccessMessage("");

      const response = await axios.put<StoreStatusResponse>(
        "/api/store/status",
        {
          isOpen: nextStatus,
          closedMessage: closedMessage.trim(),
        },
      );

      setStore(response.data.store);

      setSuccessMessage(
        response.data.message ||
          (nextStatus
            ? "Loja aberta com sucesso."
            : "Loja fechada com sucesso."),
      );

      setConfirmationOpen(false);
      setMenuOpen(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsUpdating(false);
    }
  }

  function handleMainButtonClick() {
    if (!store || isUpdating) {
      return;
    }

    if (store.isOpen) {
      setConfirmationOpen(true);
      setMenuOpen(false);

      return;
    }

    void updateStoreStatus(true);
  }

  if (isLoading) {
    return (
      <div className="flex h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-500">
        <LoaderCircle size={17} className="animate-spin" />

        <span className="hidden xl:inline">Consultando loja...</span>
      </div>
    );
  }

  const isOpen = store?.isOpen ?? false;

  return (
    <>
      <div ref={containerRef} className="relative">
        <div
          className={`flex h-11 items-center overflow-hidden rounded-2xl border shadow-sm transition ${
            isOpen
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <button
            type="button"
            onClick={handleMainButtonClick}
            disabled={isUpdating || !store}
            className={`flex h-full items-center gap-2 px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isOpen
                ? "text-emerald-700 hover:bg-emerald-100"
                : "text-red-700 hover:bg-red-100"
            }`}
            aria-label={
              isOpen
                ? "Fechar loja para novos pedidos"
                : "Abrir loja para novos pedidos"
            }
          >
            {isUpdating ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <span className="relative flex h-3 w-3">
                {isOpen && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                )}

                <span
                  className={`relative inline-flex h-3 w-3 rounded-full ${
                    isOpen ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
              </span>
            )}

            <span className="hidden sm:inline">
              {isUpdating
                ? "Alterando..."
                : isOpen
                  ? "Loja aberta"
                  : "Loja fechada"}
            </span>

            <span className="sm:hidden">{isOpen ? "Aberta" : "Fechada"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen((current) => !current);
            }}
            disabled={isUpdating}
            className={`flex h-full w-9 items-center justify-center border-l transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isOpen
                ? "border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : "border-red-200 text-red-700 hover:bg-red-100"
            }`}
            aria-label="Abrir opções da loja"
            aria-expanded={menuOpen}
          >
            <ChevronDown
              size={16}
              className={`transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/15">
            <div className="border-b border-zinc-100 p-5">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    isOpen
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <Store size={20} />
                </div>

                <div>
                  <strong className="block text-sm font-black text-zinc-950">
                    Funcionamento da loja
                  </strong>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Controle o recebimento de novos pedidos.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div
                className={`rounded-2xl border p-4 ${
                  isOpen
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isOpen ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />

                  <strong
                    className={`text-sm font-black ${
                      isOpen ? "text-emerald-800" : "text-red-800"
                    }`}
                  >
                    {isOpen ? "Recebendo pedidos" : "Pedidos suspensos"}
                  </strong>
                </div>

                <p
                  className={`mt-2 text-xs leading-5 ${
                    isOpen ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {isOpen
                    ? "Os clientes podem finalizar novos pedidos normalmente."
                    : "O cardápio continua visível, mas novos pedidos ficam bloqueados."}
                </p>
              </div>

              <div className="mt-4 flex items-start gap-2 text-xs text-zinc-500">
                <Clock3 size={15} className="mt-0.5 shrink-0" />

                <span>
                  Última alteração:{" "}
                  {formatStatusDate(store?.lastStatusChangeAt)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleMainButtonClick}
                disabled={isUpdating}
                className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isOpen
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isUpdating ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Power size={18} />
                )}

                {isOpen ? "Fechar para pedidos" : "Abrir para pedidos"}
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmationOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-100 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <LockKeyhole size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
                    Fechar a loja?
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Novos pedidos serão bloqueados imediatamente.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmationOpen(false);
                }}
                disabled={isUpdating}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Cancelar fechamento"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-6">
              <label
                htmlFor="closed-message"
                className="text-sm font-black text-zinc-800"
              >
                Mensagem exibida aos clientes
              </label>

              <textarea
                id="closed-message"
                value={closedMessage}
                onChange={(event) => {
                  setClosedMessage(event.target.value);
                }}
                maxLength={300}
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100"
                placeholder="Informe aos clientes que a loja está fechada."
              />

              <div className="mt-2 flex justify-between gap-4 text-xs text-zinc-400">
                <span>Essa mensagem aparecerá no cardápio.</span>

                <span>{closedMessage.length}/300</span>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmationOpen(false);
                  }}
                  disabled={isUpdating}
                  className="flex h-12 items-center justify-center rounded-2xl border border-zinc-200 px-5 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void updateStoreStatus(false);
                  }}
                  disabled={isUpdating || !closedMessage.trim()}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdating ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Power size={18} />
                  )}

                  {isUpdating ? "Fechando..." : "Confirmar fechamento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(error || successMessage) && (
        <div className="fixed bottom-5 right-5 z-[110] w-[calc(100%-2.5rem)] max-w-sm">
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl ${
              error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                error ? "bg-red-100" : "bg-emerald-100"
              }`}
            >
              {error ? <AlertCircle size={18} /> : <Check size={18} />}
            </div>

            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-black">
                {error ? "Não foi possível alterar" : "Alteração concluída"}
              </strong>

              <p className="mt-1 text-sm leading-5">
                {error || successMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccessMessage("");
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition hover:bg-black/5"
              aria-label="Fechar mensagem"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

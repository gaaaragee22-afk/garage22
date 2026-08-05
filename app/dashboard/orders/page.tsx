"use client";

import axios, { AxiosError } from "axios";
import {
  AlertCircle,
  ChevronRight,
  ClipboardList,
  LoaderCircle,
  RefreshCcw,
  Search,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  AdminOrder,
  OrdersResponse,
  OrderStatus,
} from "@/types/admin-order";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

const statusFilters: Array<{
  value: "all" | OrderStatus;
  label: string;
}> = [
  {
    value: "all",
    label: "Todos",
  },
  {
    value: "pending",
    label: "Recebidos",
  },
  {
    value: "confirmed",
    label: "Confirmados",
  },
  {
    value: "preparing",
    label: "Preparando",
  },
  {
    value: "out_for_delivery",
    label: "Em entrega",
  },
  {
    value: "delivered",
    label: "Entregues",
  },
  {
    value: "canceled",
    label: "Cancelados",
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, "");

  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(
      2,
      7,
    )}-${numbers.slice(7)}`;
  }

  if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(
      2,
      6,
    )}-${numbers.slice(6)}`;
  }

  return value;
}

function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: "Pedido recebido",
    confirmed: "Confirmado",
    preparing: "Preparando",
    out_for_delivery: "Saiu para entrega",
    delivered: "Entregue",
    canceled: "Cancelado",
  };

  return labels[status];
}

function getStatusClasses(status: OrderStatus): string {
  const classes: Record<OrderStatus, string> = {
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-blue-50 text-blue-700",
    preparing: "bg-orange-50 text-orange-700",
    out_for_delivery: "bg-violet-50 text-violet-700",
    delivered: "bg-emerald-50 text-emerald-700",
    canceled: "bg-red-50 text-red-700",
  };

  return classes[status];
}

function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Não foi possível carregar os pedidos.";
  }

  const axiosError = error as AxiosError<ApiErrorResponse>;

  return (
    axiosError.response?.data?.message ||
    axiosError.response?.data?.error ||
    "Não foi possível carregar os pedidos."
  );
}

function extractOrders(
  responseData: OrdersResponse | AdminOrder[],
): AdminOrder[] {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  return responseData.orders ?? [];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState<"all" | OrderStatus>("all");

  const [isLoading, setIsLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    axios
      .get<OrdersResponse | AdminOrder[]>("/api/orders", {
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        const loadedOrders = extractOrders(response.data);

        setOrders(loadedOrders);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted || axios.isCancel(requestError)) {
          return;
        }

        setOrders([]);
        setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  async function handleRefreshOrders() {
    try {
      setIsRefreshing(true);
      setError("");

      const response = await axios.get<OrdersResponse | AdminOrder[]>(
        "/api/orders",
        {
          params: {
            timestamp: Date.now(),
          },
        },
      );

      const loadedOrders = extractOrders(response.data);

      setOrders(loadedOrders);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsRefreshing(false);
    }
  }

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...orders]
      .sort((orderA, orderB) => {
        const dateA = new Date(orderA.createdAt).getTime();

        const dateB = new Date(orderB.createdAt).getTime();

        return dateB - dateA;
      })
      .filter((order) => {
        return status === "all" || order.status === status;
      })
      .filter((order) => {
        if (!normalizedSearch) {
          return true;
        }

        const orderNumber = String(order.orderNumber).toLowerCase();

        const customerName = order.customer.name?.trim().toLowerCase() ?? "";

        const customerPhone =
          order.customer.phone?.replace(/\D/g, "").toLowerCase() ?? "";

        const formattedPhone = formatPhone(
          order.customer.phone ?? "",
        ).toLowerCase();

        const street = order.address.street?.trim().toLowerCase() ?? "";

        const neighborhood =
          order.address.neighborhood?.trim().toLowerCase() ?? "";

        return (
          orderNumber.includes(normalizedSearch) ||
          customerName.includes(normalizedSearch) ||
          customerPhone.includes(normalizedSearch.replace(/\D/g, "")) ||
          formattedPhone.includes(normalizedSearch) ||
          street.includes(normalizedSearch) ||
          neighborhood.includes(normalizedSearch)
        );
      });
  }, [orders, search, status]);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">
              Administração
            </span>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
              Pedidos
            </h1>

            <p className="mt-2 text-sm text-zinc-500 sm:text-base">
              Acompanhe as comandas e o andamento de cada entrega.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleRefreshOrders();
            }}
            disabled={isLoading || isRefreshing}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw
              size={17}
              className={isRefreshing ? "animate-spin" : ""}
            />

            {isRefreshing ? "Atualizando..." : "Atualizar"}
          </button>
        </header>

        <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder="Buscar número, cliente, telefone ou rua..."
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "all" | OrderStatus);
              }}
              className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold text-zinc-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              {statusFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />

            <div>
              <strong className="block text-sm font-black">
                Não foi possível carregar os pedidos
              </strong>

              <p className="mt-1 text-sm font-semibold">{error}</p>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex min-h-96 flex-col items-center justify-center gap-3">
              <LoaderCircle
                size={30}
                className="animate-spin text-orange-500"
              />

              <span className="text-sm font-bold text-zinc-500">
                Carregando pedidos...
              </span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex min-h-96 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-500">
                <ClipboardList size={30} />
              </div>

              <strong className="mt-4 text-lg font-black">
                {orders.length === 0
                  ? "Nenhum pedido cadastrado"
                  : "Nenhum pedido encontrado"}
              </strong>

              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                {orders.length === 0
                  ? "Os novos pedidos aparecerão aqui assim que forem realizados."
                  : "Altere a busca ou o filtro de status selecionado."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filteredOrders.map((order) => {
                const customerIdentification =
                  order.customer.name?.trim() ||
                  formatPhone(order.customer.phone);

                const totalItems = order.items.reduce(
                  (total, item) => total + item.quantity,
                  0,
                );

                return (
                  <Link
                    key={order._id}
                    href={`/dashboard/orders/${order._id}`}
                    aria-label={`Abrir pedido número ${order.orderNumber}`}
                    className="group flex flex-col gap-4 p-5 transition hover:bg-orange-50/50 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 transition group-hover:bg-orange-100 group-hover:text-orange-600">
                        <ShoppingBag size={20} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="font-black">
                            #{order.orderNumber}
                          </strong>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-black ${getStatusClasses(
                              order.status,
                            )}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-sm text-zinc-500">
                          {customerIdentification} · {totalItems}{" "}
                          {totalItems === 1 ? "item" : "itens"}
                        </p>

                        <p className="mt-1 truncate text-xs text-zinc-400">
                          {order.address.street}, {order.address.number} ·{" "}
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-5 sm:justify-end">
                      <strong className="font-black">
                        {formatCurrency(order.total)}
                      </strong>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition group-hover:bg-white group-hover:text-orange-600">
                        <ChevronRight size={19} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

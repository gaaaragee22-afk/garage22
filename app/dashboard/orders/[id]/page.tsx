"use client";

import axios, { AxiosError } from "axios";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  ChefHat,
  Clock3,
  CreditCard,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Phone,
  Printer,
  RefreshCcw,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type {
  AdminOrder,
  OrderResponse,
  OrderStatus,
} from "@/types/admin-order";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

interface StatusOption {
  value: OrderStatus;
  label: string;
}

const statusOptions: StatusOption[] = [
  {
    value: "pending",
    label: "Pedido recebido",
  },
  {
    value: "confirmed",
    label: "Pedido confirmado",
  },
  {
    value: "preparing",
    label: "Em preparação",
  },
  {
    value: "out_for_delivery",
    label: "Saiu para entrega",
  },
  {
    value: "delivered",
    label: "Pedido entregue",
  },
  {
    value: "canceled",
    label: "Pedido cancelado",
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
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function formatCep(value: string): string {
  const numbers = value.replace(/\D/g, "");

  if (numbers.length !== 8) {
    return value;
  }

  return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
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

function getRequestErrorMessage(
  requestError: unknown,
  fallbackMessage: string,
): string {
  if (!axios.isAxiosError(requestError)) {
    return fallbackMessage;
  }

  const axiosError = requestError as AxiosError<ApiErrorResponse>;

  return (
    axiosError.response?.data?.message ||
    axiosError.response?.data?.error ||
    fallbackMessage
  );
}

function getStatusLabel(status: OrderStatus): string {
  const option = statusOptions.find(
    (statusOption) => statusOption.value === status,
  );

  return option?.label ?? "Status não informado";
}

function getStatusClasses(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "confirmed":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "preparing":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "out_for_delivery":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "delivered":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "canceled":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }
}

function renderStatusIcon(status: OrderStatus) {
  switch (status) {
    case "pending":
      return <Clock3 size={15} />;

    case "confirmed":
      return <CheckCircle2 size={15} />;

    case "preparing":
      return <ChefHat size={15} />;

    case "out_for_delivery":
      return <Truck size={15} />;

    case "delivered":
      return <PackageCheck size={15} />;

    case "canceled":
      return <XCircle size={15} />;

    default:
      return null;
  }
}

function getPaymentLabel(order: AdminOrder): string {
  if (order.payment.method === "pix") {
    return "Pix";
  }

  if (order.payment.method === "cash") {
    return "Dinheiro";
  }

  if (order.payment.cardType === "credit") {
    return "Cartão de crédito";
  }

  if (order.payment.cardType === "debit") {
    return "Cartão de débito";
  }

  return "Cartão";
}

function getCardBrandLabel(brand: AdminOrder["payment"]["cardBrand"]): string {
  switch (brand) {
    case "visa":
      return "Visa";

    case "mastercard":
      return "Mastercard";

    case "elo":
      return "Elo";

    case "hipercard":
      return "Hipercard";

    case "amex":
      return "American Express";

    case "other":
      return "Outra bandeira";

    default:
      return "";
  }
}

export default function OrderDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

  const router = useRouter();

  const orderId = params.id;

  const [order, setOrder] = useState<AdminOrder | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("pending");

  const [isLoading, setIsLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    axios
      .get<OrderResponse>(`/api/orders/${orderId}`, {
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setOrder(response.data.order);
        setSelectedStatus(response.data.order.status);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted || axios.isCancel(requestError)) {
          return;
        }

        setOrder(null);

        setError(
          getRequestErrorMessage(
            requestError,
            "Não foi possível carregar o pedido.",
          ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [orderId]);

  async function handleRefreshOrder(): Promise<void> {
    try {
      setIsRefreshing(true);
      setError("");
      setSuccessMessage("");

      const response = await axios.get<OrderResponse>(
        `/api/orders/${orderId}`,
        {
          params: {
            timestamp: Date.now(),
          },
        },
      );

      setOrder(response.data.order);
      setSelectedStatus(response.data.order.status);
    } catch (requestError: unknown) {
      setError(
        getRequestErrorMessage(
          requestError,
          "Não foi possível atualizar os dados do pedido.",
        ),
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleUpdateStatus(): Promise<void> {
    if (!order) {
      return;
    }

    if (selectedStatus === order.status) {
      setSuccessMessage("O pedido já está com esse status.");
      return;
    }

    if (selectedStatus === "canceled") {
      const shouldCancelOrder = window.confirm(
        `Tem certeza de que deseja cancelar o pedido #${order.orderNumber}?\n\nO pedido será registrado no relatório como cancelado e removido da lista de pedidos ativos.`,
      );

      if (!shouldCancelOrder) {
        setSelectedStatus(order.status);
        return;
      }

      try {
        setIsUpdatingStatus(true);
        setError("");
        setSuccessMessage("");

        await axios.patch(`/api/orders/${order._id}/status`, {
          status: "canceled",
        });

        router.replace("/dashboard/orders");
        router.refresh();
      } catch (requestError: unknown) {
        setError(
          getRequestErrorMessage(
            requestError,
            "Não foi possível cancelar e registrar o pedido no relatório.",
          ),
        );

        setSelectedStatus(order.status);
        setIsUpdatingStatus(false);
      }

      return;
    }

    try {
      setIsUpdatingStatus(true);
      setError("");
      setSuccessMessage("");

      const response = await axios.patch<OrderResponse>(
        `/api/orders/${order._id}/status`,
        {
          status: selectedStatus,
        },
      );

      if (selectedStatus === "delivered") {
        router.replace("/dashboard/orders");
        router.refresh();
        return;
      }

      if (!response.data.order) {
        throw new Error("A API não retornou os dados atualizados do pedido.");
      }

      setOrder(response.data.order);
      setSelectedStatus(response.data.order.status);

      setSuccessMessage(
        response.data.message ?? "Status atualizado com sucesso.",
      );
    } catch (requestError: unknown) {
      setError(
        getRequestErrorMessage(
          requestError,
          "Não foi possível atualizar o status.",
        ),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const totalItems = useMemo(() => {
    return order?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  }, [order]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle size={34} className="animate-spin text-orange-500" />

          <span className="text-sm font-bold text-zinc-500">
            Carregando comanda...
          </span>
        </div>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle size={46} className="mx-auto text-red-500" />

          <h1 className="mt-5 text-2xl font-black text-zinc-950">
            Pedido não encontrado
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">{error}</p>

          <Link
            href="/dashboard/orders"
            className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-6 text-sm font-black text-white transition hover:bg-orange-500"
          >
            <ArrowLeft size={18} />
            Voltar aos pedidos
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return null;
  }

  const customerName = order.customer.name?.trim() || "Cliente não informado";

  const customerPhone =
    order.customer.phone?.trim() || "Telefone não informado";

  const addressStreet = order.address.street?.trim() || "Rua não informada";

  const addressNumber = order.address.number?.trim() || "S/N";

  const addressNeighborhood =
    order.address.neighborhood?.trim() || "Bairro não informado";

  const addressCity = order.address.city?.trim() || "Cidade não informada";

  const addressState = order.address.state?.trim() || "";

  const addressCep = order.address.cep?.trim() || "CEP não informado";

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <Link
                href="/dashboard/orders"
                className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-orange-600"
              >
                <ArrowLeft size={17} />
                Voltar aos pedidos
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                  Pedido #{order.orderNumber}
                </h1>

                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClasses(
                    order.status,
                  )}`}
                >
                  {renderStatusIcon(order.status)}

                  {getStatusLabel(order.status)}
                </span>
              </div>

              <p className="mt-2 text-sm text-zinc-500">
                Recebido em {formatDate(order.createdAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  void handleRefreshOrder();
                }}
                disabled={isRefreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw
                  size={17}
                  className={isRefreshing ? "animate-spin" : ""}
                />

                {isRefreshing ? "Atualizando..." : "Atualizar"}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-orange-500"
              >
                <Printer size={17} />
                Imprimir comanda
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />

            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <Check size={20} className="mt-0.5 shrink-0" />

            <p className="text-sm font-semibold">{successMessage}</p>
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-black">Comanda do pedido</h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {totalItems} {totalItems === 1 ? "produto" : "produtos"} no
                  pedido.
                </p>
              </div>

              <div className="divide-y divide-zinc-100">
                {order.items.map((item, index) => (
                  <article
                    key={item._id ?? `${item.productId}-${index}`}
                    className="flex gap-4 p-5 sm:p-6"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-lg font-black text-orange-600">
                      {item.quantity}x
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                          <h3 className="font-black text-zinc-950">
                            {item.name}
                          </h3>

                          {item.description && (
                            <p className="mt-1 text-sm leading-6 text-zinc-500">
                              {item.description}
                            </p>
                          )}

                          <p className="mt-2 text-xs font-bold text-zinc-400">
                            Valor unitário: {formatCurrency(item.price)}
                          </p>
                        </div>

                        <strong className="shrink-0 text-base font-black text-zinc-950">
                          {formatCurrency(item.total)}
                        </strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="border-t border-zinc-200 bg-zinc-50 p-5 sm:p-6">
                <div className="space-y-3">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-zinc-500">Subtotal</span>

                    <strong>{formatCurrency(order.subtotal)}</strong>
                  </div>

                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-zinc-500">Taxa de entrega</span>

                    <strong>{formatCurrency(order.deliveryFee)}</strong>
                  </div>

                  <div className="flex items-end justify-between gap-4 border-t border-zinc-200 pt-4">
                    <span className="text-base font-black">
                      Total do pedido
                    </span>

                    <strong className="text-2xl font-black text-orange-600">
                      {formatCurrency(order.total)}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                  <MapPin size={21} />
                </div>

                <div>
                  <h2 className="font-black">Endereço de entrega</h2>

                  <p className="text-sm text-zinc-500">
                    Local informado pelo cliente.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-zinc-50 p-5">
                <strong className="block text-base text-zinc-950">
                  {addressStreet}, {addressNumber}
                </strong>

                <p className="mt-2 text-sm leading-7 text-zinc-600">
                  Bairro: {addressNeighborhood}
                  <br />
                  {order.address.complement && (
                    <>
                      Complemento: {order.address.complement}
                      <br />
                    </>
                  )}
                  {addressCity}
                  {addressState ? ` - ${addressState}` : ""}
                  <br />
                  CEP: {formatCep(addressCep)}
                </p>

                {order.address.reference && (
                  <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 p-4">
                    <span className="text-xs font-black uppercase tracking-wide text-orange-700">
                      Ponto de referência
                    </span>

                    <p className="mt-1 text-sm font-semibold text-orange-800">
                      {order.address.reference}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6">
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black">Atualizar andamento</h2>

              <p className="mt-1 text-sm leading-6 text-zinc-500">
                O cliente verá esta alteração na página de acompanhamento.
              </p>

              <label
                htmlFor="order-status"
                className="mt-5 block text-sm font-black text-zinc-700"
              >
                Situação do pedido
              </label>

              <select
                id="order-status"
                value={selectedStatus}
                onChange={(event) => {
                  setSelectedStatus(event.target.value as OrderStatus);
                  setSuccessMessage("");
                }}
                disabled={isUpdatingStatus}
                className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold text-zinc-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  void handleUpdateStatus();
                }}
                disabled={isUpdatingStatus || selectedStatus === order.status}
                className={`mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-zinc-300 ${
                  selectedStatus === "canceled"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                {isUpdatingStatus ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />

                    {selectedStatus === "canceled"
                      ? "Cancelando pedido..."
                      : selectedStatus === "delivered"
                        ? "Finalizando pedido..."
                        : "Atualizando..."}
                  </>
                ) : selectedStatus === "canceled" ? (
                  <>
                    <XCircle size={18} />
                    Cancelar e excluir pedido
                  </>
                ) : selectedStatus === "delivered" ? (
                  <>
                    <PackageCheck size={18} />
                    Entregar e registrar no relatório
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Salvar novo status
                  </>
                )}
              </button>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black">Cliente</h2>

              <div className="mt-5 space-y-5">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wide text-zinc-400">
                    Nome
                  </span>

                  <strong className="mt-1 block text-zinc-950">
                    {customerName}
                  </strong>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Phone size={20} />
                  </div>

                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wide text-zinc-400">
                      Telefone
                    </span>

                    {order.customer.phone ? (
                      <a
                        href={`tel:${order.customer.phone}`}
                        className="mt-1 block font-black text-zinc-950 transition hover:text-orange-600"
                      >
                        {formatPhone(customerPhone)}
                      </a>
                    ) : (
                      <strong className="mt-1 block text-zinc-950">
                        {customerPhone}
                      </strong>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black">Pagamento</h2>

              <div className="mt-5 flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  {order.payment.method === "cash" ? (
                    <Banknote size={21} />
                  ) : (
                    <CreditCard size={21} />
                  )}
                </div>

                <div>
                  <span className="block text-xs font-bold uppercase tracking-wide text-zinc-400">
                    Forma de pagamento
                  </span>

                  <strong className="mt-1 block text-zinc-950">
                    {getPaymentLabel(order)}
                  </strong>

                  {order.payment.cardBrand && (
                    <span className="mt-1 block text-sm text-zinc-500">
                      Bandeira: {getCardBrandLabel(order.payment.cardBrand)}
                    </span>
                  )}
                </div>
              </div>

              {order.payment.method === "cash" &&
                order.payment.changeFor !== null && (
                  <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                    <span className="block text-xs font-black uppercase tracking-wide text-emerald-700">
                      Troco para
                    </span>

                    <strong className="mt-1 block text-lg text-emerald-800">
                      {formatCurrency(order.payment.changeFor)}
                    </strong>

                    <span className="mt-2 block text-sm text-emerald-700">
                      Troco:{" "}
                      {formatCurrency(
                        Math.max(order.payment.changeFor - order.total, 0),
                      )}
                    </span>
                  </div>
                )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

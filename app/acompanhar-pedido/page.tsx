"use client";

import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  Clock3,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  Search,
  Truck,
  XCircle,
} from "lucide-react";

import { formatCurrency } from "@/utils/format";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "canceled";

interface TrackedOrderItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface TrackedOrder {
  orderNumber: string;

  customer: {
    phone: string;
  };

  address: {
    neighborhood: string;
    city: string;
    state: string;
  };

  items: TrackedOrderItem[];

  payment: {
    method: "cash" | "pix" | "card";
    cardType: "debit" | "credit" | null;
  };

  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

interface TrackOrderResponse {
  success: boolean;
  message?: string;
  order?: TrackedOrder;
}

interface OrderStep {
  status: OrderStatus;
  title: string;
  description: string;
}

const orderSteps: OrderStep[] = [
  {
    status: "pending",
    title: "Pedido recebido",
    description: "O estabelecimento recebeu o seu pedido.",
  },
  {
    status: "confirmed",
    title: "Pedido confirmado",
    description: "O pedido foi confirmado pelo estabelecimento.",
  },
  {
    status: "preparing",
    title: "Em preparação",
    description: "Seu pedido está sendo preparado.",
  },
  {
    status: "out_for_delivery",
    title: "Saiu para entrega",
    description: "O pedido está a caminho do endereço informado.",
  },
  {
    status: "delivered",
    title: "Pedido entregue",
    description: "O pedido foi finalizado com sucesso.",
  },
];

const statusOrder: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  out_for_delivery: 3,
  delivered: 4,
  completed: 4,
  canceled: -1,
};

function normalizeOrderNumber(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getPaymentLabel(order: TrackedOrder): string {
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

function getStepIcon(status: OrderStatus) {
  if (status === "pending") {
    return ReceiptText;
  }

  if (status === "confirmed") {
    return CheckCircle2;
  }

  if (status === "preparing") {
    return ChefHat;
  }

  if (status === "out_for_delivery") {
    return Truck;
  }

  return PackageCheck;
}

function TrackOrderContent() {
  const searchParams = useSearchParams();

  const initialSearchStarted = useRef(false);

  const codeFromUrl = normalizeOrderNumber(searchParams.get("codigo") ?? "");

  const [orderNumber, setOrderNumber] = useState(codeFromUrl);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const trackOrder = useCallback(async (value: string): Promise<void> => {
    const sanitizedOrderNumber = normalizeOrderNumber(value);

    if (!sanitizedOrderNumber) {
      setError("Informe o código do pedido.");
      setOrder(null);

      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setOrder(null);

      const response = await fetch(
        `/api/orders/track/${encodeURIComponent(sanitizedOrderNumber)}`,
        {
          method: "GET",
          cache: "no-store",

          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
      );

      const data = (await response.json()) as TrackOrderResponse;

      if (!response.ok || !data.order) {
        throw new Error(data.message ?? "Pedido não encontrado.");
      }

      setOrder(data.order);
      setOrderNumber(data.order.orderNumber);
    } catch (requestError) {
      console.error("[TrackOrderPage] Erro ao consultar pedido:", requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível consultar o pedido.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!codeFromUrl || initialSearchStarted.current) {
      return;
    }

    initialSearchStarted.current = true;

    const timeoutId = window.setTimeout(() => {
      void trackOrder(codeFromUrl);
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [codeFromUrl, trackOrder]);

  async function handleTrackOrder(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    await trackOrder(orderNumber);
  }

  function handleClearSearch(): void {
    setOrder(null);
    setOrderNumber("");
    setError("");

    initialSearchStarted.current = false;

    window.history.replaceState(null, "", "/acompanhar-pedidos");
  }

  const currentStatusIndex = order ? statusOrder[order.status] : -1;

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0 text-xl font-extrabold text-zinc-900"
          >
            Garage
            <span className="text-[#7f3c19]">22</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 transition hover:text-[#7f3c19] sm:gap-2"
          >
            <ChevronLeft size={18} />

            <span className="hidden sm:inline">Voltar ao cardápio</span>

            <span className="sm:hidden">Voltar</span>
          </Link>
        </div>
      </header>

      <section className="border-b border-[#7f5417]/15 bg-gradient-to-b from-[#fdf4c3]/70 to-zinc-50">
        <div className="mx-auto max-w-3xl px-4 py-9 text-center sm:px-6 sm:py-14">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#fdf4c3] text-[#7f3c19] shadow-sm">
            <Truck size={30} />
          </div>

          <h1 className="mt-5 text-3xl font-extrabold text-zinc-900 sm:text-4xl">
            Acompanhe seu pedido
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600 sm:text-base">
            Consulte o código recebido após finalizar a compra para acompanhar
            cada etapa do pedido.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <form
          onSubmit={handleTrackOrder}
          className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <label
            htmlFor="orderNumber"
            className="text-sm font-bold text-zinc-900"
          >
            Código do pedido
          </label>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <ReceiptText
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                id="orderNumber"
                type="text"
                value={orderNumber}
                onChange={(event) => {
                  setOrderNumber(normalizeOrderNumber(event.target.value));

                  if (error) {
                    setError("");
                  }
                }}
                placeholder="Exemplo: 260729123456"
                autoComplete="off"
                className="h-14 w-full rounded-2xl border border-zinc-300 bg-white pl-12 pr-4 font-semibold uppercase text-zinc-900 outline-none transition placeholder:font-normal placeholder:text-zinc-400 focus:border-[#7f3c19] focus:ring-4 focus:ring-[#fdf4c3]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-7 font-bold text-white shadow-[0_10px_25px_rgba(127,60,25,0.18)] transition hover:bg-[#58141e] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isLoading ? (
                <>
                  <LoaderCircle size={20} className="animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Acompanhar
                </>
              )}
            </button>
          </div>

          {orderNumber && isLoading && (
            <p className="mt-3 text-sm font-medium text-[#7f3c19]">
              Consultando automaticamente o pedido #{orderNumber}.
            </p>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />

              <div>
                <p className="font-semibold">
                  Não foi possível localizar o pedido
                </p>

                <p className="mt-1 leading-5">{error}</p>
              </div>
            </div>
          )}
        </form>

        {!order && !error && !isLoading && (
          <div className="mt-6 rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#fdf4c3]/70 text-[#7f5417]">
              <Clock3 size={32} />
            </div>

            <h2 className="mt-4 text-lg font-bold text-zinc-800">
              Consulte o andamento
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              O código do pedido aparece na tela de confirmação depois que a
              compra é finalizada.
            </p>
          </div>
        )}

        {isLoading && !order && (
          <div className="mt-6 flex min-h-52 flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <LoaderCircle size={32} className="animate-spin text-[#7f3c19]" />

            <strong className="mt-4 text-zinc-900">Buscando pedido...</strong>

            <p className="mt-1 text-sm text-zinc-500">
              Aguarde enquanto consultamos o andamento.
            </p>
          </div>
        )}

        {order && (
          <div className="mt-6 space-y-6">
            <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-[#7f5417]/15 bg-[#fdf4c3]/45 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#7f5417]">Pedido</p>

                  <h2 className="mt-1 break-all text-2xl font-extrabold text-zinc-900">
                    #{order.orderNumber}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Realizado em {formatDate(order.createdAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:border-[#7f5417]/50 hover:bg-[#fdf4c3]/55 hover:text-[#7f3c19] sm:w-auto"
                >
                  Consultar outro pedido
                </button>
              </div>

              {order.status === "canceled" ? (
                <div className="p-5 sm:p-7">
                  <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                      <XCircle size={25} />
                    </div>

                    <div>
                      <h3 className="font-bold text-red-800">
                        Pedido cancelado
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-red-700">
                        Este pedido foi cancelado. Entre em contato com o
                        estabelecimento para obter mais informações.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 sm:p-7">
                  <h3 className="text-lg font-bold text-zinc-900">
                    Andamento do pedido
                  </h3>

                  <div className="mt-6">
                    {orderSteps.map((step, index) => {
                      const StepIcon = getStepIcon(step.status);

                      const isCompleted = index < currentStatusIndex;

                      const isCurrent = index === currentStatusIndex;

                      const isActive = isCompleted || isCurrent;

                      const isLast = index === orderSteps.length - 1;

                      return (
                        <div key={step.status} className="relative flex gap-4">
                          {!isLast && (
                            <div
                              className={`absolute left-[23px] top-12 h-[calc(100%-24px)] w-0.5 ${
                                isCompleted ? "bg-emerald-500" : "bg-zinc-200"
                              }`}
                            />
                          )}

                          <div
                            className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition ${
                              isCompleted
                                ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_6px_18px_rgba(16,185,129,0.18)]"
                                : isCurrent
                                  ? "border-[#7f3c19] bg-[#fdf4c3] text-[#7f3c19] shadow-[0_6px_18px_rgba(127,60,25,0.12)]"
                                  : "border-zinc-200 bg-white text-zinc-400"
                            }`}
                          >
                            {isCompleted ? (
                              <Check size={22} strokeWidth={3} />
                            ) : (
                              <StepIcon size={22} />
                            )}
                          </div>

                          <div className={`pb-8 ${isLast ? "pb-0" : ""}`}>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                className={`font-bold ${
                                  isActive ? "text-zinc-900" : "text-zinc-400"
                                }`}
                              >
                                {step.title}
                              </h4>

                              {isCurrent && (
                                <span className="rounded-full bg-[#fdf4c3] px-3 py-1 text-xs font-bold text-[#7f3c19]">
                                  Etapa atual
                                </span>
                              )}
                            </div>

                            <p
                              className={`mt-1 text-sm leading-6 ${
                                isActive ? "text-zinc-600" : "text-zinc-400"
                              }`}
                            >
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
              <h3 className="text-lg font-bold text-zinc-900">
                Informações do pedido
              </h3>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="flex gap-3 rounded-2xl border border-[#7f5417]/10 bg-[#fdf4c3]/35 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fdf4c3] text-[#7f3c19]">
                    <Phone size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#7f5417]">
                      Telefone
                    </p>

                    <p className="mt-1 break-words font-semibold text-zinc-900">
                      {order.customer.phone}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-2xl border border-[#7f5417]/10 bg-[#fdf4c3]/35 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fdf4c3] text-[#7f3c19]">
                    <MapPin size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#7f5417]">
                      Entrega
                    </p>

                    <p className="mt-1 break-words font-semibold text-zinc-900">
                      {order.address.neighborhood}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      {order.address.city} - {order.address.state}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-zinc-200 pt-6">
                <h4 className="font-bold text-zinc-900">Produtos</h4>

                <div className="mt-4 divide-y divide-zinc-100">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-zinc-900">
                          {item.quantity}x {item.name}
                        </p>

                        <p className="mt-1 text-sm text-zinc-500">
                          {formatCurrency(item.price)} cada
                        </p>
                      </div>

                      <p className="shrink-0 font-bold text-zinc-900">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-zinc-200 pt-6">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-500">Forma de pagamento</span>

                  <span className="text-right font-semibold text-zinc-900">
                    {getPaymentLabel(order)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-500">Subtotal</span>

                  <span className="font-semibold text-zinc-900">
                    {formatCurrency(order.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-zinc-500">Taxa de entrega</span>

                  <span className="font-semibold text-zinc-900">
                    {formatCurrency(order.deliveryFee)}
                  </span>
                </div>

                <div className="flex items-end justify-between gap-4 border-t border-zinc-200 pt-4">
                  <span className="font-bold text-zinc-900">Total</span>

                  <strong className="text-2xl text-[#7f3c19]">
                    {formatCurrency(order.total)}
                  </strong>
                </div>
              </div>
            </section>

            <Link
              href="/"
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-6 font-bold text-zinc-700 transition hover:border-[#7f5417]/40 hover:bg-[#fdf4c3] hover:text-[#7f3c19]"
            >
              <ChevronLeft size={19} />
              Voltar ao cardápio
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-5 font-semibold text-zinc-600 shadow-sm">
            <LoaderCircle size={21} className="animate-spin text-[#7f3c19]" />
            Carregando pedido...
          </div>
        </main>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}

"use client";

import axios, { AxiosError } from "axios";
import {
  AlertCircle,
  BarChart3,
  Bell,
  Box,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Package,
  RefreshCcw,
  Search,
  ShoppingBag,
  Store,
  TrendingUp,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import StoreStatusControl from "@/components/dashboard/StoreStatusControl";

import { useAuth } from "@/context/AuthContext";

import type {
  AdminOrder,
  OrdersResponse,
  OrderStatus,
} from "@/types/admin-order";

interface Category {
  _id: string;
  name: string;
  description?: string;
  position?: number;
  active: boolean;
}

interface ProductCategory {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  promotionalPrice?: number | null;
  preparationTime?: number;
  stock?: number;
  trackStock?: boolean;
  active: boolean;
  available?: boolean;
  featured?: boolean;
  categoryId?: ProductCategory | string | null;
  createdAt?: string;
}

interface ProductsResponse {
  products?: Product[];
}

interface CategoriesResponse {
  categories?: Category[];
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

interface DashboardData {
  products: Product[];
  categories: Category[];
  orders: AdminOrder[];
}

interface NavigationItem {
  label: string;
  href: string;
}

interface OrderCreatedEventData {
  type?: string;
  orderId?: string;
  orderNumber?: string;
  createdAt?: string;
}

const navigationItems: NavigationItem[] = [
  {
    label: "Visão geral",
    href: "/dashboard",
  },
  {
    label: "Pedidos",
    href: "/dashboard/orders",
  },
  {
    label: "Relatórios",
    href: "/dashboard/reports",
  },
  {
    label: "Produtos",
    href: "/dashboard/products",
  },
  {
    label: "Categorias",
    href: "/dashboard/categories",
  },
  {
    label: "Loja",
    href: "/",
  },
];

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

function extractProducts(
  responseData: ProductsResponse | Product[],
): Product[] {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  return responseData.products ?? [];
}

function extractCategories(
  responseData: CategoriesResponse | Category[],
): Category[] {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  return responseData.categories ?? [];
}

function extractOrders(
  responseData: OrdersResponse | AdminOrder[],
): AdminOrder[] {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  return responseData.orders ?? [];
}

function sortOrdersByDate(orders: AdminOrder[]): AdminOrder[] {
  return [...orders].sort((orderA, orderB) => {
    const dateA = orderA.createdAt ? new Date(orderA.createdAt).getTime() : 0;

    const dateB = orderB.createdAt ? new Date(orderB.createdAt).getTime() : 0;

    return dateB - dateA;
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date?: string): string {
  if (!date) {
    return "Data não informada";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
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

function getOrderTotal(order: AdminOrder): number {
  return order.total;
}

function getCustomerName(order: AdminOrder): string {
  return formatPhone(order.customer.phone);
}

function getOrderIdentifier(order: AdminOrder): string {
  return `#${order.orderNumber}`;
}

function getOrderItemsQuantity(order: AdminOrder): number {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "Pedido recebido";

    case "confirmed":
      return "Confirmado";

    case "preparing":
      return "Preparando";

    case "out_for_delivery":
      return "Saiu para entrega";

    case "delivered":
      return "Entregue";

    case "canceled":
      return "Cancelado";

    default:
      return "Não informado";
  }
}

function getStatusClasses(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700";

    case "confirmed":
      return "bg-blue-50 text-blue-700";

    case "preparing":
      return "bg-[#fdf4c3] text-[#7f3c19]";

    case "out_for_delivery":
      return "bg-violet-50 text-violet-700";

    case "delivered":
      return "bg-emerald-50 text-emerald-700";

    case "canceled":
      return "bg-red-50 text-red-700";

    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

function isToday(date?: string): boolean {
  if (!date) {
    return false;
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const today = new Date();

  return (
    parsedDate.getDate() === today.getDate() &&
    parsedDate.getMonth() === today.getMonth() &&
    parsedDate.getFullYear() === today.getFullYear()
  );
}

function isPendingOrder(status: OrderStatus): boolean {
  return ["pending", "confirmed", "preparing", "out_for_delivery"].includes(
    status,
  );
}

function renderNavigationIcon(href: string) {
  switch (href) {
    case "/dashboard":
      return <LayoutDashboard size={19} />;

    case "/dashboard/orders":
      return <ClipboardList size={19} />;

    case "/dashboard/reports":
      return <BarChart3 size={19} />;

    case "/dashboard/products":
      return <Package size={19} />;

    case "/dashboard/categories":
      return <Box size={19} />;

    case "/":
      return <Store size={19} />;

    default:
      return null;
  }
}

export default function DashboardPage() {
  const pathname = usePathname();

  const { user, logout, isLoading: authLoading } = useAuth();

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    products: [],
    categories: [],
    orders: [],
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [isLoadingData, setIsLoadingData] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const ordersRequestRunningRef = useRef(false);

  const fetchLatestOrders = useCallback(
    async (showLoading = false): Promise<void> => {
      if (ordersRequestRunningRef.current) {
        return;
      }

      ordersRequestRunningRef.current = true;

      if (showLoading) {
        setIsRefreshingOrders(true);
      }

      try {
        const response = await axios.get<OrdersResponse | AdminOrder[]>(
          "/api/orders",
          {
            params: {
              page: 1,
              limit: 100,
              timestamp: Date.now(),
            },

            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          },
        );

        const updatedOrders = extractOrders(response.data);

        setDashboardData((currentData) => ({
          ...currentData,
          orders: updatedOrders,
        }));
      } catch (requestError) {
        if (axios.isCancel(requestError)) {
          return;
        }

        console.error("[Dashboard] Erro ao atualizar pedidos:", requestError);

        const message = getRequestErrorMessage(
          requestError,
          "Não foi possível atualizar os pedidos recentes.",
        );

        setError((currentError) => {
          if (currentError.includes(message)) {
            return currentError;
          }

          return currentError ? `${currentError} ${message}` : message;
        });
      } finally {
        ordersRequestRunningRef.current = false;

        if (showLoading) {
          setIsRefreshingOrders(false);
        }
      }
    },
    [],
  );

  const fetchDashboardData = useCallback(async (): Promise<void> => {
    const results = await Promise.allSettled([
      axios.get<ProductsResponse | Product[]>("/api/products", {
        params: {
          timestamp: Date.now(),
        },

        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }),

      axios.get<CategoriesResponse | Category[]>("/api/categories", {
        params: {
          timestamp: Date.now(),
        },

        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }),

      axios.get<OrdersResponse | AdminOrder[]>("/api/orders", {
        params: {
          page: 1,
          limit: 100,
          timestamp: Date.now(),
        },

        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }),
    ]);

    const [productsResult, categoriesResult, ordersResult] = results;

    const products =
      productsResult.status === "fulfilled"
        ? extractProducts(productsResult.value.data)
        : [];

    const categories =
      categoriesResult.status === "fulfilled"
        ? extractCategories(categoriesResult.value.data)
        : [];

    const orders =
      ordersResult.status === "fulfilled"
        ? extractOrders(ordersResult.value.data)
        : [];

    setDashboardData({
      products,
      categories,
      orders,
    });

    const criticalErrors: string[] = [];

    if (productsResult.status === "rejected") {
      criticalErrors.push(
        getRequestErrorMessage(
          productsResult.reason,
          "Não foi possível carregar os produtos.",
        ),
      );
    }

    if (categoriesResult.status === "rejected") {
      criticalErrors.push(
        getRequestErrorMessage(
          categoriesResult.reason,
          "Não foi possível carregar as categorias.",
        ),
      );
    }

    if (ordersResult.status === "rejected") {
      criticalErrors.push(
        getRequestErrorMessage(
          ordersResult.reason,
          "Não foi possível carregar os pedidos.",
        ),
      );
    }

    setError(criticalErrors.join(" "));
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialData(): Promise<void> {
      try {
        await fetchDashboardData();
      } catch (requestError) {
        if (!active) {
          return;
        }

        console.error(
          "[Dashboard] Erro no carregamento inicial:",
          requestError,
        );

        setError(
          getRequestErrorMessage(
            requestError,
            "Não foi possível carregar o painel.",
          ),
        );
      } finally {
        if (active) {
          setIsLoadingData(false);
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      void loadInitialData();
    }, 0);

    return () => {
      active = false;

      window.clearTimeout(timeoutId);
    };
  }, [fetchDashboardData]);

  useEffect(() => {
    const eventSource = new EventSource("/api/orders/events");

    function handleOpen(): void {
      console.log("[Dashboard] Conexão em tempo real estabelecida.");

      setIsRealtimeConnected(true);
    }

    function handleOrderCreated(event: MessageEvent<string>): void {
      try {
        const eventData = JSON.parse(event.data) as OrderCreatedEventData;

        console.log("[Dashboard] Novo pedido recebido:", eventData);
      } catch {
        console.log("[Dashboard] Evento de novo pedido recebido.");
      }

      void fetchLatestOrders(false);
    }

    function handleError(event: Event): void {
      console.error("[Dashboard] Erro na conexão em tempo real:", event);

      setIsRealtimeConnected(false);

      /*
       * O EventSource tenta reconectar automaticamente.
       * Não é necessário criar intervalos manuais.
       */
    }

    eventSource.addEventListener("open", handleOpen);

    eventSource.addEventListener(
      "order-created",
      handleOrderCreated as EventListener,
    );

    eventSource.addEventListener("error", handleError);

    return () => {
      eventSource.removeEventListener("open", handleOpen);

      eventSource.removeEventListener(
        "order-created",
        handleOrderCreated as EventListener,
      );

      eventSource.removeEventListener("error", handleError);

      eventSource.close();
    };
  }, [fetchLatestOrders]);

  async function handleRefreshDashboard(): Promise<void> {
    try {
      setIsRefreshing(true);
      setError("");

      await fetchDashboardData();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleLogout(): Promise<void> {
    try {
      setIsLoggingOut(true);

      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value);
  }

  const orders = dashboardData.orders;

  const todayOrders = useMemo(() => {
    return orders.filter((order) => isToday(order.createdAt));
  }, [orders]);

  const deliveredTodayOrders = useMemo(() => {
    return todayOrders.filter((order) => order.status === "delivered");
  }, [todayOrders]);

  const todayRevenue = useMemo(() => {
    return deliveredTodayOrders.reduce(
      (total, order) => total + getOrderTotal(order),
      0,
    );
  }, [deliveredTodayOrders]);

  const pendingOrders = useMemo(() => {
    return orders.filter((order) => isPendingOrder(order.status));
  }, [orders]);

  const recentOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sortOrdersByDate(orders)
      .filter((order) => {
        if (!normalizedSearch) {
          return true;
        }

        const identifier = getOrderIdentifier(order);

        const customerName = getCustomerName(order);

        const status = getStatusLabel(order.status);

        return (
          identifier.toLowerCase().includes(normalizedSearch) ||
          customerName.toLowerCase().includes(normalizedSearch) ||
          status.toLowerCase().includes(normalizedSearch)
        );
      })
      .slice(0, 6);
  }, [orders, search]);

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle size={32} className="animate-spin text-[#7f3c19]" />

          <span className="text-sm font-bold text-zinc-500">
            Carregando painel...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-zinc-100 px-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7f3c19] text-white shadow-lg shadow-[#7f3c19]/20">
              <ShoppingBag size={22} />
            </div>

            <div>
              <strong className="block text-base font-black">Garage 22</strong>

              <span className="text-xs font-medium text-zinc-500">
                Painel administrativo
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-[#fdf4c3] hover:text-[#7f3c19] lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <span className="mb-3 block px-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
            Menu principal
          </span>

          <div className="space-y-1">
            {navigationItems.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-bold transition ${
                    active
                      ? "bg-[#7f3c19] text-white shadow-lg shadow-[#7f3c19]/20"
                      : "text-zinc-600 hover:bg-[#fdf4c3]/70 hover:text-[#7f3c19]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {renderNavigationIcon(item.href)}

                    {item.label}
                  </span>

                  <ChevronRight
                    size={17}
                    className={active ? "text-white/70" : "text-zinc-400"}
                  />
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-zinc-100 p-4">
          <div className="mb-3 rounded-2xl border border-[#7f5417]/10 bg-[#fdf4c3]/35 p-4">
            <span className="block text-xs font-bold text-[#7f5417]">
              Usuário conectado
            </span>

            <strong className="mt-1 block truncate text-sm font-black text-zinc-950">
              {user?.name || "Administrador"}
            </strong>

            <span className="mt-1 block truncate text-xs text-zinc-500">
              {user?.email || "E-mail não informado"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleLogout();
            }}
            disabled={isLoggingOut}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-sm font-black text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <LogOut size={18} />
            )}

            {isLoggingOut ? "Saindo..." : "Sair da conta"}
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur-xl">
          <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 xl:px-10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 transition hover:border-[#7f5417]/30 hover:bg-[#fdf4c3] hover:text-[#7f3c19] lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu size={21} />
              </button>

              <div className="hidden sm:block">
                <h1 className="text-xl font-black tracking-[-0.03em]">
                  Visão geral
                </h1>

                <p className="text-sm text-zinc-500">
                  Acompanhe o desempenho da sua loja.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Buscar pedido ou cliente..."
                  className="h-11 w-72 rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-[#7f3c19] focus:bg-white focus:ring-4 focus:ring-[#fdf4c3]"
                />
              </div>

              <StoreStatusControl />

              <button
                type="button"
                onClick={() => {
                  void handleRefreshDashboard();
                }}
                disabled={isRefreshing}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 transition hover:border-[#7f5417]/30 hover:bg-[#fdf4c3] hover:text-[#7f3c19] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Atualizar painel"
              >
                <RefreshCcw
                  size={19}
                  className={isRefreshing ? "animate-spin" : ""}
                />
              </button>

              <button
                type="button"
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 transition hover:border-[#7f5417]/30 hover:bg-[#fdf4c3] hover:text-[#7f3c19]"
                aria-label="Notificações"
              >
                <Bell size={20} />

                {pendingOrders.length > 0 && (
                  <span className="absolute right-2 top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#7f3c19] px-1 text-[9px] font-black text-white ring-2 ring-white">
                    {pendingOrders.length > 9 ? "9+" : pendingOrders.length}
                  </span>
                )}
              </button>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7f3c19] text-sm font-black text-white shadow-sm">
                {user?.name?.charAt(0).toUpperCase() || "A"}
              </div>
            </div>
          </div>
        </header>

        <section className="px-4 py-6 sm:px-6 xl:px-10 xl:py-8">
          <div className="mb-6 sm:hidden">
            <h1 className="text-2xl font-black tracking-[-0.04em]">
              Visão geral
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Acompanhe o desempenho da sua loja.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />

              <div className="min-w-0">
                <strong className="block text-sm font-black">
                  Alguns dados não foram carregados
                </strong>

                <p className="mt-1 text-sm leading-6">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-8 overflow-hidden rounded-3xl bg-zinc-950 p-6 text-white shadow-xl shadow-zinc-950/10 sm:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.15em] text-[#fdf4c3]">
                  <TrendingUp size={15} />
                  Resumo do dia
                </span>

                <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                  Olá, {user?.name || "Administrador"}.
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
                  Hoje sua loja recebeu{" "}
                  <strong className="text-white">
                    {todayOrders.length}{" "}
                    {todayOrders.length === 1 ? "pedido" : "pedidos"}
                  </strong>{" "}
                  e confirmou{" "}
                  <strong className="text-white">
                    {formatCurrency(todayRevenue)}
                  </strong>{" "}
                  em vendas entregues.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/reports"
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/15"
                >
                  <BarChart3 size={18} />
                  Ver relatórios
                </Link>

                <Link
                  href="/dashboard/orders"
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-5 text-sm font-black text-white shadow-[0_10px_25px_rgba(127,60,25,0.25)] transition hover:bg-[#58141e]"
                >
                  <ClipboardList size={18} />
                  Ver todos os pedidos
                </Link>
              </div>
            </div>
          </div>

          {isLoadingData ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-3xl border border-zinc-200 bg-white">
              <LoaderCircle size={30} className="animate-spin text-[#7f3c19]" />

              <span className="text-sm font-bold text-zinc-500">
                Carregando informações...
              </span>
            </div>
          ) : (
            <div className="mt-8">
              <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-5 sm:px-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black tracking-[-0.03em]">
                        Pedidos recentes
                      </h2>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ${
                          isRealtimeConnected
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {isRealtimeConnected ? (
                          <Wifi size={13} />
                        ) : (
                          <WifiOff size={13} />
                        )}

                        {isRealtimeConnected ? "Tempo real" : "Reconectando"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-zinc-500">
                      Novos pedidos aparecem automaticamente.
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void fetchLatestOrders(true);
                      }}
                      disabled={isRefreshingOrders}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:border-[#7f5417]/30 hover:bg-[#fdf4c3] hover:text-[#7f3c19] disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Atualizar pedidos recentes"
                      title="Atualizar pedidos recentes"
                    >
                      <RefreshCcw
                        size={17}
                        className={isRefreshingOrders ? "animate-spin" : ""}
                      />
                    </button>

                    <Link
                      href="/dashboard/orders"
                      className="hidden text-sm font-black text-[#7f3c19] transition hover:text-[#58141e] sm:block"
                    >
                      Ver todos
                    </Link>
                  </div>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
                      <ClipboardList size={25} />
                    </div>

                    <strong className="mt-4 text-base font-black">
                      Nenhum pedido encontrado
                    </strong>

                    <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                      Os pedidos mais recentes aparecerão aqui assim que forem
                      realizados.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {recentOrders.map((order) => {
                      const itemsQuantity = getOrderItemsQuantity(order);

                      return (
                        <Link
                          key={order._id}
                          href={`/dashboard/orders/${order._id}`}
                          aria-label={`Abrir pedido ${getOrderIdentifier(
                            order,
                          )}`}
                          className="group flex flex-col gap-4 px-5 py-5 transition hover:bg-[#fdf4c3]/35 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
                              <ShoppingBag size={19} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <strong className="text-sm font-black">
                                  {getOrderIdentifier(order)}
                                </strong>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-black ${getStatusClasses(
                                    order.status,
                                  )}`}
                                >
                                  {getStatusLabel(order.status)}
                                </span>
                              </div>

                              <span className="mt-1 block truncate text-sm text-zinc-500">
                                {getCustomerName(order)} · {itemsQuantity}{" "}
                                {itemsQuantity === 1 ? "item" : "itens"}
                              </span>

                              <span className="mt-1 block text-xs text-zinc-400">
                                {formatDate(order.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4 sm:justify-end">
                            <strong className="text-sm font-black">
                              {formatCurrency(getOrderTotal(order))}
                            </strong>

                            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition group-hover:bg-white group-hover:text-[#7f3c19]">
                              <ChevronRight size={18} />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

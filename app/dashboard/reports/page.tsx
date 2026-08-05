"use client";

import axios, { AxiosError } from "axios";
import {
  AlertCircle,
  CalendarDays,
  CircleDollarSign,
  Download,
  LoaderCircle,
  Package,
  ReceiptText,
  RefreshCcw,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

interface WeeklyProduct {
  productId?: string | null;
  name: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

interface WeeklyPayment {
  method: string;
  orders: number;
  revenue: number;
}

interface WeeklyDay {
  dateKey: string;
  label: string;
  shortLabel: string;
  orders: number;
  itemsSold: number;
  revenue: number;
}

interface WeeklyOrderItem {
  productId?: string | null;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface WeeklyOrderSummary {
  orderId?: string;
  orderNumber: string | number;
  customerName?: string;
  items?: WeeklyOrderItem[];
  itemsQuantity: number;
  subtotal?: number;
  deliveryFee?: number;
  total: number;
  deliveredAt: string;
  paymentMethod?: string;
}

interface WeeklyReport {
  _id: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  deliveredOrders: number;
  totalItemsSold: number;
  productsRevenue: number;
  deliveryFees: number;
  totalRevenue: number;
  averageTicket: number;
  products: WeeklyProduct[];
  payments: WeeklyPayment[];
  daily: WeeklyDay[];
  orders: WeeklyOrderSummary[];
  createdAt: string;
  updatedAt: string;
}

interface WeeklyReportResponse {
  report: WeeklyReport | null;
}

interface DeleteReportOrderResponse {
  success?: boolean;
  message?: string;
  report?: WeeklyReport;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(
    Number.isFinite(value) ? value : 0,
  );
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
    timeZone: "America/Fortaleza",
  }).format(date);
}

function formatDateTime(value: string): string {
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
    timeZone: "America/Fortaleza",
  }).format(date);
}

function getPaymentLabel(method?: string): string {
  switch (method) {
    case "pix":
      return "Pix";
    case "cash":
      return "Dinheiro";
    case "card":
      return "Cartão";
    default:
      return "Não informado";
  }
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

export default function WeeklyReportsPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletingOrderNumber, setDeletingOrderNumber] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    axios
      .get<WeeklyReportResponse>("/api/reports/weekly/current", {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setReport(response.data.report ?? null);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted || axios.isCancel(requestError)) {
          return;
        }

        setReport(null);
        setError(
          getRequestErrorMessage(
            requestError,
            "Não foi possível carregar o relatório semanal.",
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
  }, []);

  async function handleRefreshReport() {
    try {
      setIsRefreshing(true);
      setError("");
      setSuccess("");

      const response = await axios.get<WeeklyReportResponse>(
        "/api/reports/weekly/current",
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
      );

      setReport(response.data.report ?? null);
    } catch (requestError) {
      setReport(null);
      setError(
        getRequestErrorMessage(
          requestError,
          "Não foi possível atualizar o relatório semanal.",
        ),
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  const products = useMemo(() => {
    return [...(report?.products ?? [])].sort((productA, productB) => {
      if (productB.quantity !== productA.quantity) {
        return productB.quantity - productA.quantity;
      }

      return productB.revenue - productA.revenue;
    });
  }, [report]);

  const payments = useMemo(() => {
    return [...(report?.payments ?? [])].sort(
      (paymentA, paymentB) => paymentB.revenue - paymentA.revenue,
    );
  }, [report]);

  const dailyReport = useMemo(() => {
    return [...(report?.daily ?? [])].sort((dayA, dayB) =>
      dayA.dateKey.localeCompare(dayB.dateKey),
    );
  }, [report]);

  const orderSummaries = useMemo(() => {
    return [...(report?.orders ?? [])].sort((orderA, orderB) => {
      return (
        new Date(orderB.deliveredAt).getTime() -
        new Date(orderA.deliveredAt).getTime()
      );
    });
  }, [report]);

  const bestProduct = products[0] ?? null;

  const bestDay = useMemo(() => {
    return [...dailyReport].sort(
      (dayA, dayB) => dayB.revenue - dayA.revenue,
    )[0];
  }, [dailyReport]);

  const maximumDailyRevenue = useMemo(() => {
    return Math.max(...dailyReport.map((day) => day.revenue), 0);
  }, [dailyReport]);

  async function handleDownloadAndFinalizeReport() {
    if (!report) {
      setError("Não existe relatório disponível para gerar o PDF.");
      return;
    }

    const confirmed = window.confirm(
      "O PDF será baixado e, em seguida, este relatório será apagado permanentemente do banco de dados. Deseja continuar?",
    );

    if (!confirmed) {
      return;
    }

    let pdfUrl = "";

    try {
      setIsGeneratingPdf(true);
      setError("");
      setSuccess("");

      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const autoTable = autoTableModule.default;
      const document = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = document.internal.pageSize.getWidth();
      const pageHeight = document.internal.pageSize.getHeight();

      document.setFont("helvetica", "bold");
      document.setFontSize(20);
      document.text("Relatório semanal de vendas", 14, 18);

      document.setFont("helvetica", "normal");
      document.setFontSize(10);
      document.text(
        `Período: ${formatDate(report.weekStart)} até ${formatDate(report.weekEnd)}`,
        14,
        26,
      );
      document.text(
        `Gerado em: ${formatDateTime(new Date().toISOString())}`,
        14,
        32,
      );

      document.setDrawColor(220, 220, 220);
      document.line(14, 37, pageWidth - 14, 37);

      document.setFont("helvetica", "bold");
      document.setFontSize(14);
      document.text("Resumo da semana", 14, 47);

      autoTable(document, {
        startY: 52,
        head: [["Indicador", "Resultado"]],
        body: [
          ["Pedidos entregues", formatNumber(report.deliveredOrders)],
          ["Produtos vendidos", formatNumber(report.totalItemsSold)],
          ["Faturamento em produtos", formatCurrency(report.productsRevenue)],
          ["Taxas de entrega", formatCurrency(report.deliveryFees)],
          ["Faturamento total", formatCurrency(report.totalRevenue)],
          ["Ticket médio", formatCurrency(report.averageTicket)],
          [
            "Produto mais vendido",
            bestProduct
              ? `${bestProduct.name} — ${formatNumber(bestProduct.quantity)} unidades`
              : "Nenhum",
          ],
          [
            "Melhor dia",
            bestDay
              ? `${bestDay.label} — ${formatCurrency(bestDay.revenue)}`
              : "Nenhum",
          ],
        ],
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [24, 24, 27],
          textColor: [255, 255, 255],
        },
        columnStyles: {
          0: {
            fontStyle: "bold",
            cellWidth: 75,
          },
        },
      });

      const getLastTableY = (): number => {
        const tableDocument = document as typeof document & {
          lastAutoTable?: {
            finalY: number;
          };
        };

        return tableDocument.lastAutoTable?.finalY ?? 52;
      };

      document.setFont("helvetica", "bold");
      document.setFontSize(14);
      document.text("Produtos vendidos", 14, getLastTableY() + 12);

      autoTable(document, {
        startY: getLastTableY() + 17,
        head: [["Produto", "Quantidade", "Pedidos", "Faturamento"]],
        body:
          products.length > 0
            ? products.map((product) => [
                product.name,
                formatNumber(product.quantity),
                formatNumber(product.orderCount),
                formatCurrency(product.revenue),
              ])
            : [["Nenhum produto vendido", "0", "0", formatCurrency(0)]],
        theme: "striped",
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
        },
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
        },
      });

      document.setFont("helvetica", "bold");
      document.setFontSize(14);
      document.text("Desempenho diário", 14, getLastTableY() + 12);

      autoTable(document, {
        startY: getLastTableY() + 17,
        head: [["Dia", "Pedidos", "Itens", "Faturamento"]],
        body:
          dailyReport.length > 0
            ? dailyReport.map((day) => [
                day.label,
                formatNumber(day.orders),
                formatNumber(day.itemsSold),
                formatCurrency(day.revenue),
              ])
            : [["Nenhum registro", "0", "0", formatCurrency(0)]],
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
        },
        headStyles: {
          fillColor: [39, 39, 42],
          textColor: [255, 255, 255],
        },
      });

      document.setFont("helvetica", "bold");
      document.setFontSize(14);
      document.text("Formas de pagamento", 14, getLastTableY() + 12);

      autoTable(document, {
        startY: getLastTableY() + 17,
        head: [["Forma de pagamento", "Pedidos", "Faturamento"]],
        body:
          payments.length > 0
            ? payments.map((payment) => [
                getPaymentLabel(payment.method),
                formatNumber(payment.orders),
                formatCurrency(payment.revenue),
              ])
            : [["Nenhuma forma registrada", "0", formatCurrency(0)]],
        theme: "striped",
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
        },
        headStyles: {
          fillColor: [39, 39, 42],
          textColor: [255, 255, 255],
        },
      });

      document.setFont("helvetica", "bold");
      document.setFontSize(14);
      document.text("Pedidos entregues", 14, getLastTableY() + 12);

      autoTable(document, {
        startY: getLastTableY() + 17,
        head: [["Pedido", "Cliente", "Entrega", "Itens", "Pagamento", "Total"]],
        body:
          orderSummaries.length > 0
            ? orderSummaries.map((order) => [
                `#${order.orderNumber}`,
                order.customerName?.trim() || "Não informado",
                formatDateTime(order.deliveredAt),
                formatNumber(order.itemsQuantity),
                getPaymentLabel(order.paymentMethod),
                formatCurrency(order.total),
              ])
            : [["Nenhum", "-", "-", "0", "-", formatCurrency(0)]],
        theme: "grid",
        styles: {
          fontSize: 7.2,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
        },
      });

      const totalPages = document.getNumberOfPages();

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        document.setPage(pageNumber);
        document.setFont("helvetica", "normal");
        document.setFontSize(8);
        document.text("Relatório semanal", 14, pageHeight - 7);
        document.text(
          `Página ${pageNumber} de ${totalPages}`,
          pageWidth - 14,
          pageHeight - 7,
          { align: "right" },
        );
      }

      const pdfBlob = document.output("blob");
      pdfUrl = URL.createObjectURL(pdfBlob);

      const downloadLink = window.document.createElement("a");
      downloadLink.href = pdfUrl;
      downloadLink.download = `relatorio-semanal-${report.weekKey}.pdf`;
      window.document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      await axios.delete(
        `/api/reports/weekly/${encodeURIComponent(report.weekKey)}/finalize`,
      );

      setReport(null);
      setSuccess(
        "PDF gerado e relatório removido do banco de dados com sucesso.",
      );
    } catch (requestError) {
      setError(
        getRequestErrorMessage(
          requestError,
          "Não foi possível gerar o PDF e finalizar o relatório.",
        ),
      );
    } finally {
      if (pdfUrl) {
        window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1_000);
      }

      setIsGeneratingPdf(false);
    }
  }

  async function handleDeleteReportOrder(
    orderNumber: string | number,
  ): Promise<void> {
    if (!report) {
      setError("Não existe relatório disponível para alterar.");
      return;
    }

    const normalizedOrderNumber = String(orderNumber);

    const confirmed = window.confirm(
      `Deseja remover o pedido #${normalizedOrderNumber} deste relatório? Os totais, produtos, pagamentos e desempenho diário serão recalculados.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingOrderNumber(normalizedOrderNumber);
      setError("");
      setSuccess("");

      const response = await axios.delete<DeleteReportOrderResponse>(
        `/api/reports/weekly/${encodeURIComponent(
          report.weekKey,
        )}/orders/${encodeURIComponent(normalizedOrderNumber)}`,
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
      );

      if (!response.data.report) {
        throw new Error(
          response.data.message || "A API não devolveu o relatório atualizado.",
        );
      }

      setReport(response.data.report);
      setSuccess(
        response.data.message ||
          `Pedido #${normalizedOrderNumber} removido do relatório com sucesso.`,
      );
    } catch (requestError) {
      console.error(
        "[WeeklyReportsPage] Erro ao remover pedido do relatório:",
        requestError,
      );

      setError(
        getRequestErrorMessage(
          requestError,
          "Não foi possível remover o pedido do relatório.",
        ),
      );
    } finally {
      setDeletingOrderNumber(null);
    }
  }

  const statistics = [
    {
      title: "Faturamento da semana",
      value: formatCurrency(report?.totalRevenue ?? 0),
      description: `${formatNumber(report?.deliveredOrders ?? 0)} pedidos entregues`,
      icon: "revenue" as const,
    },
    {
      title: "Produtos vendidos",
      value: formatNumber(report?.totalItemsSold ?? 0),
      description: `${formatNumber(products.length)} produtos diferentes`,
      icon: "products" as const,
    },
    {
      title: "Ticket médio",
      value: formatCurrency(report?.averageTicket ?? 0),
      description: "Média por pedido entregue",
      icon: "ticket" as const,
    },
    {
      title: "Taxas de entrega",
      value: formatCurrency(report?.deliveryFees ?? 0),
      description: `${formatCurrency(report?.productsRevenue ?? 0)} em produtos`,
      icon: "delivery" as const,
    },
  ];

  function renderStatisticIcon(icon: (typeof statistics)[number]["icon"]) {
    switch (icon) {
      case "revenue":
        return <CircleDollarSign size={22} />;
      case "products":
        return <Package size={22} />;
      case "ticket":
        return <TrendingUp size={22} />;
      case "delivery":
        return <ShoppingBag size={22} />;
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle size={34} className="animate-spin text-orange-500" />
          <span className="text-sm font-bold text-zinc-500">
            Carregando relatório semanal...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-7">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">
                Administração
              </span>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Relatório semanal
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                Os pedidos entregues são consolidados neste relatório e
                permanecem salvos na coleção de pedidos. Você pode remover um
                registro individual do relatório quando precisar corrigir os
                indicadores.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  void handleDownloadAndFinalizeReport();
                }}
                disabled={isGeneratingPdf || isRefreshing || !report}
                className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <Download size={17} />
                    Baixar PDF e finalizar
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleRefreshReport();
                }}
                disabled={isRefreshing || isGeneratingPdf}
                className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw
                  size={17}
                  className={isRefreshing ? "animate-spin" : ""}
                />
                {isRefreshing ? "Atualizando..." : "Atualizar relatório"}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <strong className="block text-sm font-black">Erro</strong>
              <p className="mt-1 text-sm font-semibold">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {success}
          </div>
        )}

        {!report ? (
          <section className="flex min-h-[520px] flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white px-6 text-center shadow-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-500">
              <ReceiptText size={36} />
            </div>

            <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
              Nenhum relatório disponível
            </h2>

            <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-500">
              O relatório será criado automaticamente quando o primeiro pedido
              for marcado como entregue. Depois que o PDF for baixado e
              finalizado, o relatório desaparece desta página.
            </p>

            <button
              type="button"
              onClick={() => {
                void handleRefreshReport();
              }}
              disabled={isRefreshing}
              className="mt-6 flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white transition hover:bg-orange-500 disabled:opacity-60"
            >
              <RefreshCcw
                size={17}
                className={isRefreshing ? "animate-spin" : ""}
              />
              Verificar novamente
            </button>
          </section>
        ) : (
          <>
            <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <CalendarDays size={22} />
                  </div>

                  <div>
                    <span className="block text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                      Período do relatório
                    </span>

                    <strong className="mt-1 block text-base sm:text-lg">
                      {formatDate(report.weekStart)} até{" "}
                      {formatDate(report.weekEnd)}
                    </strong>
                  </div>
                </div>

                <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
                  Atualizado em {formatDateTime(report.updatedAt)}
                </div>
              </div>
            </section>

            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statistics.map((statistic) => (
                <article
                  key={statistic.title}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-sm font-bold text-zinc-500">
                        {statistic.title}
                      </span>

                      <strong className="mt-2 block text-2xl font-black tracking-[-0.05em] sm:text-3xl">
                        {statistic.value}
                      </strong>

                      <span className="mt-2 block text-xs font-semibold text-zinc-400">
                        {statistic.description}
                      </span>
                    </div>

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                      {renderStatisticIcon(statistic.icon)}
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <div className="mb-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 p-5 sm:p-6">
                  <h2 className="text-lg font-black tracking-[-0.03em]">
                    Desempenho diário
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Faturamento consolidado dos pedidos entregues em cada dia.
                  </p>
                </div>

                {dailyReport.length === 0 ? (
                  <div className="flex min-h-72 items-center justify-center p-6 text-sm text-zinc-500">
                    Nenhum desempenho diário registrado.
                  </div>
                ) : (
                  <div className="space-y-5 p-5 sm:p-6">
                    {dailyReport.map((day) => {
                      const percentage =
                        maximumDailyRevenue > 0
                          ? (day.revenue / maximumDailyRevenue) * 100
                          : 0;

                      return (
                        <div key={day.dateKey}>
                          <div className="mb-2 flex items-center justify-between gap-4">
                            <div>
                              <strong className="block text-sm capitalize">
                                {day.label}
                              </strong>
                              <span className="text-xs text-zinc-400">
                                {formatNumber(day.orders)} pedidos ·{" "}
                                {formatNumber(day.itemsSold)} itens
                              </span>
                            </div>
                            <strong className="text-sm">
                              {formatCurrency(day.revenue)}
                            </strong>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-orange-500 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <aside className="space-y-6">
                <section className="rounded-3xl bg-zinc-950 p-6 text-white shadow-xl shadow-zinc-950/10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
                    <Trophy size={23} />
                  </div>

                  <span className="mt-5 block text-xs font-black uppercase tracking-[0.16em] text-orange-400">
                    Mais vendido
                  </span>

                  <h2 className="mt-2 text-xl font-black">
                    {bestProduct?.name ?? "Nenhuma venda concluída"}
                  </h2>

                  {bestProduct && (
                    <>
                      <strong className="mt-4 block text-3xl font-black">
                        {formatNumber(bestProduct.quantity)} unidades
                      </strong>
                      <p className="mt-2 text-sm text-zinc-400">
                        {formatCurrency(bestProduct.revenue)} em vendas durante
                        a semana.
                      </p>
                    </>
                  )}
                </section>

                <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                    Melhor dia da semana
                  </span>
                  <strong className="mt-2 block text-xl capitalize">
                    {bestDay?.label ?? "Não informado"}
                  </strong>
                  <strong className="mt-3 block text-2xl font-black text-orange-600">
                    {formatCurrency(bestDay?.revenue ?? 0)}
                  </strong>
                  <span className="mt-2 block text-sm text-zinc-500">
                    {formatNumber(bestDay?.orders ?? 0)} pedidos entregues
                  </span>
                </section>
              </aside>
            </div>

            <section className="mb-6 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 p-5 sm:p-6">
                <h2 className="text-lg font-black tracking-[-0.03em]">
                  Produtos vendidos
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Quantidade, faturamento e participação de cada produto.
                </p>
              </div>

              {products.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                  <Package size={34} className="text-zinc-400" />
                  <strong className="mt-4">Nenhum produto vendido</strong>
                </div>
              ) : (
                <>
                  <div className="hidden grid-cols-[minmax(0,1fr)_130px_130px_160px] gap-4 border-b border-zinc-100 bg-zinc-50 px-6 py-4 text-xs font-black uppercase tracking-wide text-zinc-400 lg:grid">
                    <span>Produto</span>
                    <span>Quantidade</span>
                    <span>Pedidos</span>
                    <span className="text-right">Faturamento</span>
                  </div>

                  <div className="divide-y divide-zinc-100">
                    {products.map((product, index) => {
                      const revenuePercentage =
                        report.totalRevenue > 0
                          ? (product.revenue / report.totalRevenue) * 100
                          : 0;

                      return (
                        <article
                          key={product.productId || `${product.name}-${index}`}
                          className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_130px_130px_160px] lg:items-center"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black ${
                                index === 0
                                  ? "bg-orange-500 text-white"
                                  : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {index + 1}
                            </div>

                            <div className="min-w-0">
                              <strong className="block truncate">
                                {product.name}
                              </strong>
                              <span className="mt-1 block text-xs text-zinc-400">
                                {revenuePercentage.toFixed(1)}% do faturamento
                                total
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-xs font-bold text-zinc-400 lg:hidden">
                              Quantidade
                            </span>
                            <strong className="block text-sm">
                              {formatNumber(product.quantity)} unidades
                            </strong>
                          </div>

                          <div>
                            <span className="text-xs font-bold text-zinc-400 lg:hidden">
                              Pedidos
                            </span>
                            <strong className="block text-sm">
                              {formatNumber(product.orderCount)}
                            </strong>
                          </div>

                          <div className="lg:text-right">
                            <span className="text-xs font-bold text-zinc-400 lg:hidden">
                              Faturamento
                            </span>
                            <strong className="block text-base font-black text-orange-600">
                              {formatCurrency(product.revenue)}
                            </strong>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 p-5 sm:p-6">
                  <h2 className="text-lg font-black tracking-[-0.03em]">
                    Pedidos consolidados
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Apenas os dados essenciais usados no relatório semanal.
                  </p>
                </div>

                {orderSummaries.length === 0 ? (
                  <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                    <ReceiptText size={34} className="text-zinc-400" />
                    <strong className="mt-4">Nenhum pedido consolidado</strong>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {orderSummaries.map((order, index) => (
                      <article
                        key={`${order.orderNumber}-${order.deliveredAt}-${index}`}
                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                      >
                        <div className="min-w-0">
                          <strong className="block">
                            Pedido #{order.orderNumber}
                          </strong>
                          <span className="mt-1 block truncate text-sm text-zinc-500">
                            {order.customerName?.trim() ||
                              "Cliente não informado"}{" "}
                            · {formatNumber(order.itemsQuantity)} itens
                          </span>
                          <span className="mt-1 block text-xs text-zinc-400">
                            Entregue em {formatDateTime(order.deliveredAt)} ·{" "}
                            {getPaymentLabel(order.paymentMethod)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <strong>{formatCurrency(order.total)}</strong>

                          <button
                            type="button"
                            onClick={() => {
                              void handleDeleteReportOrder(order.orderNumber);
                            }}
                            disabled={
                              deletingOrderNumber ===
                                String(order.orderNumber) ||
                              isGeneratingPdf ||
                              isRefreshing
                            }
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Remover pedido #${order.orderNumber} do relatório`}
                            title={`Remover pedido #${order.orderNumber} do relatório`}
                          >
                            {deletingOrderNumber ===
                            String(order.orderNumber) ? (
                              <LoaderCircle
                                size={18}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-black">Formas de pagamento</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Distribuição dos pedidos entregues.
                </p>

                {payments.length === 0 ? (
                  <p className="mt-6 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                    Nenhum pagamento registrado.
                  </p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {payments.map((payment) => {
                      const percentage =
                        report.totalRevenue > 0
                          ? (payment.revenue / report.totalRevenue) * 100
                          : 0;

                      return (
                        <article
                          key={payment.method}
                          className="rounded-2xl bg-zinc-50 p-4"
                        >
                          <div className="flex justify-between gap-4">
                            <div>
                              <strong className="block text-sm">
                                {getPaymentLabel(payment.method)}
                              </strong>
                              <span className="mt-1 block text-xs text-zinc-400">
                                {formatNumber(payment.orders)} pedidos
                              </span>
                            </div>
                            <strong className="text-sm">
                              {formatCurrency(payment.revenue)}
                            </strong>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
                            <div
                              className="h-full rounded-full bg-orange-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <span className="mt-2 block text-right text-xs font-bold text-zinc-400">
                            {percentage.toFixed(1)}%
                          </span>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

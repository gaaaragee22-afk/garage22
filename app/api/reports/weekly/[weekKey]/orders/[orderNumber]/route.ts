import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "@/lib/database";
import Order from "@/models/Order";
import WeeklyReport from "@/models/WeeklyReport";

interface RouteContext {
  params: Promise<{
    weekKey: string;
    orderNumber: string;
  }>;
}

interface ReportOrderItem {
  productId?: string | null;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface ReportOrderData {
  orderId?: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  deliveredAt: Date | string;
  items?: ReportOrderItem[];
  itemsQuantity: number;
  paymentMethod?: string;
  subtotal?: number;
  deliveryFee?: number;
  total: number;
}

interface OriginalOrderItem {
  productId?: unknown;
  name: string;
  quantity: number;
  price: number;
  total?: number;
}

interface OriginalOrderData {
  _id: unknown;
  orderNumber: string;
  subtotal?: number;
  deliveryFee?: number;
  total?: number;

  payment?: {
    method?: string;
  };

  items?: OriginalOrderItem[];
}

interface ResolvedOrderData {
  items: ReportOrderItem[];
  itemsQuantity: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

function normalizeNumber(value: unknown): number {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function normalizeItems(items: OriginalOrderItem[]): ReportOrderItem[] {
  return items.map((item) => {
    const quantity = normalizeNumber(item.quantity);
    const price = normalizeNumber(item.price);

    const total =
      typeof item.total === "number" && Number.isFinite(item.total)
        ? item.total
        : price * quantity;

    return {
      productId: item.productId?.toString() ?? null,
      name: item.name,
      quantity,
      price: roundMoney(price),
      total: roundMoney(total),
    };
  });
}

function getDateKey(value: Date | string): string | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

async function resolveOrderData(
  reportOrder: ReportOrderData,
): Promise<ResolvedOrderData | null> {
  const reportHasCompleteData =
    Array.isArray(reportOrder.items) &&
    reportOrder.items.length > 0 &&
    typeof reportOrder.subtotal === "number" &&
    typeof reportOrder.deliveryFee === "number";

  if (reportHasCompleteData) {
    return {
      items: reportOrder.items ?? [],
      itemsQuantity: normalizeNumber(reportOrder.itemsQuantity),
      subtotal: roundMoney(normalizeNumber(reportOrder.subtotal)),
      deliveryFee: roundMoney(normalizeNumber(reportOrder.deliveryFee)),
      total: roundMoney(normalizeNumber(reportOrder.total)),
      paymentMethod: reportOrder.paymentMethod ?? "unknown",
    };
  }

  /*
   * Compatibilidade com pedidos antigos do relatório:
   * busca o pedido original, que agora permanece salvo.
   */
  const originalOrder = (await Order.findOne({
    orderNumber: String(reportOrder.orderNumber),
  })
    .select({
      orderNumber: 1,
      subtotal: 1,
      deliveryFee: 1,
      total: 1,
      payment: 1,
      items: 1,
    })
    .lean()) as OriginalOrderData | null;

  if (!originalOrder) {
    return null;
  }

  const normalizedItems = normalizeItems(originalOrder.items ?? []);

  const itemsQuantity = normalizedItems.reduce((total, item) => {
    return total + item.quantity;
  }, 0);

  return {
    items: normalizedItems,
    itemsQuantity,
    subtotal: roundMoney(normalizeNumber(originalOrder.subtotal)),
    deliveryFee: roundMoney(normalizeNumber(originalOrder.deliveryFee)),
    total: roundMoney(
      normalizeNumber(originalOrder.total || reportOrder.total),
    ),
    paymentMethod:
      originalOrder.payment?.method || reportOrder.paymentMethod || "unknown",
  };
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await connectDatabase();

    const { weekKey, orderNumber } = await context.params;

    const decodedWeekKey = decodeURIComponent(weekKey);
    const decodedOrderNumber = decodeURIComponent(orderNumber);

    const report = await WeeklyReport.findOne({
      weekKey: decodedWeekKey,
    });

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          message: "Relatório semanal não encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    const reportOrder = report.orders.find((order) => {
      return String(order.orderNumber) === decodedOrderNumber;
    }) as ReportOrderData | undefined;

    if (!reportOrder) {
      return NextResponse.json(
        {
          success: false,
          message: "Pedido não encontrado no relatório.",
        },
        {
          status: 404,
        },
      );
    }

    const resolvedOrder = await resolveOrderData(reportOrder);

    if (!resolvedOrder) {
      return NextResponse.json(
        {
          success: false,
          code: "ORDER_DATA_NOT_FOUND",
          message:
            "O pedido não possui todos os dados no relatório e também não foi encontrado na coleção de pedidos. Não é possível recalcular os valores com segurança.",
        },
        {
          status: 409,
        },
      );
    }

    const {
      items,
      itemsQuantity,
      subtotal,
      deliveryFee,
      total,
      paymentMethod,
    } = resolvedOrder;

    /*
     * Remove o pedido da listagem consolidada.
     */
    report.orders = report.orders.filter((order) => {
      return String(order.orderNumber) !== decodedOrderNumber;
    });

    /*
     * Recalcula os indicadores gerais.
     */
    report.deliveredOrders = Math.max(0, report.deliveredOrders - 1);

    report.totalItemsSold = Math.max(0, report.totalItemsSold - itemsQuantity);

    report.productsRevenue = roundMoney(
      Math.max(0, report.productsRevenue - subtotal),
    );

    report.deliveryFees = roundMoney(
      Math.max(0, report.deliveryFees - deliveryFee),
    );

    report.totalRevenue = roundMoney(Math.max(0, report.totalRevenue - total));

    /*
     * Desconta cada produto do relatório.
     */
    for (const item of items) {
      const productIndex = report.products.findIndex((product) => {
        if (item.productId && product.productId) {
          return String(product.productId) === String(item.productId);
        }

        return (
          !item.productId &&
          !product.productId &&
          product.name.trim().toLowerCase() === item.name.trim().toLowerCase()
        );
      });

      if (productIndex === -1) {
        continue;
      }

      const reportProduct = report.products[productIndex];

      reportProduct.quantity = Math.max(
        0,
        reportProduct.quantity - item.quantity,
      );

      reportProduct.revenue = roundMoney(
        Math.max(0, reportProduct.revenue - item.total),
      );

      reportProduct.orderCount = Math.max(0, reportProduct.orderCount - 1);

      if (
        reportProduct.quantity === 0 &&
        reportProduct.revenue === 0 &&
        reportProduct.orderCount === 0
      ) {
        report.products.splice(productIndex, 1);
      }
    }

    /*
     * Desconta a forma de pagamento.
     */
    const paymentIndex = report.payments.findIndex((payment) => {
      return payment.method === paymentMethod;
    });

    if (paymentIndex !== -1) {
      const reportPayment = report.payments[paymentIndex];

      reportPayment.orders = Math.max(0, reportPayment.orders - 1);

      reportPayment.revenue = roundMoney(
        Math.max(0, reportPayment.revenue - total),
      );

      if (reportPayment.orders === 0 && reportPayment.revenue === 0) {
        report.payments.splice(paymentIndex, 1);
      }
    }

    /*
     * Desconta o pedido do desempenho diário.
     */
    const dateKey = getDateKey(reportOrder.deliveredAt);

    if (dateKey) {
      const dailyIndex = report.daily.findIndex((day) => {
        return day.dateKey === dateKey;
      });

      if (dailyIndex !== -1) {
        const reportDay = report.daily[dailyIndex];

        reportDay.orders = Math.max(0, reportDay.orders - 1);

        reportDay.itemsSold = Math.max(0, reportDay.itemsSold - itemsQuantity);

        reportDay.revenue = roundMoney(Math.max(0, reportDay.revenue - total));

        if (
          reportDay.orders === 0 &&
          reportDay.itemsSold === 0 &&
          reportDay.revenue === 0
        ) {
          report.daily.splice(dailyIndex, 1);
        }
      }
    }

    report.averageTicket =
      report.deliveredOrders > 0
        ? roundMoney(report.totalRevenue / report.deliveredOrders)
        : 0;

    await report.save();

    return NextResponse.json(
      {
        success: true,
        message: `Pedido #${decodedOrderNumber} removido do relatório com sucesso.`,
        report,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("[WeeklyReport] Erro ao remover pedido do relatório:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível remover o pedido do relatório.",
      },
      {
        status: 500,
      },
    );
  }
}

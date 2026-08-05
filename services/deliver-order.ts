import Order from "@/models/Order";
import WeeklyReport from "@/models/WeeklyReport";
import { getWeekRange } from "@/utils/week";

interface OrderItem {
  productId?: unknown;
  name: string;
  quantity: number;
  price: number;
  total?: number;
}

interface ConsolidateOrderResult {
  orderNumber: string | number;
  weekKey: string;
}

interface SelectedOrder {
  _id: unknown;

  orderNumber: string | number;

  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "out_for_delivery"
    | "delivered"
    | "canceled";

  customer?: {
    name?: string;
    phone?: string;
  };

  subtotal?: number;
  deliveryFee?: number;
  total?: number;

  payment?: {
    method?: string;
  };

  items: OrderItem[];

  createdAt?: Date;
}

interface DailyReportData {
  dateKey: string;
  label: string;
  shortLabel: string;
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function getDailyReportData(date: Date): DailyReportData {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(date);

  const shortLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    weekday: "short",
  }).format(date);

  return {
    dateKey,
    label,
    shortLabel,
  };
}

async function createWeeklyReportIfNeeded(): Promise<{
  weekKey: string;
  start: Date;
  end: Date;
}> {
  const { weekKey, start, end } = getWeekRange(new Date());

  await WeeklyReport.updateOne(
    {
      weekKey,
    },
    {
      $setOnInsert: {
        weekKey,
        weekStart: start,
        weekEnd: end,

        deliveredOrders: 0,
        canceledOrders: 0,
        totalItemsSold: 0,

        productsRevenue: 0,
        deliveryFees: 0,
        totalRevenue: 0,
        averageTicket: 0,

        products: [],
        payments: [],
        orders: [],
        canceled: [],
        daily: [],
      },
    },
    {
      upsert: true,
    },
  );

  return {
    weekKey,
    start,
    end,
  };
}

function normalizeOrderItems(orderItems: OrderItem[]) {
  return orderItems.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;

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

export async function deliverAndConsolidateOrder(
  orderId: string,
): Promise<ConsolidateOrderResult> {
  const order = (await Order.findById(orderId)
    .select({
      orderNumber: 1,
      status: 1,
      customer: 1,
      subtotal: 1,
      deliveryFee: 1,
      total: 1,
      payment: 1,
      items: 1,
      createdAt: 1,
    })
    .lean()) as SelectedOrder | null;

  if (!order) {
    throw new Error("Pedido não encontrado.");
  }

  if (order.status === "delivered") {
    throw new Error("Este pedido já foi entregue.");
  }

  if (order.status === "canceled") {
    throw new Error("Um pedido cancelado não pode ser entregue.");
  }

  const { weekKey } = await createWeeklyReportIfNeeded();

  const orderIdString = String(order._id);
  const orderNumber = String(order.orderNumber);

  /*
   * Impede que o mesmo pedido seja consolidado duas vezes.
   */
  const alreadyConsolidated = await WeeklyReport.exists({
    weekKey,
    $or: [
      {
        "orders.orderId": orderIdString,
      },
      {
        "orders.orderNumber": orderNumber,
      },
    ],
  });

  if (alreadyConsolidated) {
    throw new Error("Este pedido já foi registrado no relatório.");
  }

  const orderItems = normalizeOrderItems(order.items ?? []);

  const itemsQuantity = orderItems.reduce((total, item) => {
    return total + item.quantity;
  }, 0);

  const subtotal = roundMoney(Number(order.subtotal) || 0);

  const deliveryFee = roundMoney(Number(order.deliveryFee) || 0);

  const total = roundMoney(Number(order.total) || 0);

  const paymentMethod = order.payment?.method ?? "unknown";

  const deliveredAt = new Date();

  const dailyData = getDailyReportData(deliveredAt);

  /*
   * Adiciona o pedido completo no relatório e atualiza
   * os indicadores gerais.
   */
  await WeeklyReport.updateOne(
    {
      weekKey,
    },
    {
      $inc: {
        deliveredOrders: 1,
        totalItemsSold: itemsQuantity,
        productsRevenue: subtotal,
        deliveryFees: deliveryFee,
        totalRevenue: total,
      },

      $push: {
        orders: {
          orderId: orderIdString,
          orderNumber,

          customerName: order.customer?.name?.trim() || "Cliente não informado",

          customerPhone: order.customer?.phone?.trim() || "",

          deliveredAt,

          items: orderItems,
          itemsQuantity,

          paymentMethod,

          subtotal,
          deliveryFee,
          total,
        },
      },
    },
  );

  /*
   * Consolida cada produto do pedido.
   */
  for (const item of orderItems) {
    const productFilter = item.productId
      ? {
          weekKey,
          "products.productId": item.productId,
        }
      : {
          weekKey,

          products: {
            $elemMatch: {
              productId: null,
              name: item.name,
            },
          },
        };

    const existingProduct = await WeeklyReport.exists(productFilter);

    if (existingProduct) {
      await WeeklyReport.updateOne(productFilter, {
        $inc: {
          "products.$.quantity": item.quantity,
          "products.$.revenue": item.total,
          "products.$.orderCount": 1,
        },
      });
    } else {
      await WeeklyReport.updateOne(
        {
          weekKey,
        },
        {
          $push: {
            products: {
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
              revenue: item.total,
              orderCount: 1,
            },
          },
        },
      );
    }
  }

  /*
   * Consolida a forma de pagamento.
   */
  const existingPayment = await WeeklyReport.exists({
    weekKey,
    "payments.method": paymentMethod,
  });

  if (existingPayment) {
    await WeeklyReport.updateOne(
      {
        weekKey,
        "payments.method": paymentMethod,
      },
      {
        $inc: {
          "payments.$.orders": 1,
          "payments.$.revenue": total,
        },
      },
    );
  } else {
    await WeeklyReport.updateOne(
      {
        weekKey,
      },
      {
        $push: {
          payments: {
            method: paymentMethod,
            orders: 1,
            revenue: total,
          },
        },
      },
    );
  }

  /*
   * Consolida o desempenho do dia.
   */
  const existingDailyReport = await WeeklyReport.exists({
    weekKey,
    "daily.dateKey": dailyData.dateKey,
  });

  if (existingDailyReport) {
    await WeeklyReport.updateOne(
      {
        weekKey,
        "daily.dateKey": dailyData.dateKey,
      },
      {
        $inc: {
          "daily.$.orders": 1,
          "daily.$.itemsSold": itemsQuantity,
          "daily.$.revenue": total,
        },
      },
    );
  } else {
    await WeeklyReport.updateOne(
      {
        weekKey,
      },
      {
        $push: {
          daily: {
            dateKey: dailyData.dateKey,
            label: dailyData.label,
            shortLabel: dailyData.shortLabel,
            orders: 1,
            itemsSold: itemsQuantity,
            revenue: total,
          },
        },
      },
    );
  }

  /*
   * Atualiza o ticket médio.
   */
  const updatedReport = await WeeklyReport.findOne({
    weekKey,
  })
    .select({
      deliveredOrders: 1,
      totalRevenue: 1,
    })
    .lean();

  if (!updatedReport) {
    throw new Error("Não foi possível consolidar o relatório.");
  }

  const averageTicket =
    updatedReport.deliveredOrders > 0
      ? roundMoney(updatedReport.totalRevenue / updatedReport.deliveredOrders)
      : 0;

  await WeeklyReport.updateOne(
    {
      weekKey,
    },
    {
      $set: {
        averageTicket,
      },
    },
  );

  /*
   * Atualiza somente o status.
   * O pedido permanece salvo na coleção orders.
   */
  const updatedOrder = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        status: "delivered",
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!updatedOrder) {
    throw new Error(
      "O relatório foi atualizado, mas não foi possível marcar o pedido como entregue.",
    );
  }

  return {
    orderNumber: order.orderNumber,
    weekKey,
  };
}

export async function cancelAndConsolidateOrder(
  orderId: string,
): Promise<ConsolidateOrderResult> {
  const order = (await Order.findById(orderId)
    .select({
      orderNumber: 1,
      status: 1,
      customer: 1,
      subtotal: 1,
      deliveryFee: 1,
      total: 1,
      payment: 1,
      items: 1,
      createdAt: 1,
    })
    .lean()) as SelectedOrder | null;

  if (!order) {
    throw new Error("Pedido não encontrado.");
  }

  if (order.status === "delivered") {
    throw new Error("Um pedido entregue não pode ser cancelado.");
  }

  if (order.status === "canceled") {
    throw new Error("Este pedido já foi cancelado.");
  }

  const { weekKey } = await createWeeklyReportIfNeeded();

  const orderIdString = String(order._id);
  const orderNumber = String(order.orderNumber);

  /*
   * Impede que o mesmo cancelamento seja consolidado duas vezes.
   */
  const alreadyConsolidated = await WeeklyReport.exists({
    weekKey,
    $or: [
      {
        "canceled.orderId": orderIdString,
      },
      {
        "canceled.orderNumber": orderNumber,
      },
    ],
  });

  if (alreadyConsolidated) {
    throw new Error("Este cancelamento já foi registrado no relatório.");
  }

  const orderItems = normalizeOrderItems(order.items ?? []);

  const itemsQuantity = orderItems.reduce((total, item) => {
    return total + item.quantity;
  }, 0);

  const subtotal = roundMoney(Number(order.subtotal) || 0);

  const deliveryFee = roundMoney(Number(order.deliveryFee) || 0);

  const total = roundMoney(Number(order.total) || 0);

  const paymentMethod = order.payment?.method ?? "unknown";

  const canceledAt = new Date();

  await WeeklyReport.updateOne(
    {
      weekKey,
    },
    {
      $inc: {
        canceledOrders: 1,
      },

      $push: {
        canceled: {
          orderId: orderIdString,
          orderNumber,

          customerName: order.customer?.name?.trim() || "Cliente não informado",

          customerPhone: order.customer?.phone?.trim() || "",

          canceledAt,

          items: orderItems,
          itemsQuantity,

          paymentMethod,

          subtotal,
          deliveryFee,
          total,
        },
      },
    },
  );

  /*
   * Atualiza somente o status.
   * O pedido original continua salvo.
   */
  const updatedOrder = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: {
        status: "canceled",
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!updatedOrder) {
    throw new Error(
      "O cancelamento foi registrado no relatório, mas não foi possível atualizar o pedido.",
    );
  }

  return {
    orderNumber: order.orderNumber,
    weekKey,
  };
}

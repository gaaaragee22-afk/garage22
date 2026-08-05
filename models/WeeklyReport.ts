import { Model, Schema, model, models } from "mongoose";

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

interface WeeklyOrderItem {
  productId?: string | null;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface WeeklyDeliveredOrder {
  /**
   * ID do pedido original na coleção orders.
   */
  orderId: string;

  orderNumber: string;

  customerName: string;
  customerPhone: string;

  deliveredAt: Date;

  /**
   * Dados necessários para recalcular o relatório
   * caso este pedido seja removido.
   */
  items: WeeklyOrderItem[];
  itemsQuantity: number;

  paymentMethod: string;

  subtotal: number;
  deliveryFee: number;
  total: number;
}

interface WeeklyCanceledOrder {
  /**
   * ID do pedido original na coleção orders.
   */
  orderId: string;

  orderNumber: string;

  customerName: string;
  customerPhone: string;

  canceledAt: Date;

  items: WeeklyOrderItem[];
  itemsQuantity: number;

  paymentMethod: string;

  subtotal: number;
  deliveryFee: number;
  total: number;
}

interface WeeklyDailyReport {
  dateKey: string;
  label: string;
  shortLabel: string;
  orders: number;
  itemsSold: number;
  revenue: number;
}

export interface WeeklyReportDocument {
  weekKey: string;

  weekStart: Date;
  weekEnd: Date;

  deliveredOrders: number;
  canceledOrders: number;
  totalItemsSold: number;

  productsRevenue: number;
  deliveryFees: number;
  totalRevenue: number;
  averageTicket: number;

  products: WeeklyProduct[];
  payments: WeeklyPayment[];
  orders: WeeklyDeliveredOrder[];
  canceled: WeeklyCanceledOrder[];
  daily: WeeklyDailyReport[];

  createdAt: Date;
  updatedAt: Date;
}

const weeklyProductSchema = new Schema<WeeklyProduct>(
  {
    productId: {
      type: String,
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    revenue: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    orderCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const weeklyPaymentSchema = new Schema<WeeklyPayment>(
  {
    method: {
      type: String,
      required: true,
      trim: true,
      default: "unknown",
    },

    orders: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    revenue: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const weeklyOrderItemSchema = new Schema<WeeklyOrderItem>(
  {
    productId: {
      type: String,
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const weeklyDeliveredOrderSchema = new Schema<WeeklyDeliveredOrder>(
  {
    orderId: {
      type: String,
      required: true,
      trim: true,
    },

    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
      default: "Cliente não informado",
    },

    customerPhone: {
      type: String,
      trim: true,
      default: "",
    },

    deliveredAt: {
      type: Date,
      required: true,
    },

    items: {
      type: [weeklyOrderItemSchema],
      required: true,
      default: [],
    },

    itemsQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    paymentMethod: {
      type: String,
      required: true,
      trim: true,
      default: "unknown",
    },

    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const weeklyCanceledOrderSchema = new Schema<WeeklyCanceledOrder>(
  {
    orderId: {
      type: String,
      required: true,
      trim: true,
    },

    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
      default: "Cliente não informado",
    },

    customerPhone: {
      type: String,
      trim: true,
      default: "",
    },

    canceledAt: {
      type: Date,
      required: true,
    },

    items: {
      type: [weeklyOrderItemSchema],
      required: true,
      default: [],
    },

    itemsQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    paymentMethod: {
      type: String,
      required: true,
      trim: true,
      default: "unknown",
    },

    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const weeklyDailyReportSchema = new Schema<WeeklyDailyReport>(
  {
    dateKey: {
      type: String,
      required: true,
      trim: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    shortLabel: {
      type: String,
      required: true,
      trim: true,
    },

    orders: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    itemsSold: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    revenue: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const weeklyReportSchema = new Schema<WeeklyReportDocument>(
  {
    weekKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    weekStart: {
      type: Date,
      required: true,
    },

    weekEnd: {
      type: Date,
      required: true,
    },

    deliveredOrders: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    canceledOrders: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    totalItemsSold: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    productsRevenue: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    deliveryFees: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    totalRevenue: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    averageTicket: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    products: {
      type: [weeklyProductSchema],
      default: [],
    },

    payments: {
      type: [weeklyPaymentSchema],
      default: [],
    },

    orders: {
      type: [weeklyDeliveredOrderSchema],
      default: [],
    },

    canceled: {
      type: [weeklyCanceledOrderSchema],
      default: [],
    },

    daily: {
      type: [weeklyDailyReportSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

weeklyReportSchema.index({
  weekStart: -1,
});

weeklyReportSchema.index({
  "orders.orderId": 1,
});

weeklyReportSchema.index({
  "orders.orderNumber": 1,
});

weeklyReportSchema.index({
  "canceled.orderId": 1,
});

const WeeklyReport =
  (models.WeeklyReport as Model<WeeklyReportDocument>) ||
  model<WeeklyReportDocument>("WeeklyReport", weeklyReportSchema);

export default WeeklyReport;

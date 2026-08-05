export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "canceled";

export type OrderPaymentMethod = "cash" | "pix" | "card";
export type OrderCardType = "debit" | "credit";
export type OrderCardBrand =
  | "visa"
  | "mastercard"
  | "elo"
  | "hipercard"
  | "amex"
  | "other";

export interface AdminOrderCustomer {
  name?: string;
  phone: string;
}

export interface AdminOrderAddress {
  cep: string;
  street: string;
  neighborhood: string;
  number: string;
  complement: string;
  reference: string;
  city: string;
  state: string;
}

export interface AdminOrderPayment {
  method: OrderPaymentMethod;
  changeFor: number | null;
  cardType: OrderCardType | null;
  cardBrand: OrderCardBrand | null;
}

export interface AdminOrderItem {
  _id?: string;
  productId: string;
  name: string;
  description: string;
  image: string;
  price: number;
  quantity: number;
  total: number;
}

export interface AdminOrder {
  _id: string;
  orderNumber: string;
  customer: AdminOrderCustomer;
  address: AdminOrderAddress;
  payment: AdminOrderPayment;
  items: AdminOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  success?: boolean;
  orders: AdminOrder[];
}

export interface OrderResponse {
  success: boolean;
  message?: string;
  order: AdminOrder;
}

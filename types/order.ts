export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type OrderPaymentMethod = "cash" | "pix" | "card";

export type OrderCardType = "debit" | "credit";

export type OrderCardBrand =
  | "visa"
  | "mastercard"
  | "elo"
  | "hipercard"
  | "amex"
  | "other";

export type OrderCity = "Cuité" | "Nova Floresta" | "Jaçanã";

export type OrderState = "PB" | "RN";

export interface OrderCustomer {
  phone: string;
}

export interface OrderAddress {
  cep: string;
  street: string;
  neighborhood: string;
  number: string;
  complement: string;
  reference: string;
  city: OrderCity;
  state: OrderState;
}

export interface OrderPayment {
  method: OrderPaymentMethod;
  changeFor: number | null;
  cardType: OrderCardType | null;
  cardBrand: OrderCardBrand | null;
}

export interface OrderItem {
  productId: string;
  name: string;
  description: string;
  image: string;
  price: number;
  quantity: number;
  total: number;
}

export interface CreateOrderData {
  customer: OrderCustomer;
  address: OrderAddress;
  payment: OrderPayment;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

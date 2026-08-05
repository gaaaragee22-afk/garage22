export type CheckoutStep = "phone" | "cep" | "address" | "payment" | "review";

export type AllowedCity = "Cuité" | "Nova Floresta" | "Jaçanã";

export type AllowedState = "PB" | "RN";

export type PaymentMethod = "cash" | "pix" | "card";

export type CardType = "debit" | "credit";

export type CardBrand =
  | "visa"
  | "mastercard"
  | "elo"
  | "hipercard"
  | "amex"
  | "other";

export interface CustomerData {
  phone: string;
}

export interface AddressData {
  cep: string;
  street: string;
  neighborhood: string;
  number: string;
  complement: string;
  reference: string;
  city: AllowedCity | "";
  state: AllowedState | "";
}

export interface PaymentData {
  method: PaymentMethod | "";

  /**
   * Valor informado pelo cliente para receber o troco.
   * Exemplo: pedido de R$ 42 e cliente pagará com R$ 50.
   *
   * null significa que o cliente não precisa de troco.
   */
  changeFor: number | null;

  /**
   * Usado apenas quando method === "card".
   */
  cardType: CardType | "";

  /**
   * Usado apenas quando method === "card".
   */
  cardBrand: CardBrand | "";
}

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  unidade: string;
  bairro: string;
  localidade: string;
  uf: string;
  estado: string;
  regiao: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export interface CreatedOrder {
  orderNumber: string;
  phone: string;
  address: AddressData;
  payment: PaymentData;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
}

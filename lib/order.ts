import crypto from "node:crypto";

import { Types } from "mongoose";

import type {
  CreateOrderData,
  OrderCardBrand,
  OrderCardType,
  OrderCity,
  OrderPaymentMethod,
  OrderState,
} from "@/types/order";

const allowedCities: OrderCity[] = ["Cuité", "Nova Floresta", "Jaçanã"];

const allowedStates: OrderState[] = ["PB", "RN"];

const allowedPaymentMethods: OrderPaymentMethod[] = ["cash", "pix", "card"];

const allowedCardTypes: OrderCardType[] = ["debit", "credit"];

const allowedCardBrands: OrderCardBrand[] = [
  "visa",
  "mastercard",
  "elo",
  "hipercard",
  "amex",
  "other",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} precisa ser um texto.`);
  }

  const sanitizedValue = value.trim();

  if (!sanitizedValue) {
    throw new Error(`${fieldName} é obrigatório.`);
  }

  return sanitizedValue;
}

function readOptionalString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function readNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} precisa ser um número válido.`);
  }

  if (value < 0) {
    throw new Error(`${fieldName} não pode ser negativo.`);
  }

  return Number(value.toFixed(2));
}

function approximatelyEqual(firstValue: number, secondValue: number): boolean {
  return Math.abs(firstValue - secondValue) < 0.01;
}

export function generateOrderNumber(): string {
  const date = new Date();

  const datePart = [
    date.getFullYear().toString().slice(-2),

    String(date.getMonth() + 1).padStart(2, "0"),

    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const randomPart = crypto.randomInt(0, 999999).toString().padStart(6, "0");

  return `${datePart}${randomPart}`;
}

export function validateCreateOrder(body: unknown): CreateOrderData {
  if (!isRecord(body)) {
    throw new Error("Os dados do pedido são inválidos.");
  }

  if (!isRecord(body.customer)) {
    throw new Error("Os dados do cliente são inválidos.");
  }

  const phone = readString(body.customer.phone, "Telefone");

  const phoneNumbers = phone.replace(/\D/g, "");

  if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
    throw new Error("Informe um telefone válido com DDD.");
  }

  if (!isRecord(body.address)) {
    throw new Error("O endereço do pedido é inválido.");
  }

  const cep = readString(body.address.cep, "CEP").replace(/\D/g, "");

  if (cep.length !== 8) {
    throw new Error("Informe um CEP válido.");
  }

  const cityValue = readString(body.address.city, "Cidade");

  const stateValue = readString(body.address.state, "Estado").toUpperCase();

  if (!allowedCities.includes(cityValue as OrderCity)) {
    throw new Error("A cidade informada não é atendida.");
  }

  if (!allowedStates.includes(stateValue as OrderState)) {
    throw new Error("O estado informado não é atendido.");
  }

  const city: OrderCity = cityValue as OrderCity;

  const state: OrderState = stateValue as OrderState;

  if (!isRecord(body.payment)) {
    throw new Error("A forma de pagamento é inválida.");
  }

  const method = readString(
    body.payment.method,
    "Forma de pagamento",
  ) as OrderPaymentMethod;

  if (!allowedPaymentMethods.includes(method)) {
    throw new Error("A forma de pagamento informada é inválida.");
  }

  let changeFor: number | null = null;
  let cardType: OrderCardType | null = null;
  let cardBrand: OrderCardBrand | null = null;

  if (method === "cash") {
    if (
      body.payment.changeFor !== null &&
      body.payment.changeFor !== undefined
    ) {
      changeFor = readNumber(body.payment.changeFor, "Valor para troco");
    }
  }

  if (method === "card") {
    cardType = readString(
      body.payment.cardType,
      "Tipo de cartão",
    ) as OrderCardType;

    cardBrand = readString(
      body.payment.cardBrand,
      "Bandeira do cartão",
    ) as OrderCardBrand;

    if (!allowedCardTypes.includes(cardType)) {
      throw new Error("O tipo do cartão é inválido.");
    }

    if (!allowedCardBrands.includes(cardBrand)) {
      throw new Error("A bandeira do cartão é inválida.");
    }
  }

  if (!Array.isArray(body.items)) {
    throw new Error("Os produtos do pedido são inválidos.");
  }

  if (body.items.length === 0) {
    throw new Error("O pedido precisa ter pelo menos um produto.");
  }

  const items = body.items.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`O produto ${index + 1} é inválido.`);
    }

    const productId = readString(item.productId, `ID do produto ${index + 1}`);

    if (!Types.ObjectId.isValid(productId)) {
      throw new Error(`O ID do produto ${index + 1} é inválido.`);
    }

    const price = readNumber(item.price, `Preço do produto ${index + 1}`);

    if (
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    ) {
      throw new Error(`A quantidade do produto ${index + 1} é inválida.`);
    }

    const quantity = item.quantity;

    const total = Number((price * quantity).toFixed(2));

    return {
      productId,

      name: readString(item.name, `Nome do produto ${index + 1}`),

      description: readOptionalString(item.description),

      image: readOptionalString(item.image),

      price,
      quantity,
      total,
    };
  });

  const calculatedSubtotal = Number(
    items.reduce((sum, item) => sum + item.total, 0).toFixed(2),
  );

  const receivedSubtotal = readNumber(body.subtotal, "Subtotal");

  if (!approximatelyEqual(calculatedSubtotal, receivedSubtotal)) {
    throw new Error("O subtotal recebido não corresponde aos produtos.");
  }

  const deliveryFee = readNumber(body.deliveryFee, "Taxa de entrega");

  const calculatedTotal = Number((calculatedSubtotal + deliveryFee).toFixed(2));

  const receivedTotal = readNumber(body.total, "Total");

  if (!approximatelyEqual(calculatedTotal, receivedTotal)) {
    throw new Error(
      "O total recebido não corresponde ao subtotal e à entrega.",
    );
  }

  if (method === "cash" && changeFor !== null && changeFor < calculatedTotal) {
    throw new Error(
      "O valor informado para troco não pode ser menor que o total.",
    );
  }

  return {
    customer: {
      phone,
    },

    address: {
      cep,

      street: readString(body.address.street, "Rua"),

      neighborhood: readString(body.address.neighborhood, "Bairro"),

      number: readString(body.address.number, "Número"),

      complement: readOptionalString(body.address.complement),

      reference: readOptionalString(body.address.reference),

      city,
      state,
    },

    payment: {
      method,
      changeFor,
      cardType,
      cardBrand,
    },

    items,
    subtotal: calculatedSubtotal,
    deliveryFee,
    total: calculatedTotal,
  };
}

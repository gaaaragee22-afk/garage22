"use client";

import Image from "next/image";

import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Minus,
  Pencil,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";

import type { CartItem, CartMutationResult } from "@/context/CartContext";

import { useStoreStatus } from "@/context/StoreStatusContext";

import type { AddressData, PaymentData } from "@/types/checkout";

import { formatCurrency } from "@/utils/format";

interface ReviewStepProps {
  phone: string;
  address: AddressData;
  payment: PaymentData;

  items: CartItem[];

  subtotal: number;
  deliveryFee: number;
  total: number;

  isSubmitting: boolean;
  error: string;

  onIncrease: (productId: string) => CartMutationResult;

  onDecrease: (productId: string) => void;

  onRemove: (productId: string) => void;

  onEditPhone: () => void;
  onEditAddress: () => void;
  onEditPayment: () => void;

  onBack: () => void;

  onFinish: (() => void) | (() => Promise<void>);
}

function getProductPrice(product: CartItem): number {
  const promotionalPrice = product.promotionalPrice;

  const hasValidPromotion =
    typeof promotionalPrice === "number" &&
    Number.isFinite(promotionalPrice) &&
    promotionalPrice > 0 &&
    promotionalPrice < product.price;

  return hasValidPromotion ? promotionalPrice : product.price;
}

function getPaymentDescription(payment: PaymentData): string {
  if (payment.method === "pix") {
    return "Pix";
  }

  if (payment.method === "cash") {
    if (payment.changeFor === null) {
      return "Dinheiro — sem necessidade de troco";
    }

    return `Dinheiro — troco para ${formatCurrency(payment.changeFor)}`;
  }

  if (payment.method === "card") {
    const cardTypes = {
      debit: "Débito",
      credit: "Crédito",
    };

    const cardBrands = {
      visa: "Visa",
      mastercard: "Mastercard",
      elo: "Elo",
      hipercard: "Hipercard",
      amex: "American Express",
      other: "Outra bandeira",
    };

    const cardType = payment.cardType
      ? cardTypes[payment.cardType]
      : "Tipo não informado";

    const cardBrand = payment.cardBrand
      ? cardBrands[payment.cardBrand]
      : "Bandeira não informada";

    return `Cartão de ${cardType} — ${cardBrand}`;
  }

  return "Forma de pagamento não informada";
}

export default function ReviewStep({
  phone,
  address,
  payment,
  items,
  subtotal,
  deliveryFee,
  total,
  isSubmitting,
  error,
  onIncrease,
  onDecrease,
  onRemove,
  onEditPhone,
  onEditAddress,
  onEditPayment,
  onBack,
  onFinish,
}: ReviewStepProps) {
  const { store, isOpen, isLoading: isLoadingStore } = useStoreStatus();

  const storeBlocked = isLoadingStore || !isOpen;

  const storeBlockedMessage = isLoadingStore
    ? "Aguarde enquanto verificamos o funcionamento da loja."
    : store?.closedMessage ||
      "No momento, nossa loja está fechada para novos pedidos.";

  function handleIncrease(productId: string): void {
    if (storeBlocked) {
      return;
    }

    const result = onIncrease(productId);

    if (!result.success) {
      console.warn(
        "[ReviewStep] Não foi possível aumentar a quantidade:",
        result.message,
      );
    }
  }

  function handleFinish(): void {
    if (storeBlocked || isSubmitting || items.length === 0) {
      return;
    }

    void onFinish();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {storeBlocked && (
          <div className="flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
              <LockKeyhole size={20} />
            </div>

            <div>
              <strong className="block text-sm font-black text-red-900">
                Pedidos bloqueados
              </strong>

              <p className="mt-1 text-sm leading-6 text-red-700">
                {storeBlockedMessage}
              </p>
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
                <ShoppingBag size={21} />
              </div>

              <div>
                <h2 className="font-bold text-zinc-900">Produtos</h2>

                <p className="text-sm text-zinc-500">
                  {items.length} {items.length === 1 ? "produto" : "produtos"}
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-zinc-100">
            {items.map((item) => {
              const unitPrice = getProductPrice(item);

              const hasPromotion = unitPrice < item.price;

              return (
                <article
                  key={item._id}
                  className="grid gap-4 py-5 first:pt-0 last:pb-0 sm:grid-cols-[88px_1fr_auto]"
                >
                  <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-zinc-100 sm:h-[88px] sm:w-[88px]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="88px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <ShoppingBag size={26} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-900">{item.name}</h3>

                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-500">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#7f3c19]">
                        {formatCurrency(unitPrice)}
                      </span>

                      {hasPromotion && (
                        <span className="text-sm font-medium text-zinc-400 line-through">
                          {formatCurrency(item.price)}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex w-fit items-center overflow-hidden rounded-xl border border-zinc-200 bg-white">
                      <button
                        type="button"
                        aria-label={`Diminuir quantidade de ${item.name}`}
                        onClick={() => onDecrease(item._id)}
                        disabled={isSubmitting}
                        className="flex h-10 w-10 items-center justify-center text-zinc-700 transition hover:bg-[#fdf4c3] hover:text-[#7f3c19] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Minus size={17} />
                      </button>

                      <span className="min-w-10 text-center text-sm font-bold text-zinc-900">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        aria-label={
                          storeBlocked
                            ? `Não é possível aumentar ${item.name} porque a loja está fechada`
                            : `Aumentar quantidade de ${item.name}`
                        }
                        title={
                          storeBlocked
                            ? storeBlockedMessage
                            : "Aumentar quantidade"
                        }
                        onClick={() => handleIncrease(item._id)}
                        disabled={storeBlocked || isSubmitting}
                        className={`flex h-10 w-10 items-center justify-center transition ${
                          storeBlocked || isSubmitting
                            ? "cursor-not-allowed bg-zinc-100 text-zinc-400"
                            : "text-zinc-700 hover:bg-[#fdf4c3] hover:text-[#7f3c19]"
                        }`}
                      >
                        {storeBlocked ? (
                          <LockKeyhole size={15} />
                        ) : (
                          <Plus size={17} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <strong className="text-[#7f3c19]">
                      {formatCurrency(unitPrice * item.quantity)}
                    </strong>

                    <button
                      type="button"
                      onClick={() => onRemove(item._id)}
                      disabled={isSubmitting}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-50 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
                <Phone size={20} />
              </div>

              <div>
                <p className="text-sm text-zinc-500">Celular</p>

                <p className="mt-1 font-bold text-zinc-900">{phone}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onEditPhone}
              disabled={isSubmitting}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#7f3c19] transition hover:bg-[#fdf4c3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil size={15} />

              <span className="hidden sm:inline">Alterar</span>
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
                <MapPin size={20} />
              </div>

              <div className="min-w-0">
                <p className="text-sm text-zinc-500">Endereço de entrega</p>

                <p className="mt-1 break-words font-bold text-zinc-900">
                  {address.street}, {address.number}
                </p>

                <p className="mt-1 break-words text-sm leading-6 text-zinc-600">
                  {address.neighborhood}
                  {address.complement ? `, ${address.complement}` : ""}
                  <br />
                  {address.city} - {address.state}
                  <br />
                  CEP: {address.cep}
                  {address.reference && (
                    <>
                      <br />
                      Referência: {address.reference}
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onEditAddress}
              disabled={isSubmitting}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#7f3c19] transition hover:bg-[#fdf4c3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil size={15} />

              <span className="hidden sm:inline">Alterar</span>
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
                <CreditCard size={20} />
              </div>

              <div className="min-w-0">
                <p className="text-sm text-zinc-500">Forma de pagamento</p>

                <p className="mt-1 break-words font-bold text-zinc-900">
                  {getPaymentDescription(payment)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onEditPayment}
              disabled={isSubmitting}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#7f3c19] transition hover:bg-[#fdf4c3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil size={15} />

              <span className="hidden sm:inline">Alterar</span>
            </button>
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7 lg:sticky lg:top-24">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
            <ShoppingBag size={20} />
          </div>

          <h2 className="text-xl font-bold text-zinc-900">Resumo do pedido</h2>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-zinc-500">Subtotal</span>

            <span className="font-semibold text-zinc-900">
              {formatCurrency(subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="inline-flex items-center gap-2 text-zinc-500">
              <Truck size={17} className="text-[#7f5417]" />
              Entrega para {address.city}
            </span>

            <span className="shrink-0 font-semibold text-zinc-900">
              {formatCurrency(deliveryFee)}
            </span>
          </div>
        </div>

        <div className="my-6 h-px bg-zinc-200" />

        <div className="flex items-end justify-between gap-4">
          <span className="font-bold text-zinc-900">Total</span>

          <strong className="text-2xl text-[#7f3c19]">
            {formatCurrency(total)}
          </strong>
        </div>

        {(error || storeBlocked) && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-medium leading-5 text-red-700"
          >
            {error || storeBlockedMessage}
          </p>
        )}

        <button
          type="button"
          disabled={isSubmitting || items.length === 0 || storeBlocked}
          onClick={handleFinish}
          className="mt-7 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-5 font-bold text-white shadow-[0_10px_25px_rgba(127,60,25,0.22)] transition hover:bg-[#58141e] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle size={20} className="animate-spin" />
              Finalizando...
            </>
          ) : storeBlocked ? (
            <>
              <LockKeyhole size={19} />
              Loja fechada
            </>
          ) : (
            <>
              <CheckCircle2 size={20} />
              Finalizar pedido
            </>
          )}
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={onBack}
          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-300 font-semibold text-zinc-700 transition hover:border-[#7f5417]/40 hover:bg-[#fdf4c3] hover:text-[#7f3c19] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>
      </aside>
    </div>
  );
}

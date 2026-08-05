"use client";

import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
} from "lucide-react";

import type {
  CardBrand,
  CardType,
  PaymentData,
  PaymentMethod,
} from "@/types/checkout";

interface PaymentStepProps {
  payment: PaymentData;
  total: number;
  onPaymentChange: (data: Partial<PaymentData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

const paymentMethods: {
  value: PaymentMethod;
  title: string;
  description: string;
  icon: typeof Banknote;
}[] = [
  {
    value: "cash",
    title: "Dinheiro",
    description: "Pagamento na entrega",
    icon: Banknote,
  },
  {
    value: "pix",
    title: "Pix",
    description: "Pagamento via Pix",
    icon: Landmark,
  },
  {
    value: "card",
    title: "Cartão",
    description: "Débito ou crédito",
    icon: CreditCard,
  },
];

const cardBrands: {
  value: CardBrand;
  label: string;
}[] = [
  {
    value: "visa",
    label: "Visa",
  },
  {
    value: "mastercard",
    label: "Mastercard",
  },
  {
    value: "elo",
    label: "Elo",
  },
  {
    value: "hipercard",
    label: "Hipercard",
  },
  {
    value: "amex",
    label: "American Express",
  },
  {
    value: "other",
    label: "Outra",
  },
];

export default function PaymentStep({
  payment,
  total,
  onPaymentChange,
  onContinue,
  onBack,
}: PaymentStepProps) {
  const isCashValid =
    payment.method !== "cash" ||
    payment.changeFor === null ||
    payment.changeFor >= total;

  const isCardValid =
    payment.method !== "card" || Boolean(payment.cardType && payment.cardBrand);

  const canContinue = Boolean(payment.method) && isCashValid && isCardValid;

  function handleMethodChange(method: PaymentMethod) {
    onPaymentChange({
      method,

      // Limpa campos que não pertencem ao método selecionado.
      changeFor: method === "cash" ? payment.changeFor : null,
      cardType: method === "card" ? payment.cardType : "",
      cardBrand: method === "card" ? payment.cardBrand : "",
    });
  }

  function handleChangeFor(value: string) {
    const normalizedValue = value.replace(",", ".");

    if (!normalizedValue) {
      onPaymentChange({
        changeFor: null,
      });
      return;
    }

    const numericValue = Number(normalizedValue);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return;
    }

    onPaymentChange({
      changeFor: numericValue,
    });
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
      <div>
        <p className="text-sm font-semibold text-[#7f5417]">
          Forma de pagamento
        </p>

        <h2 className="mt-1 text-2xl font-extrabold text-zinc-900">
          Como você deseja pagar?
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Escolha a opção que será utilizada no momento da entrega.
        </p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = payment.method === method.value;

          return (
            <button
              key={method.value}
              type="button"
              onClick={() => handleMethodChange(method.value)}
              className={`rounded-2xl border p-5 text-left transition ${
                isSelected
                  ? "border-[#7f3c19] bg-[#fdf4c3]/70 ring-2 ring-[#7f3c19]/10"
                  : "border-zinc-200 bg-white hover:border-[#7f5417]/40 hover:bg-[#fdf4c3]/35"
              }`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                  isSelected
                    ? "bg-[#7f3c19] text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                <Icon size={21} />
              </div>

              <h3 className="mt-4 font-bold text-zinc-900">{method.title}</h3>

              <p className="mt-1 text-sm text-zinc-500">{method.description}</p>
            </button>
          );
        })}
      </div>

      {payment.method === "cash" && (
        <div className="mt-7 rounded-2xl border border-[#7f5417]/20 bg-[#fdf4c3]/35 p-5">
          <label
            htmlFor="changeFor"
            className="block text-sm font-semibold text-zinc-800"
          >
            Troco para quanto?
          </label>

          <p className="mt-1 text-sm text-zinc-500">
            Deixe vazio caso não precise de troco.
          </p>

          <div className="relative mt-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-[#7f5417]">
              R$
            </span>

            <input
              id="changeFor"
              type="number"
              min={total}
              step="0.01"
              value={payment.changeFor ?? ""}
              onChange={(event) => handleChangeFor(event.target.value)}
              placeholder={total.toFixed(2)}
              className="h-12 w-full rounded-xl border border-zinc-300 bg-white pl-12 pr-4 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7f3c19] focus:ring-2 focus:ring-[#fdf4c3]"
            />
          </div>

          {!isCashValid && (
            <p className="mt-3 text-sm font-medium text-red-600">
              O valor para troco não pode ser menor que o total do pedido, que é
              R$ {total.toFixed(2).replace(".", ",")}.
            </p>
          )}

          {payment.changeFor !== null && isCashValid && (
            <div className="mt-4 rounded-xl border border-[#7f5417]/15 bg-white px-4 py-3 text-sm text-[#7f5417]">
              Troco estimado:{" "}
              <strong className="text-[#58141e]">
                R$ {(payment.changeFor - total).toFixed(2).replace(".", ",")}
              </strong>
            </div>
          )}
        </div>
      )}

      {payment.method === "pix" && (
        <div className="mt-7 rounded-2xl border border-[#7f5417]/20 bg-[#fdf4c3]/45 p-5">
          <h3 className="font-bold text-[#58141e]">Pagamento via Pix</h3>

          <p className="mt-2 text-sm leading-6 text-[#7f5417]">
            O pedido será registrado com a forma de pagamento Pix. As instruções
            de pagamento poderão ser enviadas depois da confirmação.
          </p>
        </div>
      )}

      {payment.method === "card" && (
        <div className="mt-7 space-y-6 rounded-2xl border border-[#7f5417]/20 bg-[#fdf4c3]/30 p-5">
          <div>
            <p className="text-sm font-semibold text-zinc-800">
              Tipo do cartão
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              {(
                [
                  {
                    value: "debit",
                    label: "Débito",
                  },
                  {
                    value: "credit",
                    label: "Crédito",
                  },
                ] satisfies {
                  value: CardType;
                  label: string;
                }[]
              ).map((type) => {
                const isSelected = payment.cardType === type.value;

                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      onPaymentChange({
                        cardType: type.value,
                      })
                    }
                    className={`h-12 rounded-xl border font-semibold transition ${
                      isSelected
                        ? "border-[#7f3c19] bg-[#7f3c19] text-white shadow-[0_6px_18px_rgba(127,60,25,0.18)]"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-[#7f5417]/50 hover:bg-[#fdf4c3]/45 hover:text-[#7f3c19]"
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="cardBrand"
              className="block text-sm font-semibold text-zinc-800"
            >
              Bandeira do cartão
            </label>

            <select
              id="cardBrand"
              value={payment.cardBrand}
              onChange={(event) =>
                onPaymentChange({
                  cardBrand: event.target.value as CardBrand,
                })
              }
              className="mt-3 h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-zinc-900 outline-none transition focus:border-[#7f3c19] focus:ring-2 focus:ring-[#fdf4c3]"
            >
              <option value="">Selecione a bandeira</option>

              {cardBrands.map((brand) => (
                <option key={brand.value} value={brand.value}>
                  {brand.label}
                </option>
              ))}
            </select>
          </div>

          {!isCardValid && (
            <p className="text-sm font-medium text-red-600">
              Informe o tipo e a bandeira do cartão.
            </p>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-6 font-semibold text-zinc-700 transition hover:border-[#7f5417]/40 hover:bg-[#fdf4c3] hover:text-[#7f3c19]"
        >
          <ChevronLeft size={18} />
          Voltar
        </button>

        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-6 font-semibold text-white transition hover:bg-[#58141e] disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          Revisar pedido
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}

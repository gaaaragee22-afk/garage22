"use client";

import { LockKeyhole, ShoppingBag } from "lucide-react";

import { useCart } from "@/hooks/useCart";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function FloatingCart() {
  const {
    items,
    totalItems,
    totalPrice,
    canAddProducts,
    cartBlockedMessage,
    openCart,
  } = useCart();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 md:left-auto md:right-6 md:w-[360px]">
      <button
        type="button"
        onClick={openCart}
        className={`flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-white shadow-[0_12px_35px_rgba(127,60,25,0.30)] transition active:scale-[0.98] ${
          canAddProducts
            ? "bg-[#7f3c19] hover:bg-[#58141e]"
            : "bg-zinc-950 hover:bg-zinc-800"
        }`}
        aria-label={
          canAddProducts
            ? "Abrir sacola"
            : "Abrir sacola. A loja está fechada para pedidos"
        }
        title={canAddProducts ? "Abrir sacola" : cartBlockedMessage}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            {canAddProducts ? (
              <ShoppingBag size={21} />
            ) : (
              <LockKeyhole size={20} />
            )}

            <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#fdf4c3] px-1.5 text-xs font-black text-[#58141e]">
              {totalItems}
            </span>
          </div>

          <div className="min-w-0 text-left">
            <span className="block truncate text-xs font-semibold text-[#fdf4c3]">
              {canAddProducts ? "Ver sacola" : "Loja fechada"}
            </span>

            <strong className="block truncate text-sm font-black">
              {canAddProducts
                ? `${totalItems} ${totalItems === 1 ? "item" : "itens"}`
                : "Finalização bloqueada"}
            </strong>
          </div>
        </div>

        <strong className="shrink-0 text-base font-black">
          {currencyFormatter.format(totalPrice)}
        </strong>
      </button>
    </div>
  );
}

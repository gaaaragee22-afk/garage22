"use client";

import {
  AlertCircle,
  LockKeyhole,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CartItem } from "@/context/CartContext";
import { useCart } from "@/hooks/useCart";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function getProductPrice(product: CartItem): number {
  const promotionalPrice = product.promotionalPrice;

  const hasValidPromotion =
    typeof promotionalPrice === "number" &&
    promotionalPrice > 0 &&
    promotionalPrice < product.price;

  return hasValidPromotion ? promotionalPrice : product.price;
}

export default function CartDrawer() {
  const {
    items,
    isCartOpen,
    totalItems,
    totalPrice,
    canAddProducts,
    cartBlockedMessage,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    closeCart,
  } = useCart();

  const router = useRouter();

  const [operationMessage, setOperationMessage] = useState("");

  const orderTotal = totalPrice;

  const checkoutBlocked = items.length === 0 || !canAddProducts;

  function handleIncreaseQuantity(productId: string): void {
    const result = increaseQuantity(productId);

    if (!result.success) {
      setOperationMessage(result.message);
      return;
    }

    setOperationMessage("");
  }

  function handleCheckout(): void {
    if (items.length === 0) {
      setOperationMessage("Sua sacola está vazia.");
      return;
    }

    if (!canAddProducts) {
      setOperationMessage(
        cartBlockedMessage || "A loja está fechada para novos pedidos.",
      );

      return;
    }

    setOperationMessage("");
    closeCart();
    router.push("/checkout");
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fechar sacola"
        onClick={closeCart}
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isCartOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sacola de compras"
        className={`fixed right-0 top-0 z-[60] flex h-dvh w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
              <ShoppingBag size={21} />
            </div>

            <div>
              <h2 className="text-lg font-black text-zinc-950">Sua sacola</h2>

              <span className="text-xs font-semibold text-zinc-500">
                {totalItems} {totalItems === 1 ? "item" : "itens"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closeCart}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition hover:bg-[#fdf4c3] hover:text-[#7f3c19]"
            aria-label="Fechar sacola"
          >
            <X size={20} />
          </button>
        </header>

        {!canAddProducts && (
          <div className="border-b border-red-200 bg-red-50 px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <LockKeyhole size={18} />
              </div>

              <div>
                <strong className="block text-sm font-black text-red-900">
                  Loja fechada para pedidos
                </strong>

                <p className="mt-1 text-xs leading-5 text-red-700">
                  {cartBlockedMessage ||
                    "No momento, não estamos recebendo novos pedidos."}
                </p>
              </div>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#fdf4c3] text-[#7f3c19]">
              <ShoppingBag size={40} strokeWidth={1.7} />
            </div>

            <h3 className="mt-6 text-xl font-black text-zinc-950">
              Sua sacola está vazia
            </h3>

            <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
              {canAddProducts
                ? "Adicione produtos do cardápio para começar seu pedido."
                : "A loja está fechada e não aceita novos produtos na sacola."}
            </p>

            <button
              type="button"
              onClick={closeCart}
              className="mt-6 rounded-2xl bg-[#7f3c19] px-6 py-3 text-sm font-black text-white transition hover:bg-[#58141e]"
            >
              Voltar ao cardápio
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {operationMessage && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                  <AlertCircle size={19} className="mt-0.5 shrink-0" />

                  <p className="text-sm font-bold leading-5">
                    {operationMessage}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {items.map((item) => {
                  const unitPrice = getProductPrice(item);
                  const hasPromotion = unitPrice < item.price;

                  return (
                    <article
                      key={item._id}
                      className="flex gap-3 rounded-2xl border border-zinc-200 p-3 transition hover:border-[#7f5417]/30"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-400">
                            <ShoppingBag size={24} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-black text-zinc-950">
                              {item.name}
                            </h3>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-[#7f3c19]">
                                {currencyFormatter.format(unitPrice)}
                              </span>

                              {hasPromotion && (
                                <span className="text-xs font-semibold text-zinc-400 line-through">
                                  {currencyFormatter.format(item.price)}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              removeFromCart(item._id);
                              setOperationMessage("");
                            }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500"
                            aria-label={`Remover ${item.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1">
                            <button
                              type="button"
                              onClick={() => {
                                decreaseQuantity(item._id);
                                setOperationMessage("");
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-zinc-700 shadow-sm transition hover:bg-[#fdf4c3] hover:text-[#7f3c19]"
                              aria-label={`Diminuir quantidade de ${item.name}`}
                            >
                              <Minus size={14} />
                            </button>

                            <span className="min-w-7 text-center text-xs font-black text-zinc-950">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                handleIncreaseQuantity(item._id);
                              }}
                              disabled={!canAddProducts}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg shadow-sm transition ${
                                canAddProducts
                                  ? "bg-white text-zinc-700 hover:bg-[#fdf4c3] hover:text-[#7f3c19]"
                                  : "cursor-not-allowed bg-zinc-200 text-zinc-400"
                              }`}
                              aria-label={
                                canAddProducts
                                  ? `Aumentar quantidade de ${item.name}`
                                  : `Não é possível aumentar ${item.name} porque a loja está fechada`
                              }
                              title={
                                canAddProducts
                                  ? "Aumentar quantidade"
                                  : cartBlockedMessage
                              }
                            >
                              {canAddProducts ? (
                                <Plus size={14} />
                              ) : (
                                <LockKeyhole size={13} />
                              )}
                            </button>
                          </div>

                          <strong className="text-sm font-black text-[#7f3c19]">
                            {currencyFormatter.format(
                              unitPrice * item.quantity,
                            )}
                          </strong>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setOperationMessage("");
                }}
                className="mt-5 text-sm font-bold text-red-500 transition hover:text-red-600"
              >
                Limpar sacola
              </button>
            </div>

            <footer className="border-t border-zinc-200 bg-white px-5 py-5 sm:px-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-zinc-500">
                  <span>Subtotal</span>

                  <span className="font-bold text-zinc-800">
                    {currencyFormatter.format(totalPrice)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-dashed border-zinc-300 pt-4">
                  <span className="font-black text-zinc-950">Total</span>

                  <strong className="text-2xl font-black text-[#7f3c19]">
                    {currencyFormatter.format(orderTotal)}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                disabled={checkoutBlocked}
                onClick={handleCheckout}
                className={`mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-bold transition ${
                  checkoutBlocked
                    ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                    : "bg-[#7f3c19] text-white hover:bg-[#58141e]"
                }`}
              >
                {!canAddProducts ? (
                  <>
                    <LockKeyhole size={18} />
                    Loja fechada
                  </>
                ) : (
                  "Prosseguir"
                )}
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

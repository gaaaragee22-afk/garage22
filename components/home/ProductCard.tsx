"use client";

import { Check, LockKeyhole, Plus } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { useStoreStatus } from "@/context/StoreStatusContext";
import { useCart } from "@/hooks/useCart";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, canAddProducts, cartBlockedMessage } = useCart();

  const { isLoading: isLoadingStore } = useStoreStatus();

  const [feedbackMessage, setFeedbackMessage] = useState("");

  const [wasAdded, setWasAdded] = useState(false);

  const finalPrice =
    typeof product.promotionalPrice === "number" &&
    product.promotionalPrice > 0 &&
    product.promotionalPrice < product.price
      ? product.promotionalPrice
      : product.price;

  const isAdditionBlocked = isLoadingStore || !canAddProducts;

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedbackMessage("");
      setWasAdded(false);
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedbackMessage]);

  function handleAddToCart(): void {
    if (isAdditionBlocked) {
      setWasAdded(false);

      setFeedbackMessage(
        cartBlockedMessage || "A loja está fechada para novos pedidos.",
      );

      return;
    }

    const result = addToCart({
      _id: product._id,
      name: product.name,
      description: product.description,
      price: product.price,
      promotionalPrice: product.promotionalPrice,
      image: product.image.url,
    });

    setWasAdded(result.success);
    setFeedbackMessage(result.message);
  }

  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-white transition ${
        isAdditionBlocked
          ? "border-zinc-200 opacity-90"
          : "border-zinc-200 hover:-translate-y-0.5 hover:shadow-lg"
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100">
        <Image
          src={product.image.url}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, 350px"
          className="object-cover transition duration-300 hover:scale-105"
        />

        {isAdditionBlocked && !isLoadingStore && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-zinc-950/85 px-3 py-2 text-xs font-black text-white backdrop-blur-sm">
            <LockKeyhole size={14} />
            Loja fechada
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-black text-zinc-950">{product.name}</h3>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
          {product.description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {finalPrice !== product.price && (
              <span className="block text-xs font-bold text-zinc-400 line-through">
                {product.price.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            )}

            <strong className="block text-xl font-black text-[#7f3c19]">
              {finalPrice.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdditionBlocked}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${
              isAdditionBlocked
                ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                : "bg-[#7f3c19] text-white hover:bg-[#58141e] active:scale-95"
            }`}
            aria-label={
              isAdditionBlocked
                ? `${product.name} indisponível porque a loja está fechada`
                : `Adicionar ${product.name} à sacola`
            }
            title={
              isAdditionBlocked
                ? cartBlockedMessage || "A loja está fechada."
                : `Adicionar ${product.name} à sacola`
            }
          >
            {isAdditionBlocked ? (
              <LockKeyhole size={18} />
            ) : wasAdded ? (
              <Check size={20} />
            ) : (
              <Plus size={20} />
            )}
          </button>
        </div>

        {feedbackMessage && (
          <div
            className={`mt-3 rounded-2xl border px-3 py-2 text-xs font-bold leading-5 ${
              wasAdded
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedbackMessage}
          </div>
        )}
      </div>
    </article>
  );
}

"use client";

import {
  AlertCircle,
  LoaderCircle,
  PackageSearch,
  RotateCcw,
} from "lucide-react";
import { useMemo } from "react";

import ProductCard from "@/components/home/ProductCard";
import type { Product } from "@/types";

interface ProductSectionProps {
  products: Product[];
  search?: string;
  isLoading?: boolean;
  errorMessage?: string;
  onRetry?: () => void | Promise<void>;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function ProductSection({
  products,
  search = "",
  isLoading = false,
  errorMessage = "",
  onRetry,
}: ProductSectionProps) {
  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) => {
      const productName = normalizeText(product.name);
      const productDescription = normalizeText(product.description ?? "");
      const categoryName = normalizeText(product.categoryName ?? "");

      return (
        productName.includes(normalizedSearch) ||
        productDescription.includes(normalizedSearch) ||
        categoryName.includes(normalizedSearch)
      );
    });
  }, [products, search]);

  return (
    <section
      id="products"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16"
    >
      <header className="mb-7 flex flex-col gap-2 sm:mb-9">
        <span className="text-sm font-black uppercase tracking-[0.18em] text-[#7f3c19]">
          Nosso cardápio
        </span>

        <h2 className="text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl lg:text-4xl">
          Escolha seus produtos
        </h2>

        <p className="max-w-2xl text-sm font-medium leading-6 text-zinc-500 sm:text-base">
          Produtos preparados com qualidade para você fazer seu pedido.
        </p>
      </header>

      {isLoading && (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-50 px-6 text-center">
          <LoaderCircle size={34} className="animate-spin text-[#7f3c19]" />

          <strong className="mt-4 text-base font-black text-zinc-900">
            Carregando produtos...
          </strong>

          <span className="mt-1 text-sm font-medium text-zinc-500">
            Aguarde enquanto buscamos os produtos.
          </span>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-red-200 bg-red-50 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle size={27} />
          </div>

          <strong className="mt-4 text-base font-black text-red-800">
            Não foi possível carregar os produtos
          </strong>

          <span className="mt-2 max-w-md text-sm font-medium leading-6 text-red-600">
            {errorMessage}
          </span>

          {onRetry && (
            <button
              type="button"
              onClick={() => void onRetry()}
              className="mt-5 flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-5 text-sm font-black text-white transition hover:bg-[#58141e] active:scale-[0.98]"
            >
              <RotateCcw size={17} />
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {!isLoading && !errorMessage && filteredProducts.length === 0 && (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-50 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fdf4c3] text-[#7f3c19] shadow-sm">
            <PackageSearch size={27} />
          </div>

          <strong className="mt-4 text-base font-black text-zinc-900">
            Nenhum produto encontrado
          </strong>

          <span className="mt-2 max-w-md text-sm font-medium leading-6 text-zinc-500">
            Não existem produtos disponíveis para esta categoria ou pesquisa.
          </span>
        </div>
      )}

      {!isLoading && !errorMessage && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

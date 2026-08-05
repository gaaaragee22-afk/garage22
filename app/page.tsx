"use client";

import axios from "axios";
import { useCallback, useState } from "react";

import CategoryNavigation from "@/components/home/CategoryNavigation";
import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import ProductSection from "@/components/home/ProductSection";

import type { Product } from "@/types";

interface ApiProduct extends Omit<Product, "categoryId" | "categoryName"> {
  categoryId:
    | string
    | {
        _id: string;
        name: string;
      };

  categoryName?: string;
}

interface ProductsResponse {
  success: boolean;
  count: number;
  products: ApiProduct[];
  message?: string;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return "Não foi possível carregar os produtos.";
  }

  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    "Não foi possível carregar os produtos."
  );
}

function normalizeProduct(product: ApiProduct): Product {
  const categoryId =
    typeof product.categoryId === "string"
      ? product.categoryId
      : product.categoryId._id;

  const categoryName =
    product.categoryName ||
    (typeof product.categoryId === "object" ? product.categoryId.name : "");

  return {
    ...product,
    categoryId,
    categoryName,
  };
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("");

  const [products, setProducts] = useState<Product[]>([]);

  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const loadProducts = useCallback(
    async (categoryId: string): Promise<void> => {
      try {
        setIsLoadingProducts(true);
        setErrorMessage("");

        const response = await axios.get<ProductsResponse>(
          "/api/product/products",
          {
            params: {
              categoryId,
              active: true,
            },
          },
        );

        console.log("Resposta dos produtos:", response.data);

        const normalizedProducts = (response.data.products ?? []).map(
          normalizeProduct,
        );

        setProducts(normalizedProducts);
      } catch (error: unknown) {
        console.error("Erro ao carregar produtos:", error);

        setProducts([]);
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsLoadingProducts(false);
      }
    },
    [],
  );

  const handleCategoryChange = useCallback(
    async (categoryId: string): Promise<void> => {
      setActiveCategory(categoryId);

      await loadProducts(categoryId);
    },
    [loadProducts],
  );

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <Header />

      <Hero />

      <CategoryNavigation
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />

      <ProductSection
        products={products}
        search=""
        isLoading={isLoadingProducts}
        errorMessage={errorMessage}
        onRetry={() => loadProducts(activeCategory)}
      />
    </main>
  );
}

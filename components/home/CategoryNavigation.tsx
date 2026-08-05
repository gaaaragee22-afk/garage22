"use client";

import axios from "axios";
import { useEffect, useState } from "react";

interface Category {
  _id: string;
  name: string;
  active: boolean;
  position: number;
}

interface CategoriesResponse {
  success: boolean;
  categories: Category[];
}

interface CategoryNavigationProps {
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void | Promise<void>;
}

export default function CategoryNavigation({
  activeCategory,
  onCategoryChange,
}: CategoryNavigationProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories(): Promise<void> {
      try {
        setIsLoading(true);

        const response = await axios.get<CategoriesResponse>(
          "/api/product/categories",
        );

        const receivedCategories = Array.isArray(response.data)
          ? response.data
          : (response.data.categories ?? []);

        const activeCategories = receivedCategories
          .filter((category) => category.active !== false)
          .sort(
            (firstCategory, secondCategory) =>
              (firstCategory.position ?? 0) - (secondCategory.position ?? 0),
          );

        if (!isMounted) {
          return;
        }

        setCategories(activeCategories);

        if (activeCategories.length > 0 && !activeCategory) {
          await onCategoryChange(activeCategories[0]._id);
        }
      } catch (error: unknown) {
        console.error("Erro ao carregar categorias:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, [activeCategory, onCategoryChange]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-12 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <nav className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="scrollbar-hidden flex gap-3 overflow-x-auto pb-2">
        {categories.map((category) => {
          const isActive = activeCategory === category._id;

          return (
            <button
              key={category._id}
              type="button"
              onClick={() => {
                void onCategoryChange(category._id);
              }}
              className={`shrink-0 rounded-full px-5 py-3 text-sm font-bold transition ${
                isActive
                  ? "bg-[#7f3c19] text-white hover:bg-[#58141e]"
                  : "bg-zinc-100 text-zinc-700 hover:bg-[#fdf4c3] hover:text-[#7f3c19]"
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import axios, { AxiosError } from "axios";
import {
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  LoaderCircle,
  Pencil,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import CategoryForm, {
  type EditableCategory,
} from "@/components/forms/CategoryForm";

interface Category extends EditableCategory {
  _id: string;
  name: string;
  description: string;
  position: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface CategoriesResponse {
  categories: Category[];
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

function getRequestErrorMessage(
  requestError: unknown,
  fallbackMessage: string,
) {
  if (!axios.isAxiosError(requestError)) {
    return fallbackMessage;
  }

  const axiosError = requestError as AxiosError<ApiErrorResponse>;

  return (
    axiosError.response?.data?.message ||
    axiosError.response?.data?.error ||
    fallbackMessage
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );

  const [error, setError] = useState("");

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    axios
      .get<CategoriesResponse>("/api/product/categories", {
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setCategories(response.data.categories ?? []);

        setError("");
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted || axios.isCancel(requestError)) {
          return;
        }

        setCategories([]);

        setError(
          getRequestErrorMessage(
            requestError,
            "Não foi possível carregar as categorias.",
          ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  async function fetchCategories() {
    const response = await axios.get<CategoriesResponse>(
      "/api/product/categories",
    );

    setCategories(response.data.categories ?? []);

    setError("");
  }

  async function handleRefreshCategories() {
    try {
      setIsRefreshing(true);
      setError("");

      await fetchCategories();
    } catch (requestError) {
      setCategories([]);

      setError(
        getRequestErrorMessage(
          requestError,
          "Não foi possível atualizar as categorias.",
        ),
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleCategorySaved() {
    try {
      await fetchCategories();
      setEditingCategory(null);
    } catch (requestError) {
      setError(
        getRequestErrorMessage(
          requestError,
          "A categoria foi salva, mas a listagem não pôde ser atualizada.",
        ),
      );
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    const confirmed = window.confirm(
      "Deseja realmente excluir esta categoria?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingCategoryId(categoryId);
      setError("");

      await axios.delete(`/api/product/categories/${categoryId}`);

      setCategories((currentCategories) =>
        currentCategories.filter((category) => category._id !== categoryId),
      );

      setEditingCategory((currentCategory) =>
        currentCategory?._id === categoryId ? null : currentCategory,
      );
    } catch (requestError) {
      setError(
        getRequestErrorMessage(
          requestError,
          "Não foi possível excluir a categoria.",
        ),
      );
    } finally {
      setDeletingCategoryId(null);
    }
  }

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter((category) => {
      return (
        category.name.toLowerCase().includes(normalizedSearch) ||
        category.description.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [categories, search]);

  const activeCategories = useMemo(() => {
    return categories.filter((category) => category.active).length;
  }, [categories]);

  const inactiveCategories = useMemo(() => {
    return categories.filter((category) => !category.active).length;
  }, [categories]);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">
                Administração
              </span>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Categorias
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                Organize os produtos em categorias para facilitar a navegação da
                loja.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void handleRefreshCategories();
              }}
              disabled={isLoading || isRefreshing}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw
                size={17}
                className={isRefreshing ? "animate-spin" : ""}
              />

              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-zinc-500">
                  Total de categorias
                </span>

                <strong className="mt-2 block text-3xl font-black tracking-[-0.05em]">
                  {categories.length}
                </strong>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <FolderOpen size={22} />
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-zinc-500">
                  Categorias ativas
                </span>

                <strong className="mt-2 block text-3xl font-black tracking-[-0.05em]">
                  {activeCategories}
                </strong>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={22} />
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-zinc-500">
                  Categorias inativas
                </span>

                <strong className="mt-2 block text-3xl font-black tracking-[-0.05em]">
                  {inactiveCategories}
                </strong>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
                <FolderOpen size={22} />
              </div>
            </div>
          </article>
        </section>

        <div className="grid items-start gap-6 2xl:grid-cols-[480px_minmax(0,1fr)]">
          <CategoryForm
            category={editingCategory}
            onSuccess={handleCategorySaved}
            onCancel={() => {
              setEditingCategory(null);
            }}
          />

          <section className="min-w-0 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-lg font-black tracking-[-0.03em] text-zinc-950">
                    Categorias cadastradas
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Gerencie a organização dos produtos da loja.
                  </p>
                </div>

                <div className="relative w-full lg:w-80">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                    }}
                    placeholder="Buscar categoria..."
                    className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex min-h-96 flex-col items-center justify-center gap-3 p-8">
                <LoaderCircle
                  size={30}
                  className="animate-spin text-orange-500"
                />

                <span className="text-sm font-bold text-zinc-500">
                  Carregando categorias...
                </span>
              </div>
            ) : error && categories.length === 0 ? (
              <div className="flex min-h-96 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <AlertCircle size={26} />
                </div>

                <strong className="mt-4 text-base font-black text-zinc-950">
                  Não foi possível carregar as categorias
                </strong>

                <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    void handleRefreshCategories();
                  }}
                  disabled={isRefreshing}
                  className="mt-5 flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw
                    size={17}
                    className={isRefreshing ? "animate-spin" : ""}
                  />
                  Tentar novamente
                </button>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="flex min-h-96 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
                  <FolderOpen size={27} />
                </div>

                <strong className="mt-4 text-base font-black text-zinc-950">
                  {categories.length === 0
                    ? "Nenhuma categoria cadastrada"
                    : "Nenhuma categoria encontrada"}
                </strong>

                <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                  {categories.length === 0
                    ? "Cadastre a primeira categoria utilizando o formulário."
                    : "Tente buscar por outro nome ou descrição."}
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 sm:mx-5">
                    <AlertCircle size={19} className="mt-0.5 shrink-0" />

                    <p className="text-sm font-semibold leading-5">{error}</p>
                  </div>
                )}

                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                  {filteredCategories.map((category) => (
                    <article
                      key={category._id}
                      className="flex min-w-0 flex-col rounded-3xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-200/40"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-xs font-black uppercase tracking-[0.14em] text-orange-500">
                            Posição {category.position}
                          </span>

                          <h3 className="mt-2 truncate text-lg font-black tracking-[-0.03em] text-zinc-950">
                            {category.name}
                          </h3>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${
                            category.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {category.active ? "Ativa" : "Inativa"}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-3 min-h-[72px] text-sm leading-6 text-zinc-500">
                        {category.description ||
                          "Categoria sem descrição cadastrada."}
                      </p>

                      <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
                        <button
                          type="button"
                          title="Editar categoria"
                          onClick={() => {
                            setEditingCategory(category);
                            window.scrollTo({
                              top: 0,
                              behavior: "smooth",
                            });
                          }}
                          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-black text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100"
                        >
                          <Pencil size={15} />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteCategory(category._id);
                          }}
                          disabled={deletingCategoryId === category._id}
                          title="Excluir categoria"
                          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingCategoryId === category._id ? (
                            <LoaderCircle size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                          Excluir
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

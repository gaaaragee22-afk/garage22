"use client";

import axios, { AxiosError } from "axios";
import {
  AlertCircle,
  Clock3,
  LoaderCircle,
  Package,
  Pencil,
  RefreshCcw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import ProductForm, {
  type EditableProduct,
} from "@/components/forms/ProductForm";

interface ProductCategory {
  _id: string;
  name: string;
}

interface Product extends EditableProduct {
  preparationTime?: number;
  stock?: number;
  trackStock?: boolean;
  available?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ProductsResponse {
  products?: Product[];
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getCategoryName(
  category: ProductCategory | string | null | undefined,
): string {
  if (!category) {
    return "Sem categoria";
  }

  if (typeof category === "string") {
    return "Categoria";
  }

  return category.name;
}

function getRequestErrorMessage(
  requestError: unknown,
  fallbackMessage: string,
): string {
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

export default function ProductsPage() {
  const formSectionRef = useRef<HTMLDivElement | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    axios
      .get<ProductsResponse>("/api/product/products", {
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setProducts(response.data.products ?? []);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted || axios.isCancel(requestError)) {
          return;
        }

        setProducts([]);
        setError(
          getRequestErrorMessage(
            requestError,
            "Não foi possível carregar os produtos.",
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

  async function fetchProducts(): Promise<void> {
    const response = await axios.get<ProductsResponse>(
      "/api/product/products",
      {
        params: {
          timestamp: Date.now(),
        },
      },
    );

    setProducts(response.data.products ?? []);
  }

  async function handleRefreshProducts(): Promise<void> {
    try {
      setIsRefreshing(true);
      setError("");
      setSuccess("");

      await fetchProducts();
    } catch (requestError) {
      setError(
        getRequestErrorMessage(
          requestError,
          "Não foi possível atualizar os produtos.",
        ),
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleProductSaved(): Promise<void> {
    try {
      await fetchProducts();

      setSuccess(
        selectedProduct
          ? "Produto atualizado com sucesso."
          : "Produto cadastrado com sucesso.",
      );

      setSelectedProduct(null);
    } catch (requestError) {
      setError(
        getRequestErrorMessage(
          requestError,
          "O produto foi salvo, mas a listagem não pôde ser atualizada.",
        ),
      );
    }
  }

  function handleEditProduct(product: Product): void {
    setError("");
    setSuccess("");
    setSelectedProduct(product);

    window.requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleCancelEdit(): void {
    setSelectedProduct(null);
  }

  async function handleDeleteProduct(product: Product): Promise<void> {
    const confirmed = window.confirm(
      `Deseja realmente excluir o produto "${product.name}"? Esta ação não poderá ser desfeita.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingProductId(product._id);
      setError("");
      setSuccess("");

      await axios.delete(`/api/product/products/${product._id}`);

      setProducts((currentProducts) =>
        currentProducts.filter(
          (currentProduct) => currentProduct._id !== product._id,
        ),
      );

      if (selectedProduct?._id === product._id) {
        setSelectedProduct(null);
      }

      setSuccess("Produto excluído com sucesso.");
    } catch (requestError) {
      setError(
        getRequestErrorMessage(
          requestError,
          "Não foi possível excluir o produto.",
        ),
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) => {
      const categoryName = getCategoryName(product.categoryId);

      return (
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.description.toLowerCase().includes(normalizedSearch) ||
        categoryName.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [products, search]);

  const activeProducts = useMemo(
    () => products.filter((product) => product.active).length,
    [products],
  );

  const availableProducts = useMemo(
    () => products.filter((product) => product.available !== false).length,
    [products],
  );

  const featuredProducts = useMemo(
    () => products.filter((product) => product.featured).length,
    [products],
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-5 text-zinc-950 sm:px-5 sm:py-7 lg:px-8 xl:px-10">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">
                Administração
              </span>

              <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Produtos
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                Cadastre, edite, organize e exclua os produtos da sua loja.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleRefreshProducts()}
              disabled={isLoading || isRefreshing}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <RefreshCcw
                size={17}
                className={isRefreshing ? "animate-spin" : ""}
              />

              {isRefreshing ? "Atualizando..." : "Atualizar lista"}
            </button>
          </div>
        </header>

        {(error || success) && (
          <div className="mb-6 space-y-3">
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <p className="text-sm font-semibold leading-5">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                <p className="text-sm font-bold">{success}</p>

                <button
                  type="button"
                  onClick={() => setSuccess("")}
                  aria-label="Fechar mensagem"
                  className="shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {[
            ["Total", products.length, "orange"],
            ["Ativos", activeProducts, "emerald"],
            ["Disponíveis", availableProducts, "blue"],
            ["Destaques", featuredProducts, "amber"],
          ].map(([label, value, tone]) => (
            <article
              key={String(label)}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5"
            >
              <span className="text-xs font-bold text-zinc-500 sm:text-sm">
                {label}
              </span>

              <div className="mt-3 flex items-center justify-between gap-3">
                <strong className="text-2xl font-black sm:text-3xl">
                  {value}
                </strong>

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${
                    tone === "emerald"
                      ? "bg-emerald-50 text-emerald-600"
                      : tone === "blue"
                        ? "bg-blue-50 text-blue-600"
                        : tone === "amber"
                          ? "bg-amber-50 text-amber-500"
                          : "bg-orange-50 text-orange-500"
                  }`}
                >
                  {tone === "amber" ? (
                    <Star size={20} />
                  ) : (
                    <Package size={20} />
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>

        <div className="grid items-start gap-6 2xl:grid-cols-[520px_minmax(0,1fr)]">
          <div ref={formSectionRef} className="scroll-mt-5">
            <ProductForm
              key={selectedProduct?._id ?? "new-product"}
              product={selectedProduct}
              onSuccess={handleProductSaved}
              onCancel={selectedProduct ? handleCancelEdit : undefined}
            />
          </div>

          <section className="min-w-0 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-4 sm:p-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-lg font-black tracking-[-0.03em]">
                    Produtos cadastrados
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    {filteredProducts.length} produto(s) encontrado(s).
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
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar produto ou categoria..."
                    className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm font-medium outline-none transition placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-8">
                <LoaderCircle
                  size={30}
                  className="animate-spin text-orange-500"
                />
                <span className="text-sm font-bold text-zinc-500">
                  Carregando produtos...
                </span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
                  <Package size={27} />
                </div>

                <strong className="mt-4 text-base font-black">
                  {products.length === 0
                    ? "Nenhum produto cadastrado"
                    : "Nenhum produto encontrado"}
                </strong>

                <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                  {products.length === 0
                    ? "Cadastre o primeiro produto usando o formulário."
                    : "Tente buscar por outro nome, descrição ou categoria."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                {filteredProducts.map((product) => {
                  const categoryName = getCategoryName(product.categoryId);
                  const finalPrice = product.promotionalPrice ?? product.price;
                  const isDeleting = deletingProductId === product._id;

                  return (
                    <article
                      key={product._id}
                      className="flex min-w-0 flex-col rounded-3xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-lg sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-black uppercase tracking-[0.14em] text-orange-500">
                            {categoryName}
                          </span>

                          <h3 className="mt-2 break-words text-lg font-black tracking-[-0.03em]">
                            {product.name}
                          </h3>
                        </div>

                        {product.featured && (
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-500"
                            title="Produto em destaque"
                          >
                            <Star size={19} fill="currentColor" />
                          </div>
                        )}
                      </div>

                      <p className="mt-3 line-clamp-3 min-h-[72px] text-sm leading-6 text-zinc-500">
                        {product.description ||
                          "Produto sem descrição cadastrada."}
                      </p>

                      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                        <div>
                          {product.promotionalPrice !== null ? (
                            <>
                              <span className="block text-xs font-bold text-zinc-400 line-through">
                                {formatCurrency(product.price)}
                              </span>

                              <strong className="mt-0.5 block text-xl font-black text-orange-500">
                                {formatCurrency(finalPrice)}
                              </strong>
                            </>
                          ) : (
                            <strong className="block text-xl font-black">
                              {formatCurrency(product.price)}
                            </strong>
                          )}
                        </div>

                        {typeof product.preparationTime === "number" && (
                          <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-600">
                            <Clock3 size={16} />
                            {product.preparationTime} min
                          </div>
                        )}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            product.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {product.active ? "Ativo" : "Inativo"}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            product.available !== false
                              ? "bg-blue-50 text-blue-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {product.available !== false
                            ? "Disponível"
                            : "Indisponível"}
                        </span>

                        {product.trackStock && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                              (product.stock ?? 0) > 0
                                ? "bg-zinc-100 text-zinc-600"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            Estoque: {product.stock ?? 0}
                          </span>
                        )}
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditProduct(product)}
                          disabled={isDeleting}
                          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
                        >
                          <Pencil size={17} />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDeleteProduct(product)}
                          disabled={isDeleting}
                          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <LoaderCircle size={17} className="animate-spin" />
                          ) : (
                            <Trash2 size={17} />
                          )}

                          {isDeleting ? "Excluindo..." : "Excluir"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

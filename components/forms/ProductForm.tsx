"use client";

import axios from "axios";
import { ImagePlus, LoaderCircle, PackagePlus, Pencil, X } from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface Category {
  _id: string;
  name: string;
  description?: string;
  position?: number;
  active?: boolean;
}

interface ProductCategory {
  _id: string;
  name: string;
}

interface ProductImage {
  url?: string;
}

export interface EditableProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  promotionalPrice: number | null;
  categoryId: ProductCategory | string | null;
  position?: number;
  active: boolean;
  featured: boolean;
  image?: ProductImage | string | null;
}

interface CategoriesResponse {
  categories?: Category[];
}

interface ProductResponse {
  success?: boolean;
  message?: string;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

interface ProductFormProps {
  product?: EditableProduct | null;
  onSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  promotionalPrice: string;
  categoryId: string;
  position: string;
  active: boolean;
  featured: boolean;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function numberToCurrencyInput(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  return value.toFixed(2).replace(".", ",");
}

function getProductCategoryId(
  category: ProductCategory | string | null | undefined,
): string {
  if (!category) {
    return "";
  }

  return typeof category === "string" ? category : category._id;
}

function getProductImageUrl(
  image: ProductImage | string | null | undefined,
): string {
  if (!image) {
    return "";
  }

  return typeof image === "string" ? image : (image.url ?? "");
}

function createInitialFormData(
  product?: EditableProduct | null,
): ProductFormData {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: numberToCurrencyInput(product?.price),
    promotionalPrice: numberToCurrencyInput(product?.promotionalPrice),
    categoryId: getProductCategoryId(product?.categoryId),
    position: String(product?.position ?? 0),
    active: product?.active ?? true,
    featured: product?.featured ?? false,
  };
}

function normalizeCurrencyInput(value: string): string {
  const sanitizedValue = value.replace(/[^\d,]/g, "");
  const [integerPart, ...decimalParts] = sanitizedValue.split(",");

  if (decimalParts.length === 0) {
    return integerPart;
  }

  return `${integerPart},${decimalParts.join("").slice(0, 2)}`;
}

function currencyToNumber(value: string): number {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallbackMessage;
  }

  return (
    error.response?.data?.error ||
    error.response?.data?.message ||
    fallbackMessage
  );
}

export default function ProductForm({
  product,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<ProductFormData>(() =>
    createInitialFormData(product),
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localImagePreview, setLocalImagePreview] = useState("");

  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isEditing = Boolean(product?._id);
  const existingImageUrl = getProductImageUrl(product?.image);
  const imagePreview = localImagePreview || existingImageUrl;
  const hasCategories = categories.length > 0;

  const selectedCategory = useMemo(
    () => categories.find((category) => category._id === formData.categoryId),
    [categories, formData.categoryId],
  );

  useEffect(() => {
    const controller = new AbortController();

    axios
      .get<Category[] | CategoriesResponse>("/api/product/categories", {
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        const responseCategories = Array.isArray(response.data)
          ? response.data
          : (response.data.categories ?? []);

        const activeCategories = responseCategories
          .filter((category) => category.active !== false)
          .sort((firstCategory, secondCategory) => {
            const positionDifference =
              (firstCategory.position ?? 0) - (secondCategory.position ?? 0);

            return (
              positionDifference ||
              firstCategory.name.localeCompare(secondCategory.name, "pt-BR")
            );
          });

        setCategories(activeCategories);

        if (activeCategories[0]) {
          setFormData((currentFormData) => ({
            ...currentFormData,
            categoryId: currentFormData.categoryId || activeCategories[0]._id,
          }));
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }

        setErrorMessage("Não foi possível carregar as categorias.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingCategories(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (localImagePreview) {
        URL.revokeObjectURL(localImagePreview);
      }
    };
  }, [localImagePreview]);

  function updateField<Key extends keyof ProductFormData>(
    field: Key,
    value: ProductFormData[Key],
  ): void {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));
  }

  function clearMessages(): void {
    setSuccessMessage("");
    setErrorMessage("");
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>): void {
    const selectedFile = event.target.files?.[0];

    clearMessages();

    if (!selectedFile) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(selectedFile.type)) {
      event.target.value = "";
      setErrorMessage(
        "Formato inválido. Selecione uma imagem JPG, PNG ou WebP.",
      );
      return;
    }

    if (selectedFile.size <= 0 || selectedFile.size > MAX_IMAGE_SIZE) {
      event.target.value = "";
      setErrorMessage("A imagem deve possuir no máximo 5 MB.");
      return;
    }

    if (localImagePreview) {
      URL.revokeObjectURL(localImagePreview);
    }

    setImageFile(selectedFile);
    setLocalImagePreview(URL.createObjectURL(selectedFile));
  }

  function removeSelectedImage(): void {
    if (localImagePreview) {
      URL.revokeObjectURL(localImagePreview);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setImageFile(null);
    setLocalImagePreview("");
  }

  function validateForm(): string | null {
    const name = formData.name.trim();
    const description = formData.description.trim();
    const price = currencyToNumber(formData.price);
    const position = Number(formData.position);

    if (name.length < 2 || name.length > 120) {
      return "O nome deve possuir entre 2 e 120 caracteres.";
    }

    if (description.length < 10 || description.length > 2000) {
      return "A descrição deve possuir entre 10 e 2.000 caracteres.";
    }

    if (!Number.isFinite(price) || price <= 0) {
      return "Informe um preço válido.";
    }

    if (formData.promotionalPrice.trim()) {
      const promotionalPrice = currencyToNumber(formData.promotionalPrice);

      if (
        !Number.isFinite(promotionalPrice) ||
        promotionalPrice <= 0 ||
        promotionalPrice >= price
      ) {
        return "O preço promocional deve ser válido e menor que o preço normal.";
      }
    }

    if (!formData.categoryId) {
      return "Selecione uma categoria.";
    }

    if (!Number.isInteger(position) || position < 0) {
      return "A posição deve ser um número inteiro igual ou maior que zero.";
    }

    if (!isEditing && !imageFile) {
      return "Selecione uma imagem para o produto.";
    }

    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    clearMessages();

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData = new FormData();

      requestData.append("name", formData.name.trim());
      requestData.append("description", formData.description.trim());
      requestData.append("price", formData.price);
      requestData.append("promotionalPrice", formData.promotionalPrice);
      requestData.append("categoryId", formData.categoryId);
      requestData.append("position", formData.position);
      requestData.append("active", String(formData.active));
      requestData.append("featured", String(formData.featured));

      if (imageFile) {
        requestData.append("image", imageFile);
      }

      const response = isEditing
        ? await axios.put<ProductResponse>(
            `/api/product/products/${product?._id}`,
            requestData,
          )
        : await axios.post<ProductResponse>(
            "/api/product/products",
            requestData,
          );

      setSuccessMessage(
        response.data.message ||
          (isEditing
            ? "Produto atualizado com sucesso."
            : "Produto cadastrado com sucesso."),
      );

      await onSuccess?.();
    } catch (error: unknown) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          isEditing
            ? "Não foi possível atualizar o produto."
            : "Não foi possível cadastrar o produto.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 lg:p-7"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black sm:text-2xl">
            {isEditing ? "Editar produto" : "Cadastrar produto"}
          </h2>

          <p className="mt-1 text-sm font-medium text-zinc-500">
            {isEditing
              ? "Altere os dados desejados e salve as mudanças."
              : "Preencha os dados e selecione uma imagem."}
          </p>
        </div>

        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Cancelar edição"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-[#fdf4c3] hover:text-[#7f3c19]"
          >
            <X size={18} />
          </button>
        )}
      </header>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <section>
          <span className="mb-2 block text-sm font-black text-zinc-800">
            Imagem do produto
          </span>

          {imagePreview ? (
            <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 lg:max-w-none">
              <Image
                src={imagePreview}
                alt={`Imagem de ${formData.name || "produto"}`}
                fill
                unoptimized={Boolean(localImagePreview)}
                sizes="(max-width: 1024px) 320px, 220px"
                className="object-cover"
              />

              {localImagePreview && (
                <button
                  type="button"
                  onClick={removeSelectedImage}
                  disabled={isSubmitting}
                  aria-label="Cancelar nova imagem"
                  className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-800 shadow-md transition hover:bg-red-50 hover:text-red-600"
                >
                  <X size={19} />
                </button>
              )}

              <label className="absolute inset-x-3 bottom-3 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white/95 px-3 text-xs font-black text-[#7f3c19] shadow-md backdrop-blur transition hover:bg-[#fdf4c3]">
                <ImagePlus size={16} />
                Trocar imagem
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  disabled={isSubmitting}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <label className="mx-auto flex aspect-square w-full max-w-xs cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 text-center transition hover:border-[#7f3c19] hover:bg-[#fdf4c3]/60 lg:max-w-none">
              <ImagePlus size={34} className="text-[#7f3c19]" />

              <strong className="mt-4 text-sm font-black text-zinc-800">
                Selecionar imagem
              </strong>

              <span className="mt-1 text-xs text-zinc-500">
                JPG, PNG ou WebP de até 5 MB
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={isSubmitting}
                className="hidden"
              />
            </label>
          )}
        </section>

        <section className="grid min-w-0 gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-black">Nome</span>
            <input
              type="text"
              value={formData.name}
              onChange={(event) => updateField("name", event.target.value)}
              maxLength={120}
              disabled={isSubmitting}
              className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm font-semibold outline-none focus:border-[#7f3c19] focus:ring-4 focus:ring-[#fdf4c3]"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-black">Descrição</span>
            <textarea
              value={formData.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              maxLength={2000}
              rows={5}
              disabled={isSubmitting}
              className="w-full resize-none rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#7f3c19] focus:ring-4 focus:ring-[#fdf4c3]"
            />
          </label>

          <CurrencyField
            label="Preço"
            value={formData.price}
            onChange={(value) => updateField("price", value)}
            disabled={isSubmitting}
          />

          <CurrencyField
            label="Preço promocional"
            value={formData.promotionalPrice}
            onChange={(value) => updateField("promotionalPrice", value)}
            disabled={isSubmitting}
            placeholder="Opcional"
          />

          <label>
            <span className="mb-2 block text-sm font-black">Categoria</span>

            <select
              value={formData.categoryId}
              onChange={(event) =>
                updateField("categoryId", event.target.value)
              }
              disabled={isSubmitting || isLoadingCategories || !hasCategories}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#7f3c19] focus:ring-4 focus:ring-[#fdf4c3]"
            >
              {isLoadingCategories && (
                <option value="">Carregando categorias...</option>
              )}

              {!isLoadingCategories && !hasCategories && (
                <option value="">Nenhuma categoria disponível</option>
              )}

              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>

            {selectedCategory?.description && (
              <span className="mt-2 block text-xs text-zinc-500">
                {selectedCategory.description}
              </span>
            )}
          </label>

          <label>
            <span className="mb-2 block text-sm font-black">Posição</span>

            <input
              type="number"
              min={0}
              step={1}
              value={formData.position}
              onChange={(event) => updateField("position", event.target.value)}
              disabled={isSubmitting}
              className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm font-semibold outline-none focus:border-[#7f3c19] focus:ring-4 focus:ring-[#fdf4c3]"
            />
          </label>
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <ToggleField
          title="Produto ativo"
          description="Disponível para exibição e compra"
          checked={formData.active}
          onChange={(checked) => updateField("active", checked)}
          disabled={isSubmitting}
        />

        <ToggleField
          title="Produto em destaque"
          description="Exibir nas áreas de destaque"
          checked={formData.featured}
          onChange={(checked) => updateField("featured", checked)}
          disabled={isSubmitting}
        />
      </section>

      <footer className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:justify-end">
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-12 rounded-2xl border border-zinc-200 px-6 text-sm font-black text-zinc-700 transition hover:border-[#7f5417]/30 hover:bg-[#fdf4c3] hover:text-[#7f3c19]"
          >
            Cancelar edição
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isLoadingCategories || !hasCategories}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-6 text-sm font-black text-white shadow-lg shadow-[#7f3c19]/20 transition hover:bg-[#58141e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle size={18} className="animate-spin" />
              {isEditing ? "Salvando..." : "Cadastrando..."}
            </>
          ) : (
            <>
              {isEditing ? <Pencil size={18} /> : <PackagePlus size={18} />}
              {isEditing ? "Salvar alterações" : "Cadastrar produto"}
            </>
          )}
        </button>
      </footer>
    </form>
  );
}

interface CurrencyFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
}

function CurrencyField({
  label,
  value,
  onChange,
  disabled,
  placeholder = "0,00",
}: CurrencyFieldProps) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black">{label}</span>

      <div className="flex h-12 overflow-hidden rounded-2xl border border-zinc-200 focus-within:border-[#7f3c19] focus-within:ring-4 focus-within:ring-[#fdf4c3]">
        <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-4 text-sm font-black text-[#7f5417]">
          R$
        </span>

        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) =>
            onChange(normalizeCurrencyInput(event.target.value))
          }
          disabled={disabled}
          placeholder={placeholder}
          className="min-w-0 flex-1 px-4 text-sm font-semibold outline-none"
        />
      </div>
    </label>
  );
}

interface ToggleFieldProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}

function ToggleField({
  title,
  description,
  checked,
  onChange,
  disabled,
}: ToggleFieldProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-zinc-200 px-4 py-4 transition hover:border-[#7f5417]/25 hover:bg-[#fdf4c3]/40">
      <div>
        <strong className="block text-sm font-black">{title}</strong>
        <span className="text-xs text-zinc-500">{description}</span>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="h-5 w-5 shrink-0 accent-[#7f3c19]"
      />
    </label>
  );
}

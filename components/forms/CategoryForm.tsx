"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { AlertCircle, CheckCircle2, LoaderCircle, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve possuir pelo menos 2 caracteres.")
    .max(100, "O nome deve possuir no máximo 100 caracteres."),

  description: z
    .string()
    .trim()
    .max(500, "A descrição deve possuir no máximo 500 caracteres."),

  position: z
    .number({
      error: "Informe uma posição válida.",
    })
    .int("A posição deve ser um número inteiro.")
    .min(0, "A posição não pode ser negativa."),

  active: z.boolean(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export interface EditableCategory {
  _id: string;
  name: string;
  description: string;
  position: number;
  active: boolean;
}

interface CategoryApiResponse {
  success: boolean;
  message: string;
  category: EditableCategory;
}

interface CategoryApiError {
  success?: boolean;
  message?: string;
  error?: string;
  field?: keyof CategoryFormData;
  productsCount?: number;
}

interface CategoryFormProps {
  category?: EditableCategory | null;
  onSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
}

function getDefaultValues(
  category?: EditableCategory | null,
): CategoryFormData {
  return {
    name: category?.name ?? "",
    description: category?.description ?? "",
    position: category?.position ?? 0,
    active: category?.active ?? true,
  };
}

export default function CategoryForm({
  category = null,
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const isEditing = Boolean(category?._id);

  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const formValues = useMemo(
    () => getDefaultValues(category),
    [
      category?._id,
      category?.name,
      category?.description,
      category?.position,
      category?.active,
    ],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: getDefaultValues(null),
    values: formValues,
  });

  const onSubmit: SubmitHandler<CategoryFormData> = async (data) => {
    setApiError("");
    setSuccessMessage("");

    const payload: CategoryFormData = {
      name: data.name.trim(),
      description: data.description.trim(),
      position: Number(data.position),
      active: data.active,
    };

    try {
      const response = isEditing
        ? await axios.put<CategoryApiResponse>(
            `/api/product/categories/${category?._id}`,
            payload,
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          )
        : await axios.post<CategoryApiResponse>(
            "/api/product/categories",
            payload,
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

      setSuccessMessage(
        response.data.message ||
          (isEditing
            ? "Categoria atualizada com sucesso."
            : "Categoria cadastrada com sucesso."),
      );

      if (!isEditing) {
        reset(getDefaultValues(null));
      }

      await onSuccess?.();
    } catch (requestError: unknown) {
      if (axios.isAxiosError<CategoryApiError>(requestError)) {
        const axiosError = requestError as AxiosError<CategoryApiError>;
        const responseData = axiosError.response?.data;

        const message =
          responseData?.message ||
          responseData?.error ||
          (isEditing
            ? "Não foi possível atualizar a categoria."
            : "Não foi possível cadastrar a categoria.");

        if (responseData?.field) {
          setError(responseData.field, {
            type: "server",
            message,
          });

          return;
        }

        setApiError(message);
        return;
      }

      setApiError(
        requestError instanceof Error
          ? requestError.message
          : "Ocorreu um erro inesperado ao salvar a categoria.",
      );
    }
  };

  function handleCancel() {
    reset(getDefaultValues(null));
    setApiError("");
    setSuccessMessage("");
    onCancel?.();
  }

  return (
    <section className="w-full overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-100 p-5 sm:p-6">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-[#7f3c19]">
          {isEditing ? "Edição" : "Cadastro"}
        </span>

        <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-zinc-950">
          {isEditing ? "Editar categoria" : "Nova categoria"}
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {isEditing
            ? "A categoria só poderá ser atualizada quando não possuir produtos vinculados."
            : "Crie categorias para organizar os produtos do catálogo."}
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5 p-5 sm:p-6"
      >
        {apiError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />

            <div>
              <strong className="block text-sm font-black">
                Não foi possível salvar
              </strong>

              <p className="mt-1 text-sm font-medium leading-5">{apiError}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700"
          >
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />

            <div>
              <strong className="block text-sm font-black">
                Categoria salva
              </strong>

              <p className="mt-1 text-sm font-medium leading-5">
                {successMessage}
              </p>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="category-name"
            className="mb-2 block text-sm font-black text-zinc-800"
          >
            Nome da categoria
            <span className="ml-1 text-red-500">*</span>
          </label>

          <input
            id="category-name"
            type="text"
            autoComplete="off"
            placeholder="Ex.: Hambúrgueres"
            disabled={isSubmitting}
            {...register("name")}
            className={`h-12 w-full rounded-2xl border bg-zinc-50 px-4 text-sm font-semibold text-zinc-950 outline-none transition placeholder:font-medium placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 ${
              errors.name
                ? "border-red-400 ring-4 ring-red-100"
                : "border-zinc-200 focus:border-[#7f3c19] focus:bg-white focus:ring-4 focus:ring-[#fdf4c3]"
            }`}
          />

          {errors.name?.message && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-red-600">
              <AlertCircle size={16} />
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="category-description"
            className="mb-2 block text-sm font-black text-zinc-800"
          >
            Descrição
          </label>

          <textarea
            id="category-description"
            rows={5}
            placeholder="Descreva brevemente esta categoria."
            disabled={isSubmitting}
            {...register("description")}
            className={`w-full resize-none rounded-2xl border bg-zinc-50 px-4 py-3 text-sm font-medium leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 ${
              errors.description
                ? "border-red-400 ring-4 ring-red-100"
                : "border-zinc-200 focus:border-[#7f3c19] focus:bg-white focus:ring-4 focus:ring-[#fdf4c3]"
            }`}
          />

          <div className="mt-2 flex items-start justify-between gap-3">
            {errors.description?.message ? (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
                <AlertCircle size={16} />
                {errors.description.message}
              </p>
            ) : (
              <span />
            )}

            <span className="shrink-0 text-xs font-semibold text-zinc-400">
              Máximo de 500 caracteres
            </span>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="category-position"
              className="mb-2 block text-sm font-black text-zinc-800"
            >
              Posição
            </label>

            <input
              id="category-position"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              disabled={isSubmitting}
              {...register("position", {
                setValueAs: (value: string) => {
                  if (value === "") {
                    return 0;
                  }

                  const parsedValue = Number(value);

                  return Number.isFinite(parsedValue) ? parsedValue : 0;
                },
              })}
              className={`h-12 w-full rounded-2xl border bg-zinc-50 px-4 text-sm font-semibold text-zinc-950 outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
                errors.position
                  ? "border-red-400 ring-4 ring-red-100"
                  : "border-zinc-200 focus:border-[#7f3c19] focus:bg-white focus:ring-4 focus:ring-[#fdf4c3]"
              }`}
            />

            {errors.position?.message && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-red-600">
                <AlertCircle size={16} />
                {errors.position.message}
              </p>
            )}

            <p className="mt-2 text-xs font-medium leading-5 text-zinc-500">
              Números menores aparecem primeiro.
            </p>
          </div>

          <div>
            <span className="mb-2 block text-sm font-black text-zinc-800">
              Status
            </span>

            <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:border-[#7f5417]/30">
              <div>
                <span className="block text-sm font-black text-zinc-800">
                  Categoria ativa
                </span>

                <span className="mt-1 block text-xs font-medium text-zinc-500">
                  Exibir no catálogo
                </span>
              </div>

              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  disabled={isSubmitting}
                  {...register("active")}
                  className="peer sr-only"
                />

                <div className="h-6 w-11 rounded-full bg-zinc-300 transition peer-checked:bg-[#7f3c19] peer-disabled:cursor-not-allowed peer-disabled:opacity-60" />

                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
          {isEditing && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-black text-zinc-700 transition hover:border-[#7f5417]/30 hover:bg-[#fdf4c3]/60 hover:text-[#7f3c19] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X size={17} />
              Cancelar edição
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-6 text-sm font-black text-white transition hover:bg-[#58141e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                {isEditing ? "Atualizando..." : "Salvando..."}
              </>
            ) : (
              <>
                <Save size={18} />
                {isEditing ? "Atualizar categoria" : "Salvar categoria"}
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

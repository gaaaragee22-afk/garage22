"use client";

import { ArrowLeft, ArrowRight, MapPinned } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";

import type { AddressData } from "@/types/checkout";

interface AddressStepProps {
  address: AddressData;

  onAddressChange: (address: AddressData) => void;

  onContinue: () => void;
  onBack: () => void;
}

interface AddressErrors {
  street?: string;
  neighborhood?: string;
  number?: string;
  reference?: string;
}

export default function AddressStep({
  address,
  onAddressChange,
  onContinue,
  onBack,
}: AddressStepProps) {
  const [errors, setErrors] = useState<AddressErrors>({});

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    onAddressChange({
      ...address,
      [name]: value,
    });

    if (errors[name as keyof AddressErrors]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: undefined,
      }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors: AddressErrors = {};

    if (!address.street.trim()) {
      validationErrors.street = "Informe o nome da rua.";
    }

    if (!address.neighborhood.trim()) {
      validationErrors.neighborhood = "Informe o bairro.";
    }

    if (!address.number.trim()) {
      validationErrors.number = "Informe o número.";
    }

    if (!address.reference.trim()) {
      validationErrors.reference = "Informe um ponto de referência.";
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    onContinue();
  }

  console.log(address);

  const inputClass =
    "h-14 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7f3c19] focus:ring-4 focus:ring-[#fdf4c3]";

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
          <MapPinned size={26} />
        </div>

        <h2 className="text-2xl font-bold text-zinc-900">
          Complete o endereço
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Confira os dados encontrados e informe os detalhes necessários para a
          entrega.
        </p>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="cep"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              CEP
            </label>

            <input
              id="cep"
              value={address.cep}
              disabled
              className="h-14 w-full cursor-not-allowed rounded-2xl border border-zinc-200 bg-zinc-100 px-4 text-zinc-500"
            />
          </div>

          <div>
            <label
              htmlFor="city"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Cidade
            </label>

            <input
              id="city"
              value={`${address.city}-${address.state}`}
              disabled
              className="h-14 w-full cursor-not-allowed rounded-2xl border border-zinc-200 bg-zinc-100 px-4 text-zinc-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="street"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Rua
            </label>

            <input
              id="street"
              name="street"
              value={address.street}
              onChange={handleChange}
              placeholder="Digite o nome da rua"
              className={inputClass}
            />

            {errors.street && (
              <p className="mt-2 text-sm font-medium text-red-600">
                {errors.street}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="neighborhood"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Bairro
            </label>

            <input
              id="neighborhood"
              name="neighborhood"
              value={address.neighborhood}
              onChange={handleChange}
              placeholder="Digite o bairro"
              className={inputClass}
            />

            {errors.neighborhood && (
              <p className="mt-2 text-sm font-medium text-red-600">
                {errors.neighborhood}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="number"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Número
            </label>

            <input
              id="number"
              name="number"
              value={address.number}
              onChange={handleChange}
              placeholder="Ex.: 125 ou S/N"
              className={inputClass}
            />

            {errors.number && (
              <p className="mt-2 text-sm font-medium text-red-600">
                {errors.number}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="complement"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Complemento
              <span className="ml-1 font-normal text-zinc-400">(opcional)</span>
            </label>

            <input
              id="complement"
              name="complement"
              value={address.complement}
              onChange={handleChange}
              placeholder="Apartamento, bloco, casa..."
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="reference"
              className="mb-2 block text-sm font-semibold text-zinc-800"
            >
              Ponto de referência
            </label>

            <input
              id="reference"
              name="reference"
              value={address.reference}
              onChange={handleChange}
              placeholder="Ex.: próximo à praça principal"
              className={inputClass}
            />

            {errors.reference && (
              <p className="mt-2 text-sm font-medium text-red-600">
                {errors.reference}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-5 font-semibold text-zinc-700 transition hover:border-[#7f5417]/40 hover:bg-[#fdf4c3] hover:text-[#7f3c19]"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-6 font-semibold text-white transition hover:bg-[#58141e]"
          >
            Revisar pedido
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </form>
  );
}

"use client";

import { ArrowLeft, LoaderCircle, MapPin, Search } from "lucide-react";
import { FormEvent, useState } from "react";

import type { AddressData, ViaCepResponse } from "@/types/checkout";

import { validateDeliveryCity } from "@/utils/delivery";

import { formatCep, isValidCep, onlyNumbers } from "@/utils/format";

interface CepStepProps {
  cep: string;

  onCepChange: (cep: string) => void;

  onAddressFound: (address: Partial<AddressData>) => void;

  onContinue: () => void;
  onBack: () => void;
}

export default function CepStep({
  cep,
  onCepChange,
  onAddressFound,
  onContinue,
  onBack,
}: CepStepProps) {
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidCep(cep)) {
      setError("Informe um CEP válido com 8 números.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const normalizedCep = onlyNumbers(cep);

      const response = await fetch(
        `https://viacep.com.br/ws/${normalizedCep}/json/`,
      );

      if (!response.ok) {
        throw new Error("Não foi possível consultar o CEP.");
      }

      const data = (await response.json()) as ViaCepResponse;

      if (data.erro) {
        setError("CEP não encontrado.");
        return;
      }

      const deliveryLocation = validateDeliveryCity(data);

      if (!deliveryLocation) {
        setError(
          "Ainda não entregamos nessa cidade. Atendemos somente Cuité-PB, Nova Floresta-PB e Jaçanã-RN.",
        );
        return;
      }

      onAddressFound({
        cep: formatCep(data.cep),
        street: data.logradouro ?? "",
        neighborhood: data.bairro ?? "",
        city: deliveryLocation.city,
        state: deliveryLocation.state,
      });

      onContinue();
    } catch (error) {
      console.error(error);

      setError(
        "Não foi possível consultar o CEP. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
          <MapPin size={26} />
        </div>

        <h2 className="text-2xl font-bold text-zinc-900">Informe o seu CEP</h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Vamos verificar se o endereço está dentro da nossa área de entrega.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#7f5417]/15 bg-[#fdf4c3]/65 p-4">
            <p className="font-semibold text-[#58141e]">Cuité-PB</p>

            <p className="mt-1 text-sm font-medium text-[#7f5417]">
              Entrega: R$ 2,00
            </p>
          </div>

          <div className="rounded-2xl border border-[#7f5417]/15 bg-[#fdf4c3]/65 p-4">
            <p className="font-semibold text-[#58141e]">Nova Floresta-PB</p>

            <p className="mt-1 text-sm font-medium text-[#7f5417]">
              Entrega: R$ 10,00
            </p>
          </div>

          <div className="rounded-2xl border border-[#7f5417]/15 bg-[#fdf4c3]/65 p-4">
            <p className="font-semibold text-[#58141e]">Jaçanã-RN</p>

            <p className="mt-1 text-sm font-medium text-[#7f5417]">
              Entrega: R$ 20,00
            </p>
          </div>
        </div>

        <div className="mt-7">
          <label
            htmlFor="cep"
            className="mb-2 block text-sm font-semibold text-zinc-800"
          >
            CEP
          </label>

          <div className="relative">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <input
              id="cep"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              value={cep}
              onChange={(event) => {
                onCepChange(formatCep(event.target.value));

                if (error) {
                  setError("");
                }
              }}
              className={`h-14 w-full rounded-2xl border bg-zinc-50 pl-12 pr-4 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 ${
                error
                  ? "border-red-500 focus:ring-4 focus:ring-red-100"
                  : "border-zinc-200 focus:border-[#7f3c19] focus:ring-4 focus:ring-[#fdf4c3]"
              }`}
            />
          </div>

          {error && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium leading-5 text-red-700">
              {error}
            </p>
          )}
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
            disabled={isLoading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-6 font-semibold text-white transition hover:bg-[#58141e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                Consultando
              </>
            ) : (
              <>
                Consultar CEP
                <Search size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

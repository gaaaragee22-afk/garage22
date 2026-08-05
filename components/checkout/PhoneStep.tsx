"use client";

import { ArrowLeft, ArrowRight, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { formatPhone, isValidPhone } from "@/utils/format";

interface PhoneStepProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  onContinue: () => void;
}

export default function PhoneStep({
  phone,
  onPhoneChange,
  onContinue,
}: PhoneStepProps) {
  const router = useRouter();

  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidPhone(phone)) {
      setError("Informe um número de celular válido com DDD.");
      return;
    }

    setError("");
    onContinue();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
          <Phone size={26} />
        </div>

        <h2 className="text-2xl font-bold text-zinc-900">
          Qual é o seu celular?
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Utilizaremos esse número para identificar e acompanhar o seu pedido.
        </p>

        <div className="mt-7">
          <label
            htmlFor="phone"
            className="mb-2 block text-sm font-semibold text-zinc-800"
          >
            Número de celular
          </label>

          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="(83) 99999-9999"
            value={phone}
            onChange={(event) => {
              onPhoneChange(formatPhone(event.target.value));

              if (error) {
                setError("");
              }
            }}
            className={`h-14 w-full rounded-2xl border bg-zinc-50 px-4 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 ${
              error
                ? "border-red-500 focus:ring-4 focus:ring-red-100"
                : "border-zinc-200 focus:border-[#7f3c19] focus:ring-4 focus:ring-[#fdf4c3]"
            }`}
          />

          {error && (
            <p className="mt-2 text-sm font-medium text-red-600">{error}</p>
          )}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-5 font-semibold text-zinc-700 transition hover:border-[#7f5417]/40 hover:bg-[#fdf4c3] hover:text-[#7f3c19]"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-6 font-semibold text-white transition hover:bg-[#58141e]"
          >
            Continuar
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </form>
  );
}

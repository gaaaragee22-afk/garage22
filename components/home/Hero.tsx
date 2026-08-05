"use client";

import {
  Bike,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  MapPin,
  Star,
} from "lucide-react";
import Image from "next/image";

import { useStoreStatus } from "@/context/StoreStatusContext";

export default function Hero() {
  const { store, isOpen, isLoading } = useStoreStatus();

  const statusMessage =
    store?.closedMessage ||
    "No momento, nossa loja está fechada para novos pedidos.";

  return (
    <section id="inicio" className="px-3 pt-3 sm:px-6 sm:pt-5 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative min-h-[520px] overflow-hidden rounded-[24px] bg-zinc-950 sm:min-h-[540px] sm:rounded-[32px] lg:min-h-[560px] lg:rounded-[36px]">
          <Image
            src="https://images.unsplash.com/photo-1512152272829-e3139592d56f?auto=format&fit=crop&w=1800&q=90"
            alt="Hambúrguer artesanal com batatas fritas"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-55"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/20" />

          <div className="relative z-10 flex min-h-[520px] flex-col justify-end px-5 pb-16 pt-8 sm:min-h-[540px] sm:px-10 sm:pb-20 lg:min-h-[560px] lg:max-w-3xl lg:justify-center lg:px-16 lg:py-16">
            <div className="mb-4 flex w-fit max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-md sm:mb-5 sm:px-4 sm:text-sm">
              <Star
                size={15}
                className="shrink-0 fill-[#fdf4c3] text-[#fdf4c3]"
              />

              <span className="truncate">
                Avaliação 4,9 • Mais de 1.200 pedidos
              </span>
            </div>

            <div
              className={`mb-4 flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-black backdrop-blur-md ${
                isLoading
                  ? "border-white/20 bg-white/10 text-white"
                  : isOpen
                    ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                    : "border-red-400/40 bg-red-500/20 text-red-100"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isLoading
                    ? "animate-pulse bg-zinc-300"
                    : isOpen
                      ? "animate-pulse bg-emerald-400"
                      : "bg-red-400"
                }`}
              />

              {isLoading
                ? "Verificando funcionamento"
                : isOpen
                  ? "Loja aberta"
                  : "Loja fechada"}
            </div>

            <h1 className="max-w-2xl text-[2.35rem] font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-5xl sm:leading-[1.05] lg:text-7xl">
              Comida de verdade, feita para você.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-200 sm:mt-5 sm:text-base sm:leading-7 lg:text-lg">
              Hambúrgueres artesanais, pizzas e porções preparados com
              ingredientes selecionados e entregues quentinhos na sua casa.
            </p>

            {!isLoading && !isOpen && (
              <div className="mt-5 flex max-w-xl items-start gap-3 rounded-2xl border border-red-300/30 bg-red-950/50 p-4 text-red-100 backdrop-blur-md">
                <LockKeyhole size={19} className="mt-0.5 shrink-0" />

                <div>
                  <strong className="block text-sm font-black">
                    Pedidos temporariamente suspensos
                  </strong>

                  <p className="mt-1 text-xs leading-5 text-red-100/80 sm:text-sm">
                    {statusMessage}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row">
              {isOpen ? (
                <a
                  href="#products"
                  className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-6 py-4 text-sm font-black text-white shadow-xl shadow-black/20 transition hover:bg-[#58141e] active:scale-[0.98] sm:w-auto sm:px-7"
                >
                  Ver cardápio
                  <CheckCircle2 size={18} />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex min-h-13 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-zinc-700/90 px-6 py-4 text-sm font-black text-zinc-300 sm:w-auto sm:px-7"
                >
                  <LockKeyhole size={18} />
                  Loja fechada
                </button>
              )}

              <div className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-sm font-bold text-white backdrop-blur-md sm:w-auto sm:px-6">
                <Clock3 size={18} className="shrink-0 text-[#fdf4c3]" />
                Entrega em 30–45 min
              </div>
            </div>
          </div>
        </div>

        <div
          id="horarios"
          className="relative z-20 mx-auto -mt-10 grid max-w-6xl gap-3 px-3 sm:-mt-8 sm:grid-cols-3 sm:gap-4 sm:px-6"
        >
          <article
            className={`flex min-h-[92px] items-center gap-3 rounded-2xl border bg-white p-4 shadow-lg shadow-zinc-950/5 sm:min-h-[104px] sm:gap-4 sm:rounded-3xl sm:p-5 ${
              isOpen ? "border-emerald-200" : "border-red-200"
            }`}
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${
                isLoading
                  ? "bg-zinc-100 text-zinc-500"
                  : isOpen
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {isLoading ? (
                <Clock3 size={21} />
              ) : isOpen ? (
                <CheckCircle2 size={22} />
              ) : (
                <LockKeyhole size={21} />
              )}
            </div>

            <div className="min-w-0">
              <span
                className={`block text-[11px] font-black uppercase tracking-wider sm:text-xs ${
                  isLoading
                    ? "text-zinc-500"
                    : isOpen
                      ? "text-emerald-600"
                      : "text-red-600"
                }`}
              >
                {isLoading
                  ? "Verificando"
                  : isOpen
                    ? "Estamos abertos"
                    : "Estamos fechados"}
              </span>

              <p className="mt-1 text-sm font-black leading-5 text-zinc-900">
                {isLoading
                  ? "Consultando funcionamento"
                  : isOpen
                    ? "Aceitando pedidos"
                    : "Pedidos indisponíveis"}
              </p>
            </div>
          </article>

          <article className="flex min-h-[92px] items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg shadow-zinc-950/5 sm:min-h-[104px] sm:gap-4 sm:rounded-3xl sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19] sm:h-12 sm:w-12">
              <Clock3 size={22} />
            </div>

            <div className="min-w-0">
              <span className="block text-[11px] font-black uppercase tracking-wider text-[#7f5417] sm:text-xs">
                Funcionamento
              </span>

              <p className="mt-1 text-sm font-black leading-5 text-zinc-900">
                Terça a domingo
              </p>

              <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                Das 18h às 23h
              </p>
            </div>
          </article>

          <article className="flex min-h-[92px] items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg shadow-zinc-950/5 sm:min-h-[104px] sm:gap-4 sm:rounded-3xl sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-[#58141e] sm:h-12 sm:w-12">
              <Bike size={22} />
            </div>

            <div className="min-w-0">
              <span className="block text-[11px] font-black uppercase tracking-wider text-zinc-500 sm:text-xs">
                Entrega
              </span>

              <p className="mt-1 flex items-center gap-1 text-sm font-black leading-5 text-zinc-900">
                <MapPin size={14} className="shrink-0 text-[#7f3c19]" />
                Até 8 km da loja
              </p>

              <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                Consulte a taxa no checkout
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

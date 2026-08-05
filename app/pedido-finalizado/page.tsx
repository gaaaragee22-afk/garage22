"use client";

import { useMemo, useSyncExternalStore } from "react";

import Link from "next/link";

import {
  Check,
  Clock3,
  MapPin,
  Phone,
  ReceiptText,
  Search,
  Truck,
} from "lucide-react";

import type { CreatedOrder } from "@/types/checkout";

import { formatCurrency } from "@/utils/format";

const ORDER_STORAGE_KEY = "@cardapio-online:last-order";

function subscribe(): () => void {
  return () => {};
}

function getOrderSnapshot(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(ORDER_STORAGE_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

export default function OrderFinishedPage() {
  const storedOrder = useSyncExternalStore(
    subscribe,
    getOrderSnapshot,
    getServerSnapshot,
  );

  const order = useMemo<CreatedOrder | null>(() => {
    if (!storedOrder) {
      return null;
    }

    try {
      return JSON.parse(storedOrder) as CreatedOrder;
    } catch (error) {
      console.error("[OrderFinishedPage] Erro ao recuperar o pedido:", error);

      return null;
    }
  }, [storedOrder]);

  if (!order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#fdf4c3] text-[#7f3c19]">
            <ReceiptText size={38} />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-zinc-900">
            Pedido não encontrado
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Não encontramos os dados de um pedido recente. Digite o código do
            pedido para consultar o andamento.
          </p>

          <Link
            href="/acompanhar-pedido"
            className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-6 font-semibold text-white transition hover:bg-[#58141e] active:scale-[0.98]"
          >
            <Search size={18} />
            Acompanhar pedido
          </Link>
        </div>
      </main>
    );
  }

  const trackingUrl = `/acompanhar-pedido?codigo=${encodeURIComponent(
    order.orderNumber,
  )}`;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="bg-emerald-600 px-5 py-9 text-center text-white sm:px-10 sm:py-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
              <Check size={42} strokeWidth={3} />
            </div>

            <h1 className="mt-5 text-3xl font-extrabold">Pedido realizado!</h1>

            <p className="mt-2 text-sm text-emerald-50 sm:text-base">
              Recebemos o seu pedido com sucesso.
            </p>
          </div>

          <div className="p-5 sm:p-8">
            <div className="rounded-2xl border border-[#7f5417]/15 bg-[#fdf4c3]/65 p-5 text-center">
              <p className="text-sm font-medium text-[#7f5417]">
                Número do pedido
              </p>

              <strong className="mt-1 block break-all text-2xl text-[#7f3c19] sm:text-3xl">
                #{order.orderNumber}
              </strong>

              <p className="mt-2 text-xs leading-5 text-[#7f5417]">
                Guarde este código para acompanhar o andamento.
              </p>
            </div>

            <div className="mt-7 space-y-5">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
                  <Phone size={20} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm text-zinc-500">Celular</p>

                  <p className="mt-1 break-words font-semibold text-zinc-900">
                    {order.phone}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
                  <MapPin size={20} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm text-zinc-500">Endereço de entrega</p>

                  <p className="mt-1 break-words font-semibold text-zinc-900">
                    {order.address.street}, {order.address.number}
                  </p>

                  <p className="mt-1 break-words text-sm leading-6 text-zinc-600">
                    {order.address.neighborhood}
                    {order.address.complement
                      ? `, ${order.address.complement}`
                      : ""}
                    <br />
                    {order.address.city} - {order.address.state}
                    <br />
                    CEP: {order.address.cep}
                    {order.address.reference && (
                      <>
                        <br />
                        Referência: {order.address.reference}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fdf4c3] text-[#7f3c19]">
                  <Clock3 size={20} />
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Situação</p>

                  <p className="mt-1 font-semibold text-zinc-900">
                    Aguardando confirmação
                  </p>

                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    O estabelecimento recebeu o seu pedido.
                  </p>
                </div>
              </div>
            </div>

            <div className="my-7 h-px bg-zinc-200" />

            <div className="space-y-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-zinc-500">Produtos</span>

                <span className="font-semibold text-zinc-900">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="inline-flex items-center gap-2 text-zinc-500">
                  <Truck size={17} className="text-[#7f5417]" />
                  Taxa de entrega
                </span>

                <span className="font-semibold text-zinc-900">
                  {formatCurrency(order.deliveryFee)}
                </span>
              </div>

              <div className="flex items-end justify-between gap-4 border-t border-zinc-200 pt-5">
                <span className="font-bold text-zinc-900">Total</span>

                <strong className="text-2xl text-[#7f3c19]">
                  {formatCurrency(order.total)}
                </strong>
              </div>
            </div>

            <Link
              href={trackingUrl}
              className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#7f3c19] px-5 text-center font-bold text-white shadow-[0_10px_25px_rgba(127,60,25,0.22)] transition hover:bg-[#58141e] active:scale-[0.98]"
            >
              <Search size={19} />
              Acompanhar meu pedido
            </Link>

            <p className="mt-3 text-center text-xs leading-5 text-zinc-500">
              O código será preenchido e consultado automaticamente.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

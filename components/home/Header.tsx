"use client";

import { MapPin, Menu, ShoppingBag, Store, Truck, X } from "lucide-react";

import Link from "next/link";

import { useState } from "react";

import { useCart } from "@/hooks/useCart";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { totalItems, openCart } = useCart();

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/#inicio"
          aria-label="Ir para o início"
          className="flex min-w-0 items-center gap-3"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7f3c19] text-white shadow-lg shadow-[#7f3c19]/20">
            <Store size={23} strokeWidth={2.4} />
          </div>

          <div className="min-w-0">
            <strong className="block truncate text-base font-black tracking-tight text-zinc-950 sm:text-lg">
              Garage22
            </strong>

            <span className="hidden text-xs font-medium text-zinc-500 sm:block">
              Hot dogs, bebidas e sobremesas
            </span>
          </div>
        </Link>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700">
            <MapPin size={17} className="text-[#7f3c19]" />
            Centro, Cuité
          </div>

          <Link
            href="/acompanhar-pedido"
            className="flex h-12 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-700 transition hover:border-[#7f5417]/40 hover:bg-[#fdf4c3]/50 hover:text-[#7f3c19]"
          >
            <Truck size={19} />
            Acompanhar pedido
          </Link>

          <button
            type="button"
            onClick={openCart}
            className="relative flex h-12 items-center gap-2 rounded-2xl bg-[#7f3c19] px-5 text-sm font-bold text-white transition hover:bg-[#58141e]"
          >
            <ShoppingBag size={19} />

            <span>Sacola</span>

            {totalItems > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#fdf4c3] px-1.5 text-xs font-black text-[#58141e]">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        <Link
          href="/acompanhar-pedido"
          aria-label="Acompanhar pedido"
          className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fdf4c3] text-[#7f3c19] transition hover:bg-[#f7e7a5] lg:hidden"
        >
          <Truck size={20} />
        </Link>

        <button
          type="button"
          onClick={openCart}
          aria-label="Abrir sacola"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 transition hover:bg-zinc-200 lg:hidden"
        >
          <ShoppingBag size={20} />

          {totalItems > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7f3c19] px-1 text-[10px] font-black text-white">
              {totalItems}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isMenuOpen}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900 transition hover:bg-zinc-100 lg:hidden"
        >
          {isMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-zinc-200 bg-white px-4 py-4 shadow-sm lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-2">
            <Link
              href="/#cardapio"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100"
            >
              Ver cardápio
            </Link>

            <Link
              href="/#horarios"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100"
            >
              Horários de funcionamento
            </Link>

            <Link
              href="/acompanhar-pedido"
              onClick={closeMenu}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-[#fdf4c3]/50 hover:text-[#7f3c19]"
            >
              <Truck size={18} />
              Acompanhar pedido
            </Link>

            <div className="flex items-center gap-2 rounded-xl bg-[#fdf4c3] px-4 py-3 text-sm font-bold text-[#7f5417]">
              <MapPin size={17} />
              Centro, Cuité
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

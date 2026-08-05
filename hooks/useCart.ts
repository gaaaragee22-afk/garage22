"use client";

import { useContext } from "react";

import { CartContext, type CartContextData } from "@/context/CartContext";

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart deve ser utilizado dentro do CartProvider.");
  }

  return context;
}

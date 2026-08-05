"use client";

import { ReactNode } from "react";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { StoreStatusProvider } from "@/context/StoreStatusContext";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <StoreStatusProvider>
        <CartProvider>{children}</CartProvider>
      </StoreStatusProvider>
    </AuthProvider>
  );
}

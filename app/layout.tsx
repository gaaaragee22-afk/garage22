import type { Metadata } from "next";
import type { ReactNode } from "react";

import CartVisibility from "@/components/cart/CartVisibility";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { StoreStatusProvider } from "@/context/StoreStatusContext";

import "./globals.css";

export const metadata: Metadata = {
  title: "Cardápio Online",
  description: "Cardápio online",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <StoreStatusProvider>
            <CartProvider>
              {children}

              <CartVisibility />
            </CartProvider>
          </StoreStatusProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

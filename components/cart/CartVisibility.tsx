"use client";

import { usePathname } from "next/navigation";

import CartDrawer from "@/components/cart/CartDrawer";
import FloatingCart from "@/components/cart/FloatingCart";

export default function CartVisibility() {
  const pathname = usePathname();

  const hiddenRoutes = ["/checkout", "/pedido-finalizado"];

  const shouldHideCart = hiddenRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (shouldHideCart) {
    return null;
  }

  return (
    <>
      <FloatingCart />
      <CartDrawer />
    </>
  );
}

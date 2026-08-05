import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

const protectedRoutes = ["/dashboard"];
const publicAuthRoutes = ["/login"];

const blockedRoutesWhenClosed = [
  "/",
  "/checkout",
  "/pedido",
  "/acompanhar-pedido",
];

function routeStartsWith(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ==========================
  // BLOQUEIO DA LOJA
  // ==========================

  const storeStatus = request.cookies.get("store-status")?.value;

  const isBlockedRoute = routeStartsWith(pathname, blockedRoutesWhenClosed);

  if (
    storeStatus === "closed" &&
    isBlockedRoute &&
    pathname !== "/loja-fechada"
  ) {
    return NextResponse.redirect(new URL("/loja-fechada", request.url));
  }

  // ==========================
  // AUTENTICAÇÃO
  // ==========================

  const isProtectedRoute = routeStartsWith(pathname, protectedRoutes);

  const isPublicAuthRoute = routeStartsWith(pathname, publicAuthRoutes);

  if (!isProtectedRoute && !isPublicAuthRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  const session = token ? await verifyAuthToken(token) : null;

  if (isProtectedRoute && !session) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set("redirect", pathname);

    const response = NextResponse.redirect(loginUrl);

    if (token) {
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }

    return response;
  }

  if (isPublicAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/checkout/:path*",
    "/pedido/:path*",
    "/acompanhar-pedido/:path*",
    "/dashboard/:path*",
    "/login",
  ],
};

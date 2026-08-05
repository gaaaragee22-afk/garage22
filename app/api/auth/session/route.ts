import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
        },
        {
          status: 401,
        },
      );
    }

    const payload = await verifyAuthToken(token);

    if (!payload) {
      const response = NextResponse.json(
        {
          authenticated: false,
          user: null,
        },
        {
          status: 401,
        },
      );

      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });

      return response;
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: payload.userId,
          name: payload.name,
          email: payload.email,
          role: payload.role,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);

    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        message: "Não foi possível verificar a sessão.",
      },
      {
        status: 500,
      },
    );
  }
}

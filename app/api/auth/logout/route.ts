import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const response = NextResponse.json(
      {
        message: "Logout realizado com sucesso.",
      },
      {
        status: 200,
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
  } catch (error) {
    console.error("Erro ao realizar logout:", error);

    return NextResponse.json(
      {
        message: "Não foi possível realizar o logout.",
      },
      {
        status: 500,
      },
    );
  }
}

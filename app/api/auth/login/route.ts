import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, createAuthToken } from "@/lib/auth";

interface LoginRequestBody {
  email?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequestBody;

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      return NextResponse.json(
        {
          message: "Preencha o e-mail e a senha.",
        },
        {
          status: 400,
        },
      );
    }

    const adminName = process.env.ADMIN_NAME?.trim() || "Administrador";

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error(
        "As variáveis ADMIN_EMAIL e ADMIN_PASSWORD não foram configuradas.",
      );

      return NextResponse.json(
        {
          message: "A autenticação não foi configurada no servidor.",
        },
        {
          status: 500,
        },
      );
    }

    const emailIsValid = email === adminEmail;
    const passwordIsValid = password === adminPassword;

    if (!emailIsValid || !passwordIsValid) {
      return NextResponse.json(
        {
          message: "E-mail ou senha inválidos.",
        },
        {
          status: 401,
        },
      );
    }

    const user = {
      id: 1,
      name: adminName,
      email: adminEmail,
      role: "admin" as const,
    };

    const token = await createAuthToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        message: "Login realizado com sucesso.",
        user,
      },
      {
        status: 200,
      },
    );

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Erro ao realizar login:", error);

    return NextResponse.json(
      {
        message: "Não foi possível realizar o login.",
      },
      {
        status: 500,
      },
    );
  }
}

import { cookies } from "next/headers";

import {
  AUTH_COOKIE_NAME,
  AuthTokenPayload,
  verifyAuthToken,
} from "@/lib/auth";

export class AuthenticationError extends Error {
  status: number;

  constructor(message = "Você não possui autorização.") {
    super(message);

    this.name = "AuthenticationError";
    this.status = 401;
  }
}

export async function requireAdmin(): Promise<AuthTokenPayload> {
  const cookieStore = await cookies();

  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    throw new AuthenticationError(
      "Você precisa estar autenticado para realizar esta ação.",
    );
  }

  const session = await verifyAuthToken(token);

  if (!session || session.role !== "admin") {
    throw new AuthenticationError("Sua sessão é inválida ou expirou.");
  }

  return session;
}

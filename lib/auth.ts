import { jwtVerify, SignJWT } from "jose";

export const AUTH_COOKIE_NAME = "sabor-urbano-auth-token";

export interface AuthTokenPayload {
  userId: number;
  name: string;
  email: string;
  role: "admin";
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "A variável JWT_SECRET não foi configurada no arquivo .env.local.",
    );
  }

  return new TextEncoder().encode(secret);
}

export function getAdminOwnerId(session: AuthTokenPayload): string {
  return `admin:${session.userId}`;
}

export async function createAuthToken(
  payload: AuthTokenPayload,
): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    name: payload.name,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyAuthToken(
  token: string,
): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.userId !== "number" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      payload.role !== "admin"
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

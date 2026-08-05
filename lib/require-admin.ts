import jwt, { JwtPayload } from "jsonwebtoken";
import { NextRequest } from "next/server";

export interface AdminTokenPayload extends JwtPayload {
  name?: string;

  email?: string;
}

export function requireAdmin(request: NextRequest): AdminTokenPayload {
  const cookieToken = request.cookies.get("nextauth.token")?.value;

  const authorizationHeader = request.headers.get("authorization");

  const bearerToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : null;

  const token = cookieToken || bearerToken;

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const secretToken = process.env.SECRET_TOKEN;

  if (!secretToken) {
    throw new Error("SECRET_TOKEN_NOT_CONFIGURED");
  }

  try {
    return jwt.verify(token, secretToken) as AdminTokenPayload;
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}

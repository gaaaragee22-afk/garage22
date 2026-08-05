import jwt, {
  JsonWebTokenError,
  JwtPayload,
  NotBeforeError,
  TokenExpiredError,
} from "jsonwebtoken";
import { NextRequest } from "next/server";

export interface AdminTokenPayload extends JwtPayload {
  name?: string;
  email?: string;
  role?: string;
}

interface AdminAuthenticationResult {
  authenticated: boolean;
  user: AdminTokenPayload | null;
  message?: string;
}

const ADMIN_TOKEN_COOKIE = "sabor-urbano-auth-token";

function getBearerToken(request: NextRequest): string | null {
  const authorizationHeader = request.headers.get("authorization");

  console.log("[requireAdmin] Authorization enviado:", {
    present: Boolean(authorizationHeader),
    startsWithBearer: authorizationHeader?.startsWith("Bearer ") ?? false,
  });

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice(7).trim();

  return token || null;
}

function getCookieToken(request: NextRequest): string | null {
  const cookies = request.cookies.getAll();

  console.log(
    "[requireAdmin] Cookies recebidos:",
    cookies.map((cookie) => cookie.name),
  );

  const cookie = request.cookies.get(ADMIN_TOKEN_COOKIE);

  console.log(`[requireAdmin] Cookie "${ADMIN_TOKEN_COOKIE}":`, {
    found: Boolean(cookie?.value),
    tokenLength: cookie?.value.length ?? 0,
  });

  return cookie?.value || null;
}

function describeJwtError(error: unknown): string {
  if (error instanceof TokenExpiredError) {
    console.error("[requireAdmin] Token expirado:", {
      expiredAt: error.expiredAt,
      message: error.message,
    });

    return "A sessão do administrador expirou.";
  }

  if (error instanceof JsonWebTokenError) {
    console.error("[requireAdmin] Token JWT inválido:", {
      name: error.name,
      message: error.message,
    });

    return "Token de administrador inválido.";
  }

  if (error instanceof NotBeforeError) {
    console.error("[requireAdmin] Token ainda não está válido:", {
      date: error.date,
      message: error.message,
    });

    return "O token do administrador ainda não está válido.";
  }

  if (error instanceof Error) {
    console.error("[requireAdmin] Erro ao verificar autenticação:", {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    return "Não foi possível validar a autenticação.";
  }

  console.error("[requireAdmin] Erro desconhecido ao verificar token:", error);

  return "Não foi possível validar a autenticação.";
}

export function requireAdmin(request: NextRequest): AdminAuthenticationResult {
  console.log("--------------------------------------------");
  console.log("[requireAdmin] Iniciando autenticação...");
  console.log("[requireAdmin] Rota:", request.nextUrl.pathname);

  const secret = process.env.JWT_SECRET;

  console.log("[requireAdmin] Variáveis de ambiente:", {
    JWT_SECRET: Boolean(process.env.JWT_SECRET),
  });

  if (!secret) {
    console.error("[requireAdmin] JWT_SECRET não está configurada.");

    console.log("--------------------------------------------");

    return {
      authenticated: false,
      user: null,
      message: "A variável JWT_SECRET não está configurada.",
    };
  }

  const cookieToken = getCookieToken(request);
  const bearerToken = getBearerToken(request);

  const token = cookieToken || bearerToken;

  console.log("[requireAdmin] Token selecionado:", {
    fromCookie: Boolean(cookieToken),
    fromAuthorization: Boolean(bearerToken),
    tokenPresent: Boolean(token),
  });

  if (!token) {
    console.error(
      `[requireAdmin] Nenhum token encontrado. Era esperado o cookie "${ADMIN_TOKEN_COOKIE}" ou um Bearer Token.`,
    );

    console.log("--------------------------------------------");

    return {
      authenticated: false,
      user: null,
      message: "Administrador não autenticado.",
    };
  }

  try {
    console.log("[requireAdmin] Verificando token JWT...");

    const decodedToken = jwt.verify(token, secret) as AdminTokenPayload;

    console.log("[requireAdmin] Token validado:", {
      name: decodedToken.name,
      email: decodedToken.email,
      role: decodedToken.role,
      issuedAt: decodedToken.iat
        ? new Date(decodedToken.iat * 1000).toISOString()
        : undefined,
      expiresAt: decodedToken.exp
        ? new Date(decodedToken.exp * 1000).toISOString()
        : undefined,
    });

    if (decodedToken.role && decodedToken.role !== "admin") {
      console.error("[requireAdmin] Usuário sem permissão administrativa:", {
        role: decodedToken.role,
      });

      console.log("--------------------------------------------");

      return {
        authenticated: false,
        user: null,
        message: "O usuário não possui permissão administrativa.",
      };
    }

    console.log("[requireAdmin] Administrador autenticado com sucesso.");
    console.log("--------------------------------------------");

    return {
      authenticated: true,
      user: decodedToken,
    };
  } catch (error) {
    const message = describeJwtError(error);

    console.log("--------------------------------------------");

    return {
      authenticated: false,
      user: null,
      message,
    };
  }
}

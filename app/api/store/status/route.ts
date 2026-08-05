import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  changeStoreStatus,
  getPublicStoreStatus,
} from "@/services/storeSettingsService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface UpdateStoreStatusBody {
  isOpen?: unknown;
  closedMessage?: unknown;
}

function createRequestId(): string {
  return randomUUID().slice(0, 8);
}

function getSafeHeaders(request: NextRequest) {
  return {
    contentType: request.headers.get("content-type"),
    authorizationPresent: Boolean(request.headers.get("authorization")),
    cookiePresent: Boolean(request.headers.get("cookie")),
    userAgent: request.headers.get("user-agent"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
  };
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }

  return {
    message: String(error),
  };
}

function logDivider() {
  console.log("============================================================");
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  logDivider();

  console.log(`[StoreStatus:${requestId}] GET iniciado`);
  console.log(`[StoreStatus:${requestId}] Data:`, new Date());
  console.log(`[StoreStatus:${requestId}] URL:`, request.nextUrl.pathname);
  console.log(`[StoreStatus:${requestId}] Headers:`, getSafeHeaders(request));

  try {
    console.log(
      `[StoreStatus:${requestId}] Chamando getPublicStoreStatus()...`,
    );

    const status = await getPublicStoreStatus();

    console.log(
      `[StoreStatus:${requestId}] Status retornado pelo service:`,
      status,
    );

    if (!status) {
      console.error(
        `[StoreStatus:${requestId}] O service não retornou um status.`,
      );

      logDivider();

      return jsonResponse(
        {
          success: false,
          requestId,
          message: "O serviço não retornou o funcionamento da loja.",
        },
        500,
      );
    }

    if (typeof status.isOpen !== "boolean") {
      console.error(
        `[StoreStatus:${requestId}] isOpen inválido retornado pelo service:`,
        status.isOpen,
      );

      logDivider();

      return jsonResponse(
        {
          success: false,
          requestId,
          message: "O serviço retornou um status de funcionamento inválido.",
        },
        500,
      );
    }

    console.log(`[StoreStatus:${requestId}] GET concluído com sucesso.`);

    logDivider();

    return jsonResponse(
      {
        success: true,
        requestId,
        store: status,
      },
      200,
    );
  } catch (error) {
    console.error(
      `[StoreStatus:${requestId}] Erro ao consultar o status da loja:`,
      serializeError(error),
    );

    logDivider();

    return jsonResponse(
      {
        success: false,
        requestId,
        message: "Não foi possível consultar o funcionamento da loja.",
        ...(process.env.NODE_ENV === "development"
          ? {
              details: serializeError(error),
            }
          : {}),
      },
      500,
    );
  }
}

export async function PUT(request: NextRequest) {
  const requestId = createRequestId();

  logDivider();

  console.log(`[StoreStatus:${requestId}] PUT iniciado`);
  console.log(`[StoreStatus:${requestId}] Data:`, new Date());
  console.log(`[StoreStatus:${requestId}] URL:`, request.nextUrl.pathname);
  console.log(`[StoreStatus:${requestId}] Headers:`, getSafeHeaders(request));

  console.log(
    `[StoreStatus:${requestId}] Verificando autenticação do administrador...`,
  );

  let authentication;

  try {
    authentication = requireAdmin(request);
  } catch (error) {
    console.error(
      `[StoreStatus:${requestId}] requireAdmin lançou um erro:`,
      serializeError(error),
    );

    logDivider();

    return jsonResponse(
      {
        success: false,
        requestId,
        message: "Não foi possível verificar a autenticação do administrador.",
        ...(process.env.NODE_ENV === "development"
          ? {
              details: serializeError(error),
            }
          : {}),
      },
      500,
    );
  }

  console.log(`[StoreStatus:${requestId}] Resultado da autenticação:`, {
    authenticated: authentication.authenticated,
    message: authentication.message,
    hasUser: Boolean(authentication.user),
    user: authentication.user
      ? {
          name: authentication.user.name,
          email: authentication.user.email,
        }
      : null,
  });

  if (!authentication.authenticated) {
    console.error(`[StoreStatus:${requestId}] Administrador não autenticado.`);

    console.error(
      `[StoreStatus:${requestId}] Cookie recebido:`,
      Boolean(request.headers.get("cookie")),
    );

    console.error(
      `[StoreStatus:${requestId}] Authorization recebido:`,
      Boolean(request.headers.get("authorization")),
    );

    logDivider();

    return jsonResponse(
      {
        success: false,
        requestId,
        message: authentication.message || "Administrador não autenticado.",
      },
      401,
    );
  }

  let body: UpdateStoreStatusBody;

  try {
    console.log(`[StoreStatus:${requestId}] Lendo corpo da requisição...`);

    body = (await request.json()) as UpdateStoreStatusBody;

    console.log(`[StoreStatus:${requestId}] Corpo recebido:`, body);
  } catch (error) {
    console.error(
      `[StoreStatus:${requestId}] JSON inválido:`,
      serializeError(error),
    );

    logDivider();

    return jsonResponse(
      {
        success: false,
        requestId,
        message: "O corpo da requisição não contém um JSON válido.",
      },
      400,
    );
  }

  if (typeof body.isOpen !== "boolean") {
    console.error(`[StoreStatus:${requestId}] Campo isOpen inválido:`, {
      value: body.isOpen,
      type: typeof body.isOpen,
    });

    logDivider();

    return jsonResponse(
      {
        success: false,
        requestId,
        message: "O campo isOpen deve ser verdadeiro ou falso.",
      },
      400,
    );
  }

  if (
    body.closedMessage !== undefined &&
    typeof body.closedMessage !== "string"
  ) {
    console.error(`[StoreStatus:${requestId}] closedMessage inválido:`, {
      value: body.closedMessage,
      type: typeof body.closedMessage,
    });

    logDivider();

    return jsonResponse(
      {
        success: false,
        requestId,
        message: "A mensagem de fechamento precisa ser um texto.",
      },
      400,
    );
  }

  const closedMessage =
    typeof body.closedMessage === "string"
      ? body.closedMessage.trim()
      : undefined;

  if (!body.isOpen && !closedMessage) {
    console.error(
      `[StoreStatus:${requestId}] Tentativa de fechar sem mensagem.`,
    );

    logDivider();

    return jsonResponse(
      {
        success: false,
        requestId,
        message:
          "Informe a mensagem que será exibida quando a loja estiver fechada.",
      },
      400,
    );
  }

  if (closedMessage && closedMessage.length > 300) {
    console.error(
      `[StoreStatus:${requestId}] Mensagem excedeu o limite:`,
      closedMessage.length,
    );

    logDivider();

    return jsonResponse(
      {
        success: false,
        requestId,
        message: "A mensagem de fechamento pode ter no máximo 300 caracteres.",
      },
      400,
    );
  }

  const changedBy =
    authentication.user?.email || authentication.user?.name || "Administrador";

  console.log(`[StoreStatus:${requestId}] Dados enviados ao service:`, {
    isOpen: body.isOpen,
    closedMessage,
    changedBy,
  });

  try {
    console.log(`[StoreStatus:${requestId}] Chamando changeStoreStatus()...`);

    const status = await changeStoreStatus({
      isOpen: body.isOpen,
      closedMessage,
      changedBy,
    });

    console.log(
      `[StoreStatus:${requestId}] Retorno do changeStoreStatus:`,
      status,
    );

    if (!status) {
      console.error(
        `[StoreStatus:${requestId}] O service não retornou o status atualizado.`,
      );

      logDivider();

      return jsonResponse(
        {
          success: false,
          requestId,
          message: "O serviço não retornou o funcionamento atualizado da loja.",
        },
        500,
      );
    }

    if (typeof status.isOpen !== "boolean") {
      console.error(
        `[StoreStatus:${requestId}] Status inválido retornado:`,
        status,
      );

      logDivider();

      return jsonResponse(
        {
          success: false,
          requestId,
          message: "O serviço retornou um funcionamento inválido.",
        },
        500,
      );
    }

    if (status.isOpen !== body.isOpen) {
      console.error(
        `[StoreStatus:${requestId}] O service retornou um status diferente do solicitado:`,
        {
          requested: body.isOpen,
          returned: status.isOpen,
        },
      );

      logDivider();

      return jsonResponse(
        {
          success: false,
          requestId,
          message:
            "O status devolvido pelo serviço é diferente do status solicitado.",
        },
        500,
      );
    }

    console.log(`[StoreStatus:${requestId}] Status atualizado com sucesso.`);

    console.log(`[StoreStatus:${requestId}] Status final:`, {
      isOpen: status.isOpen,
      closedMessage: status.closedMessage,
      lastStatusChangeAt: status.lastStatusChangeAt,
      updatedAt: status.updatedAt,
    });

    logDivider();

    return jsonResponse(
      {
        success: true,
        requestId,
        message: status.isOpen
          ? "A loja foi aberta para novos pedidos."
          : "A loja foi fechada para novos pedidos.",
        store: status,
      },
      200,
    );
  } catch (error) {
    console.error(
      `[StoreStatus:${requestId}] Erro ao atualizar o status da loja:`,
      serializeError(error),
    );

    logDivider();

    return jsonResponse(
      {
        success: false,
        requestId,
        message: "Não foi possível alterar o funcionamento da loja.",
        ...(process.env.NODE_ENV === "development"
          ? {
              details: serializeError(error),
            }
          : {}),
      },
      500,
    );
  }
}

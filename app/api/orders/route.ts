import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "@/lib/database";
import { generateOrderNumber, validateCreateOrder } from "@/lib/order";
import Order from "@/models/Order";

import { getPublicStoreStatus } from "@/services/storeSettingsService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocorreu um erro inesperado.";
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log("==============================================");
    console.log("[Orders:POST] Iniciando criação de pedido");
    console.log("[Orders:POST] Data:", new Date().toISOString());

    /*
     * Primeiro verifica o funcionamento da loja.
     * Isso acontece antes mesmo de validar ou salvar o pedido.
     */
    console.log("[Orders:POST] Consultando funcionamento da loja...");

    const storeStatus = await getPublicStoreStatus();

    console.log("[Orders:POST] Funcionamento retornado:", {
      isOpen: storeStatus.isOpen,
      closedMessage: storeStatus.closedMessage,
      lastStatusChangeAt: storeStatus.lastStatusChangeAt,
      updatedAt: storeStatus.updatedAt,
    });

    if (!storeStatus.isOpen) {
      console.warn(
        "[Orders:POST] Pedido bloqueado porque a loja está fechada.",
      );

      console.log("==============================================");

      return NextResponse.json(
        {
          success: false,
          code: "STORE_CLOSED",
          message:
            storeStatus.closedMessage ||
            "No momento, nossa loja está fechada para novos pedidos.",
          store: storeStatus,
        },
        {
          status: 423,
          headers: noStoreHeaders(),
        },
      );
    }

    console.log("[Orders:POST] Loja aberta. Lendo corpo da requisição...");

    const body: unknown = await request.json();

    console.log("[Orders:POST] Validando dados do pedido...");

    const validatedOrder = validateCreateOrder(body);

    console.log("[Orders:POST] Pedido validado com sucesso.");

    await connectDatabase();

    console.log("[Orders:POST] Banco de dados conectado.");

    /*
     * Faz uma segunda verificação imediatamente antes
     * de salvar. Isso cobre o caso em que o administrador
     * fecha a loja enquanto o pedido está sendo processado.
     */
    console.log(
      "[Orders:POST] Confirmando novamente o funcionamento antes de salvar...",
    );

    const confirmedStoreStatus = await getPublicStoreStatus();

    console.log("[Orders:POST] Segunda verificação:", {
      isOpen: confirmedStoreStatus.isOpen,
      closedMessage: confirmedStoreStatus.closedMessage,
    });

    if (!confirmedStoreStatus.isOpen) {
      console.warn(
        "[Orders:POST] Loja foi fechada durante o processamento. Pedido cancelado.",
      );

      console.log("==============================================");

      return NextResponse.json(
        {
          success: false,
          code: "STORE_CLOSED",
          message:
            confirmedStoreStatus.closedMessage ||
            "A loja foi fechada e não está recebendo novos pedidos.",
          store: confirmedStoreStatus,
        },
        {
          status: 423,
          headers: noStoreHeaders(),
        },
      );
    }

    let orderNumber = generateOrderNumber();

    console.log("[Orders:POST] Número inicial gerado:", orderNumber);

    const numberAlreadyExists = await Order.exists({
      orderNumber,
    });

    if (numberAlreadyExists) {
      console.warn(
        "[Orders:POST] Número duplicado encontrado. Gerando outro...",
      );

      orderNumber = generateOrderNumber();

      console.log("[Orders:POST] Novo número gerado:", orderNumber);
    }

    console.log("[Orders:POST] Criando pedido no banco...");

    const order = await Order.create({
      orderNumber,
      ...validatedOrder,
      status: "pending",
    });

    console.log("[Orders:POST] Pedido criado com sucesso:", {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
    });

    console.log("==============================================");

    return NextResponse.json(
      {
        success: true,
        message: "Pedido criado com sucesso.",
        order,
      },
      {
        status: 201,
        headers: noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error("[Orders:POST] Erro ao criar pedido:", error);

    console.log("==============================================");

    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map(
        (validationError) => validationError.message,
      );

      return NextResponse.json(
        {
          success: false,
          message: messages[0] || "Os dados do pedido são inválidos.",
          errors: messages,
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          message: "O corpo da requisição possui um JSON inválido.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      {
        status: 400,
        headers: noStoreHeaders(),
      },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase();

    const searchParams = request.nextUrl.searchParams;

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 20, 1),
      100,
    );

    const status = searchParams.get("status");

    const search = searchParams.get("search")?.trim();

    const filter: Record<string, unknown> = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        {
          orderNumber: {
            $regex: search,
            $options: "i",
          },
        },
        {
          "customer.phone": {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Order.countDocuments(filter),
    ]);

    return NextResponse.json(
      {
        success: true,
        orders,

        pagination: {
          page,
          limit,
          totalOrders,

          totalPages: Math.ceil(totalOrders / limit),
        },
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error("[Orders:GET] Erro ao buscar pedidos:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível buscar os pedidos.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      },
    );
  }
}

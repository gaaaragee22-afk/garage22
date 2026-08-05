import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "@/lib/database";
import Order from "@/models/Order";
import {
  cancelAndConsolidateOrder,
  deliverAndConsolidateOrder,
} from "@/services/deliver-order";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface UpdateStatusBody {
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "out_for_delivery"
    | "delivered"
    | "canceled";
}

const allowedStatuses: UpdateStatusBody["status"][] = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "canceled",
];

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await connectDatabase();

    const { id } = await context.params;

    const body = (await request.json()) as UpdateStatusBody;

    if (!body.status) {
      return NextResponse.json(
        {
          success: false,
          message: "Informe o status do pedido.",
        },
        {
          status: 400,
        },
      );
    }

    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Status do pedido inválido.",
        },
        {
          status: 400,
        },
      );
    }

    const existingOrder = await Order.findById(id);

    if (!existingOrder) {
      return NextResponse.json(
        {
          success: false,
          message: "Pedido não encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    let reportWeek: string | undefined;

    /*
     * Mantém a consolidação do relatório, mas o service
     * não pode mais apagar o pedido.
     */
    if (body.status === "delivered") {
      const result = await deliverAndConsolidateOrder(id);

      reportWeek = result.weekKey;
    }

    if (body.status === "canceled") {
      const result = await cancelAndConsolidateOrder(id);

      reportWeek = result.weekKey;
    }

    /*
     * Atualiza o status e mantém o documento salvo.
     */
    const order = await Order.findByIdAndUpdate(
      id,
      {
        $set: {
          status: body.status,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Pedido não encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          body.status === "delivered"
            ? "Pedido marcado como entregue e registrado no relatório."
            : body.status === "canceled"
              ? "Pedido marcado como cancelado e registrado no relatório."
              : "Status atualizado com sucesso.",
        deleted: false,
        reportWeek,
        orderNumber: order.orderNumber,
        order,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o pedido.",
      },
      {
        status: 500,
      },
    );
  }
}

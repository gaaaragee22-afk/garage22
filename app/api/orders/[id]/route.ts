import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { connectDatabase } from "@/lib/database";
import Order from "@/models/Order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OrderRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: OrderRouteContext) {
  try {
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID do pedido inválido.",
        },
        {
          status: 400,
        },
      );
    }

    await connectDatabase();

    const order = await Order.findById(id).lean();

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
        order,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível buscar o pedido.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(_request: Request, context: OrderRouteContext) {
  try {
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID do pedido inválido.",
        },
        {
          status: 400,
        },
      );
    }

    await connectDatabase();

    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
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
        message: "Pedido excluído com sucesso.",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível excluir o pedido.",
      },
      {
        status: 500,
      },
    );
  }
}

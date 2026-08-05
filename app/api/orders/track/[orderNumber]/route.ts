import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "@/lib/database";

import type { CreateOrderData } from "@/types/order";

import Order from "@/models/Order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    orderNumber: string;
  }>;
}

function maskPhone(phone: string): string {
  const numbers = phone.replace(/\D/g, "");

  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) *****-${numbers.slice(-4)}`;
  }

  if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ****-${numbers.slice(-4)}`;
  }

  return phone;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await connectDatabase();

    const { orderNumber } = await context.params;

    const sanitizedOrderNumber = orderNumber.trim();

    if (!sanitizedOrderNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "Informe o número do pedido.",
        },
        {
          status: 400,
        },
      );
    }

    const order = await Order.findOne({
      orderNumber: sanitizedOrderNumber,
    })
      .select({
        customer: 1,
        address: 1,
        items: 1,
        payment: 1,
        subtotal: 1,
        deliveryFee: 1,
        total: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .lean<
        CreateOrderData & {
          orderNumber: string;
          status: string;
          createdAt: Date;
          updatedAt: Date;
        }
      >();

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

        order: {
          orderNumber: order.orderNumber,

          customer: {
            phone: maskPhone(order.customer.phone),
          },

          address: {
            neighborhood: order.address.neighborhood,
            city: order.address.city,
            state: order.address.state,
          },

          items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          })),

          payment: {
            method: order.payment.method,
            cardType: order.payment.cardType,
          },

          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          total: order.total,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Erro ao acompanhar pedido:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível consultar o pedido.",
      },
      {
        status: 500,
      },
    );
  }
}

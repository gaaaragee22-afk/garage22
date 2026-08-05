import { NextResponse } from "next/server";

import { connectDatabase } from "@/lib/database";
import WeeklyReport from "@/models/WeeklyReport";
import { getWeekRange } from "@/utils/week";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDatabase();

    const { weekKey } = getWeekRange();

    const report = await WeeklyReport.findOne({
      weekKey,
    })
      .select({
        weekKey: 1,
        weekStart: 1,
        weekEnd: 1,

        deliveredOrders: 1,
        canceledOrders: 1,
        totalItemsSold: 1,

        productsRevenue: 1,
        deliveryFees: 1,
        totalRevenue: 1,
        averageTicket: 1,

        products: 1,
        payments: 1,
        orders: 1,
        canceled: 1,
        daily: 1,

        createdAt: 1,
        updatedAt: 1,
      })
      .lean();

    return NextResponse.json(
      {
        report,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Erro ao buscar relatório:", error);

    return NextResponse.json(
      {
        message: "Não foi possível carregar o relatório.",
      },
      {
        status: 500,
      },
    );
  }
}

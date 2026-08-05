import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "@/lib/database";
import Order from "@/models/Order";
import WeeklyReport from "@/models/WeeklyReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    weekKey: string;
  }>;
}

interface ConsolidatedOrder {
  orderId?: string;
  orderNumber: string | number;
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await mongoose.startSession();

  try {
    await connectDatabase();

    const { weekKey } = await context.params;

    const decodedWeekKey = decodeURIComponent(weekKey).trim();

    if (!decodedWeekKey) {
      return NextResponse.json(
        {
          success: false,
          message: "A identificação do relatório não foi informada.",
        },
        {
          status: 400,
        },
      );
    }

    let deletedOrdersCount = 0;

    let deletedReportData:
      | {
          weekKey: string;
          totalRevenue: number;
          deliveredOrders: number;
        }
      | undefined;

    await session.withTransaction(async () => {
      const report = await WeeklyReport.findOne({
        weekKey: decodedWeekKey,
      })
        .session(session)
        .lean();

      if (!report) {
        throw new Error("REPORT_NOT_FOUND");
      }

      const consolidatedOrders = (report.orders ?? []) as ConsolidatedOrder[];

      /*
       * Relatórios novos possuem orderId.
       * Esta é a forma mais segura de identificar os pedidos.
       */
      const orderIds = consolidatedOrders
        .map((order) => order.orderId?.trim())
        .filter((orderId): orderId is string => {
          return Boolean(orderId) && mongoose.isValidObjectId(orderId);
        });

      /*
       * Compatibilidade com relatórios antigos, que podem possuir
       * somente o número do pedido.
       */
      const orderNumbers = consolidatedOrders
        .map((order) => String(order.orderNumber).trim())
        .filter((orderNumber) => orderNumber.length > 0);

      if (orderIds.length > 0 || orderNumbers.length > 0) {
        const orderFilters: Record<string, unknown>[] = [];

        if (orderIds.length > 0) {
          orderFilters.push({
            _id: {
              $in: orderIds,
            },
          });
        }

        if (orderNumbers.length > 0) {
          orderFilters.push({
            orderNumber: {
              $in: orderNumbers,
            },
          });
        }

        /*
         * Apaga apenas pedidos entregues e que estão registrados
         * neste relatório semanal.
         */
        const deletionResult = await Order.deleteMany(
          {
            status: "delivered",

            $or: orderFilters,
          },
          {
            session,
          },
        );

        deletedOrdersCount = deletionResult.deletedCount;
      }

      const deletedReport = await WeeklyReport.findOneAndDelete(
        {
          weekKey: decodedWeekKey,
        },
        {
          session,
        },
      );

      if (!deletedReport) {
        throw new Error("REPORT_DELETE_FAILED");
      }

      deletedReportData = {
        weekKey: deletedReport.weekKey,
        totalRevenue: deletedReport.totalRevenue,
        deliveredOrders: deletedReport.deliveredOrders,
      };
    });

    console.log("[WeeklyReportFinalize] Relatório finalizado:", {
      weekKey: decodedWeekKey,
      deletedOrdersCount,
      deliveredOrdersInReport: deletedReportData?.deliveredOrders ?? 0,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Relatório finalizado e pedidos entregues removidos do banco de dados.",

        deletedOrdersCount,

        deletedReport: deletedReportData,
      },
      {
        status: 200,

        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("[WeeklyReportFinalize] Erro ao finalizar relatório:", error);

    if (error instanceof Error && error.message === "REPORT_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          message: "Relatório semanal não encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    if (error instanceof Error && error.message === "REPORT_DELETE_FAILED") {
      return NextResponse.json(
        {
          success: false,
          message: "Não foi possível remover o relatório semanal.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível finalizar o relatório.",
      },
      {
        status: 500,
      },
    );
  } finally {
    await session.endSession();
  }
}

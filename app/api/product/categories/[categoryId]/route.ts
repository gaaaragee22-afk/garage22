import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "@/lib/database";
import Category from "@/models/Category";
import Product from "@/models/Product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    categoryId: string;
  }>;
}

interface CategoryPayload {
  name?: unknown;
  description?: unknown;
  position?: unknown;
  active?: unknown;
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status });
}

async function countCategoryProducts(categoryId: string) {
  return Product.countDocuments({
    categoryId: new Types.ObjectId(categoryId),
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await connectDatabase();

    const { categoryId } = await context.params;

    if (!Types.ObjectId.isValid(categoryId)) {
      return response(
        {
          success: false,
          message: "Identificador de categoria inválido.",
        },
        400,
      );
    }

    const category = await Category.findById(categoryId)
      .select("_id name")
      .lean();

    if (!category) {
      return response(
        {
          success: false,
          message: "Categoria não encontrada.",
        },
        404,
      );
    }

    const productsCount = await countCategoryProducts(categoryId);

    if (productsCount > 0) {
      return response(
        {
          success: false,
          message:
            productsCount === 1
              ? "Esta categoria não pode ser atualizada porque existe 1 produto vinculado a ela. Exclua o produto primeiro."
              : `Esta categoria não pode ser atualizada porque existem ${productsCount} produtos vinculados a ela. Exclua esses produtos primeiro.`,
          productsCount,
        },
        409,
      );
    }

    const body = (await request.json()) as CategoryPayload;

    const name = typeof body.name === "string" ? body.name.trim() : "";

    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    const position = Number(body.position);
    const active = body.active;

    if (name.length < 2 || name.length > 100) {
      return response(
        {
          success: false,
          field: "name",
          message: "O nome deve possuir entre 2 e 100 caracteres.",
        },
        400,
      );
    }

    if (description.length > 500) {
      return response(
        {
          success: false,
          field: "description",
          message: "A descrição deve possuir no máximo 500 caracteres.",
        },
        400,
      );
    }

    if (!Number.isInteger(position) || position < 0) {
      return response(
        {
          success: false,
          field: "position",
          message:
            "A posição deve ser um número inteiro igual ou maior que zero.",
        },
        400,
      );
    }

    if (typeof active !== "boolean") {
      return response(
        {
          success: false,
          field: "active",
          message: "Informe um status válido.",
        },
        400,
      );
    }

    const normalizedName = normalizeName(name);

    const duplicatedCategory = await Category.exists({
      _id: {
        $ne: new Types.ObjectId(categoryId),
      },
      normalizedName,
    });

    if (duplicatedCategory) {
      return response(
        {
          success: false,
          field: "name",
          message: "Já existe uma categoria cadastrada com esse nome.",
        },
        409,
      );
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      {
        $set: {
          name,
          normalizedName,
          description,
          position,
          active,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!updatedCategory) {
      return response(
        {
          success: false,
          message: "Categoria não encontrada.",
        },
        404,
      );
    }

    return response(
      {
        success: true,
        message: "Categoria atualizada com sucesso.",
        category: updatedCategory,
      },
      200,
    );
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);

    return response(
      {
        success: false,
        message: "Não foi possível atualizar a categoria.",
      },
      500,
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await connectDatabase();

    const { categoryId } = await context.params;

    if (!Types.ObjectId.isValid(categoryId)) {
      return response(
        {
          success: false,
          message: "Identificador de categoria inválido.",
        },
        400,
      );
    }

    const category = await Category.findById(categoryId)
      .select("_id name")
      .lean();

    if (!category) {
      return response(
        {
          success: false,
          message: "Categoria não encontrada.",
        },
        404,
      );
    }

    const productsCount = await countCategoryProducts(categoryId);

    if (productsCount > 0) {
      return response(
        {
          success: false,
          message:
            productsCount === 1
              ? "Esta categoria não pode ser excluída porque existe 1 produto vinculado a ela. Exclua o produto primeiro."
              : `Esta categoria não pode ser excluída porque existem ${productsCount} produtos vinculados a ela. Exclua esses produtos primeiro.`,
          productsCount,
        },
        409,
      );
    }

    const deletedCategory = await Category.findByIdAndDelete(categoryId);

    if (!deletedCategory) {
      return response(
        {
          success: false,
          message: "Categoria não encontrada.",
        },
        404,
      );
    }

    return response(
      {
        success: true,
        message: "Categoria excluída com sucesso.",
        category: deletedCategory,
      },
      200,
    );
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);

    return response(
      {
        success: false,
        message: "Não foi possível excluir a categoria.",
      },
      500,
    );
  }
}

import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "@/lib/database";
import Category from "@/models/Category";

interface CreateCategoryBody {
  name?: string;
  description?: string;
  position?: number;
  active?: boolean;
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Erro desconhecido.";
}

function isDuplicateKeyError(error: unknown): error is {
  code: number;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function GET() {
  try {
    await connectDatabase();

    const categories = await Category.find({})
      .sort({
        position: 1,
        createdAt: -1,
      })
      .lean();

    return NextResponse.json(
      {
        success: true,
        count: categories.length,
        categories,
      },
      {
        status: 200,
      },
    );
  } catch (error: unknown) {
    console.error("Erro ao buscar categorias:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível carregar as categorias.",
        error:
          process.env.NODE_ENV === "development"
            ? getErrorMessage(error)
            : undefined,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase();

    const body = (await request.json()) as CreateCategoryBody;

    const name = body.name?.trim();
    const description = body.description?.trim() ?? "";
    const position = Number(body.position ?? 0);
    const active = body.active ?? true;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          field: "name",
          message: "O nome da categoria é obrigatório.",
        },
        {
          status: 400,
        },
      );
    }

    if (name.length < 2) {
      return NextResponse.json(
        {
          success: false,
          field: "name",
          message: "O nome deve possuir pelo menos 2 caracteres.",
        },
        {
          status: 400,
        },
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          field: "name",
          message: "O nome deve possuir no máximo 100 caracteres.",
        },
        {
          status: 400,
        },
      );
    }

    if (description.length > 500) {
      return NextResponse.json(
        {
          success: false,
          field: "description",
          message: "A descrição deve possuir no máximo 500 caracteres.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(position) || position < 0) {
      return NextResponse.json(
        {
          success: false,
          field: "position",
          message:
            "A posição deve ser um número inteiro maior ou igual a zero.",
        },
        {
          status: 400,
        },
      );
    }

    if (typeof active !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          field: "active",
          message: "O status da categoria é inválido.",
        },
        {
          status: 400,
        },
      );
    }

    const normalizedName = normalizeName(name);

    const existingCategory = await Category.findOne({
      normalizedName,
    }).lean();

    if (existingCategory) {
      return NextResponse.json(
        {
          success: false,
          field: "name",
          message: "Já existe uma categoria com esse nome.",
        },
        {
          status: 409,
        },
      );
    }

    const category = await Category.create({
      name,
      normalizedName,
      description,
      position,
      active,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Categoria cadastrada com sucesso.",
        category,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("Erro ao cadastrar categoria:", error);

    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          success: false,
          field: "name",
          message: "Já existe uma categoria com esse nome.",
        },
        {
          status: 409,
        },
      );
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const message = Object.values(error.errors)
        .map((validationError) => validationError.message)
        .join(" ");

      return NextResponse.json(
        {
          success: false,
          message,
        },
        {
          status: 400,
        },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          message: "O corpo da requisição contém um JSON inválido.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível cadastrar a categoria.",
        error:
          process.env.NODE_ENV === "development"
            ? getErrorMessage(error)
            : undefined,
      },
      {
        status: 500,
      },
    );
  }
}

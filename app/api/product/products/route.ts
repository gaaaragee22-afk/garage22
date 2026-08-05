import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";

import {
  deleteCloudinaryImage,
  uploadProductImage,
  type UploadedImage,
} from "@/lib/cloudinary";
import { connectDatabase } from "@/lib/database";

import Category from "@/models/Category";
import Product from "@/models/Product";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ProductQuery {
  active?: boolean;
  featured?: boolean;
  categoryId?: string;
  $or?: Array<Record<string, unknown>>;
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseBoolean(
  value: FormDataEntryValue | null,
  defaultValue: boolean,
): boolean {
  if (typeof value !== "string") {
    return defaultValue;
  }

  return value === "true";
}

function parseNumber(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") {
    return Number.NaN;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return Number.NaN;
  }

  const normalizedValue = trimmedValue.replace(/\./g, "").replace(",", ".");

  return Number(normalizedValue);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Ocorreu um erro inesperado.";
  }
}

export async function GET(request: Request) {
  try {
    await connectDatabase();

    const { searchParams } = new URL(request.url);

    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search")?.trim();
    const active = searchParams.get("active");
    const featured = searchParams.get("featured");

    const query: ProductQuery = {};

    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Categoria inválida.",
          },
          {
            status: 400,
          },
        );
      }

      query.categoryId = categoryId;
    }

    if (active === "true" || active === "false") {
      query.active = active === "true";
    }

    if (featured === "true" || featured === "false") {
      query.featured = featured === "true";
    }

    if (search) {
      const normalizedSearch = normalizeName(search);

      query.$or = [
        {
          normalizedName: {
            $regex: normalizedSearch,
            $options: "i",
          },
        },
        {
          description: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const products = await Product.find(query)
      .populate({
        path: "categoryId",
        select: "name description position active",
      })
      .sort({
        position: 1,
        createdAt: -1,
      })
      .lean();

    return NextResponse.json(
      {
        success: true,
        count: products.length,
        products,
      },
      {
        status: 200,
      },
    );
  } catch (error: unknown) {
    console.error("Erro ao listar produtos:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível carregar os produtos.",
        error: getErrorMessage(error),
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  let uploadedImage: UploadedImage | null = null;

  try {
    await connectDatabase();

    const formData = await request.formData();

    const nameEntry = formData.get("name");
    const descriptionEntry = formData.get("description");
    const categoryIdEntry = formData.get("categoryId");
    const imageEntry = formData.get("image");

    const name = typeof nameEntry === "string" ? nameEntry.trim() : "";

    const description =
      typeof descriptionEntry === "string" ? descriptionEntry.trim() : "";

    const categoryId =
      typeof categoryIdEntry === "string" ? categoryIdEntry.trim() : "";

    const price = parseNumber(formData.get("price"));
    const position = parseNumber(formData.get("position"));

    const promotionalPriceEntry = formData.get("promotionalPrice");

    const promotionalPrice =
      typeof promotionalPriceEntry === "string" && promotionalPriceEntry.trim()
        ? parseNumber(promotionalPriceEntry)
        : null;

    const active = parseBoolean(formData.get("active"), true);

    const featured = parseBoolean(formData.get("featured"), false);

    if (name.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "O nome deve possuir pelo menos 2 caracteres.",
        },
        {
          status: 400,
        },
      );
    }

    if (name.length > 120) {
      return NextResponse.json(
        {
          success: false,
          message: "O nome deve possuir no máximo 120 caracteres.",
        },
        {
          status: 400,
        },
      );
    }

    if (description.length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "A descrição deve possuir pelo menos 10 caracteres.",
        },
        {
          status: 400,
        },
      );
    }

    if (description.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message: "A descrição deve possuir no máximo 2000 caracteres.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Informe um preço válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      promotionalPrice !== null &&
      (!Number.isFinite(promotionalPrice) || promotionalPrice <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Informe um preço promocional válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (promotionalPrice !== null && promotionalPrice >= price) {
      return NextResponse.json(
        {
          success: false,
          message: "O preço promocional deve ser menor que o preço normal.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidObjectId(categoryId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Selecione uma categoria válida.",
        },
        {
          status: 400,
        },
      );
    }

    const category = await Category.findOne({
      _id: categoryId,
      active: true,
    })
      .select("_id")
      .lean();

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "A categoria selecionada não existe ou está desativada.",
        },
        {
          status: 404,
        },
      );
    }

    if (!(imageEntry instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Selecione uma imagem para o produto.",
        },
        {
          status: 400,
        },
      );
    }

    if (imageEntry.size <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "O arquivo de imagem está vazio.",
        },
        {
          status: 400,
        },
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(imageEntry.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Formato de imagem inválido. Utilize JPG, PNG ou WebP.",
        },
        {
          status: 400,
        },
      );
    }

    if (imageEntry.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "A imagem deve possuir no máximo 5 MB.",
        },
        {
          status: 400,
        },
      );
    }

    uploadedImage = await uploadProductImage(imageEntry);

    const product = await Product.create({
      name,
      normalizedName: normalizeName(name),
      description,
      price,
      promotionalPrice,
      categoryId,
      image: uploadedImage,
      active,
      featured,
      position: Number.isInteger(position) && position >= 0 ? position : 0,
    });

    const populatedProduct = await Product.findById(product._id)
      .populate({
        path: "categoryId",
        select: "name description position active",
      })
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Produto cadastrado com sucesso.",
        product: populatedProduct,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);

    console.error("ERRO COMPLETO AO CADASTRAR PRODUTO:", error);

    console.error("MENSAGEM DO ERRO AO CADASTRAR PRODUTO:", errorMessage);

    if (uploadedImage?.publicId) {
      try {
        await deleteCloudinaryImage(uploadedImage.publicId);
      } catch (cloudinaryError: unknown) {
        console.error(
          "Erro ao remover imagem após falha no cadastro:",
          cloudinaryError,
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível cadastrar o produto.",
        error: errorMessage,
      },
      {
        status: 500,
      },
    );
  }
}

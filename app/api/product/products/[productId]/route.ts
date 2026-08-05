import { v2 as cloudinary } from "cloudinary";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDatabase } from "@/lib/database";
import Product from "@/models/Product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface RouteContext {
  params: Promise<{
    productId: string;
  }>;
}

interface ProductImageData {
  url?: string;
  publicId?: string;
  public_id?: string;
  cloudinaryId?: string;
  cloudinary_id?: string;
}

interface ProductDocumentLike {
  image?: ProductImageData | string | null;
}

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  original_filename: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseCurrency(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") {
    return Number.NaN;
  }

  const normalizedValue = value.trim().replace(/\./g, "").replace(",", ".");

  return Number(normalizedValue);
}

function parseBoolean(value: FormDataEntryValue | null): boolean {
  return String(value).toLowerCase() === "true";
}

function getString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function getCloudinaryPublicId(
  image: ProductImageData | string | null | undefined,
): string | null {
  if (!image || typeof image === "string") {
    return null;
  }

  return (
    image.publicId ||
    image.public_id ||
    image.cloudinaryId ||
    image.cloudinary_id ||
    null
  );
}

async function uploadImage(file: File): Promise<CloudinaryUploadResult> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "garage22/products",
        resource_type: "image",

        transformation: [
          {
            width: 1200,
            height: 1200,
            crop: "limit",
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },

      (error, result) => {
        if (error || !result) {
          reject(
            error ?? new Error("Falha ao enviar imagem para o Cloudinary."),
          );

          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,

          original_filename:
            result.original_filename || `produto-${Date.now()}`,

          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      },
    );

    uploadStream.end(buffer);
  });
}

async function removeCloudinaryImage(publicId: string | null): Promise<void> {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch (error) {
    console.error("Não foi possível remover a imagem do Cloudinary:", error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  let uploadedPublicId: string | null = null;

  try {
    await connectDatabase();

    const { productId } = await context.params;

    if (!Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Identificador de produto inválido.",
        },
        {
          status: 400,
        },
      );
    }

    const currentProduct =
      await Product.findById(productId).lean<ProductDocumentLike>();

    if (!currentProduct) {
      return NextResponse.json(
        {
          success: false,
          message: "Produto não encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    const formData = await request.formData();

    const name = getString(formData.get("name"));

    const description = getString(formData.get("description"));

    const categoryId = getString(formData.get("categoryId"));

    const price = parseCurrency(formData.get("price"));

    const promotionalPriceValue = getString(formData.get("promotionalPrice"));

    const promotionalPrice = promotionalPriceValue
      ? parseCurrency(promotionalPriceValue)
      : null;

    const position = Number(getString(formData.get("position")) || "0");

    const active = parseBoolean(formData.get("active"));

    const featured = parseBoolean(formData.get("featured"));

    const imageEntry = formData.get("image");

    const imageFile =
      imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json(
        {
          success: false,
          message: "O nome deve possuir entre 2 e 120 caracteres.",
        },
        {
          status: 400,
        },
      );
    }

    if (description.length < 10 || description.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message: "A descrição deve possuir entre 10 e 2.000 caracteres.",
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
      (!Number.isFinite(promotionalPrice) ||
        promotionalPrice <= 0 ||
        promotionalPrice >= price)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O preço promocional deve ser maior que zero e menor que o preço normal.",
        },
        {
          status: 400,
        },
      );
    }

    if (!categoryId || !Types.ObjectId.isValid(categoryId)) {
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

    if (!Number.isInteger(position) || position < 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A posição deve ser um número inteiro igual ou maior que zero.",
        },
        {
          status: 400,
        },
      );
    }

    if (imageFile) {
      if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
        return NextResponse.json(
          {
            success: false,
            message: "A imagem deve estar no formato JPG, PNG ou WebP.",
          },
          {
            status: 400,
          },
        );
      }

      if (imageFile.size > MAX_IMAGE_SIZE) {
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
    }

    const updateData: Record<string, unknown> = {
      name,
      description,
      price,
      promotionalPrice,

      categoryId: new Types.ObjectId(categoryId),

      position,
      active,
      featured,
    };

    if (imageFile) {
      const uploadedImage = await uploadImage(imageFile);

      uploadedPublicId = uploadedImage.public_id;

      updateData.image = {
        name: `${uploadedImage.original_filename}.${uploadedImage.format}`,

        url: uploadedImage.secure_url,

        publicId: uploadedImage.public_id,

        public_id: uploadedImage.public_id,

        cloudinaryId: uploadedImage.public_id,

        cloudinary_id: uploadedImage.public_id,

        format: uploadedImage.format,

        bytes: uploadedImage.bytes,

        width: uploadedImage.width,

        height: uploadedImage.height,
      };
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,

      {
        $set: updateData,
      },

      {
        returnDocument: "after",
        runValidators: true,
      },
    ).populate("categoryId", "name");

    if (!updatedProduct) {
      await removeCloudinaryImage(uploadedPublicId);

      return NextResponse.json(
        {
          success: false,
          message: "Produto não encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    if (imageFile) {
      const previousPublicId = getCloudinaryPublicId(currentProduct.image);

      if (previousPublicId && previousPublicId !== uploadedPublicId) {
        await removeCloudinaryImage(previousPublicId);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Produto atualizado com sucesso.",

        product: updatedProduct,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    await removeCloudinaryImage(uploadedPublicId);

    console.error("Erro ao atualizar produto:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível atualizar o produto.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await connectDatabase();

    const { productId } = await context.params;

    if (!Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Identificador de produto inválido.",
        },
        {
          status: 400,
        },
      );
    }

    const deletedProduct =
      await Product.findByIdAndDelete(productId).lean<ProductDocumentLike>();

    if (!deletedProduct) {
      return NextResponse.json(
        {
          success: false,
          message: "Produto não encontrado.",
        },
        {
          status: 404,
        },
      );
    }

    const publicId = getCloudinaryPublicId(deletedProduct.image);

    await removeCloudinaryImage(publicId);

    return NextResponse.json(
      {
        success: true,
        message: "Produto excluído com sucesso.",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Erro ao excluir produto:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível excluir o produto.",
      },
      {
        status: 500,
      },
    );
  }
}

import type { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import { v2 as cloudinary } from "cloudinary";

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

function configureCloudinary(): void {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName) {
    throw new Error("A variável CLOUDINARY_CLOUD_NAME não foi configurada.");
  }

  if (!apiKey) {
    throw new Error("A variável CLOUDINARY_API_KEY não foi configurada.");
  }

  if (!apiSecret) {
    throw new Error("A variável CLOUDINARY_API_SECRET não foi configurada.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

function getCloudinaryErrorMessage(
  error: UploadApiErrorResponse | undefined,
): string {
  if (!error) {
    return "Erro desconhecido ao enviar a imagem para o Cloudinary.";
  }

  if (typeof error.message === "string") {
    return error.message;
  }

  return JSON.stringify(error);
}

export async function uploadProductImage(file: File): Promise<UploadedImage> {
  configureCloudinary();

  if (!file) {
    throw new Error("Nenhuma imagem foi recebida.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    throw new Error("Não foi possível ler o conteúdo da imagem.");
  }

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "ecommerce/products",
        resource_type: "image",
        width: 1200,
        height: 1200,
        crop: "limit",
        quality: "auto",
        fetch_format: "auto",
      },
      (
        error: UploadApiErrorResponse | undefined,
        uploadResult: UploadApiResponse | undefined,
      ) => {
        if (error) {
          console.error("Erro retornado pelo Cloudinary:", error);

          reject(
            new Error(
              `Erro no Cloudinary: ${getCloudinaryErrorMessage(error)}`,
            ),
          );

          return;
        }

        if (!uploadResult) {
          reject(
            new Error("O Cloudinary não retornou os dados da imagem enviada."),
          );

          return;
        }

        resolve(uploadResult);
      },
    );

    uploadStream.on("error", (error: Error) => {
      reject(new Error(`Erro no stream do Cloudinary: ${error.message}`));
    });

    uploadStream.end(buffer);
  });

  if (!result.secure_url || !result.public_id) {
    throw new Error("O Cloudinary não retornou a URL ou o publicId da imagem.");
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  if (!publicId) {
    return;
  }

  configureCloudinary();

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch (error: unknown) {
    console.error("Erro ao remover imagem do Cloudinary:", error);
  }
}

export default cloudinary;

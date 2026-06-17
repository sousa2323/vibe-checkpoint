import { createServerFn } from "@tanstack/react-start";
import { requireAuthenticatedUserId } from "./server-auth";
import { ensureMediaBucket, getMediaBucketName, getSupabaseServerClient } from "./supabase-server";
import { timeoutMessage, withTimeout } from "./timeout";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const maxImageBytes = 2 * 1024 * 1024;

type AllowedMimeType = (typeof allowedMimeTypes)[number];

type UploadMediaInput = {
  userId: string;
  mimeType: string;
  base64: string;
};

export function isAllowedImageMimeType(value: string): value is AllowedMimeType {
  return allowedMimeTypes.includes(value as AllowedMimeType);
}

export function assertAllowedPublicMediaUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL de imagem inválida.");
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("SUPABASE_URL ou VITE_SUPABASE_URL não configurada.");

  const allowedHost = new URL(supabaseUrl).host;
  const publicMediaPrefix = `/storage/v1/object/public/${getMediaBucketName()}/`;
  if (
    url.protocol !== "https:" ||
    url.host !== allowedHost ||
    !url.pathname.startsWith(publicMediaPrefix)
  ) {
    throw new Error("Use apenas imagens enviadas pelo ChegaAi.");
  }

  return value;
}

function detectedImageMimeType(bytes: Buffer): AllowedMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export const uploadMedia = createServerFn({ method: "POST" })
  .inputValidator((data: UploadMediaInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);
    if (!isAllowedImageMimeType(data.mimeType)) {
      throw new Error("Envie uma imagem JPG, PNG ou WebP.");
    }

    const cleanBase64 = data.base64.includes(",") ? data.base64.split(",").pop() : data.base64;
    if (!cleanBase64) throw new Error("Imagem inválida.");

    const sizeBytes = Buffer.byteLength(cleanBase64, "base64");
    if (sizeBytes <= 0 || sizeBytes > maxImageBytes) {
      throw new Error("A imagem deve ter até 2MB.");
    }

    const bytes = Buffer.from(cleanBase64, "base64");
    if (detectedImageMimeType(bytes) !== data.mimeType) {
      throw new Error("O arquivo enviado não corresponde ao tipo da imagem.");
    }

    const bucket = await ensureMediaBucket();
    const supabase = getSupabaseServerClient();
    const extension = data.mimeType.split("/")[1] ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await withTimeout(
      supabase.storage.from(bucket).upload(path, bytes, {
        contentType: data.mimeType,
        upsert: false,
      }),
      20000,
      timeoutMessage("enviar a imagem"),
    );
    if (error) throw error;

    const { data: publicUrl } = supabase.storage.from(getMediaBucketName()).getPublicUrl(path);
    return { mediaUrl: publicUrl.publicUrl };
  });

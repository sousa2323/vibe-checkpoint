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

    const bucket = await ensureMediaBucket();
    const supabase = getSupabaseServerClient();
    const extension = data.mimeType.split("/")[1] ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const bytes = Buffer.from(cleanBase64, "base64");

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

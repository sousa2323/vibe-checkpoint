import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { requireAuthenticatedUserId } from "./server-auth";

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

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");

    const rows = await sql`
      INSERT INTO public.media_assets (
        owner_user_id,
        mime_type,
        size_bytes,
        bytes
      )
      VALUES (
        ${userId},
        ${data.mimeType},
        ${sizeBytes},
        decode(${cleanBase64}, 'base64')
      )
      RETURNING id
    `;
    const id = String(rows[0].id);

    return { mediaUrl: `/api/media/${id}` };
  });

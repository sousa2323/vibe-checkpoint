import { getSql } from "./db";

export async function fetchMediaAsset(id: string) {
  const sql = await getSql();
  if (!sql) return null;

  const rows = await sql`
    SELECT mime_type, encode(bytes, 'base64') AS base64
    FROM public.media_assets
    WHERE id = ${id}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  return {
    mimeType: String(row.mime_type),
    bytes: Buffer.from(String(row.base64), "base64"),
  };
}

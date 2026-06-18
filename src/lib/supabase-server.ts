import { createClient } from "@supabase/supabase-js";
import { timeoutMessage, withTimeout } from "./timeout";

const mediaBucketName = "media";

function getSupabaseUrl() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL ou VITE_SUPABASE_URL não configurada.");
  return url;
}

function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  return key;
}

export function getSupabaseServerClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let mediaBucketReady = false;

export async function ensureMediaBucket() {
  // Evita um getBucket no Supabase a cada upload depois que o bucket já existe.
  if (mediaBucketReady) return mediaBucketName;

  const supabase = getSupabaseServerClient();
  const { data: bucket } = await withTimeout(
    supabase.storage.getBucket(mediaBucketName),
    10000,
    timeoutMessage("preparar o envio de imagem"),
  );
  if (bucket) {
    mediaBucketReady = true;
    return mediaBucketName;
  }

  const { error } = await withTimeout(
    supabase.storage.createBucket(mediaBucketName, {
      public: true,
      fileSizeLimit: "2MB",
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    }),
    10000,
    timeoutMessage("preparar o envio de imagem"),
  );

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }

  mediaBucketReady = true;
  return mediaBucketName;
}

export function getMediaBucketName() {
  return mediaBucketName;
}

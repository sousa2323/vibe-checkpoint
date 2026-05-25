import { createClient } from "@supabase/supabase-js";

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

export async function ensureMediaBucket() {
  const supabase = getSupabaseServerClient();
  const { data: bucket } = await supabase.storage.getBucket(mediaBucketName);
  if (bucket) return mediaBucketName;

  const { error } = await supabase.storage.createBucket(mediaBucketName, {
    public: true,
    fileSizeLimit: "2MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }

  return mediaBucketName;
}

export function getMediaBucketName() {
  return mediaBucketName;
}

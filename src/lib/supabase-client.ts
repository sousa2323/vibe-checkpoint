import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

function getSupabaseUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) throw new Error("VITE_SUPABASE_URL não configurada.");
  return url;
}

function getSupabaseAnonKey() {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!key) throw new Error("VITE_SUPABASE_ANON_KEY não configurada.");
  return key;
}

export function getSupabaseAuthStorageKey() {
  const hostname = new URL(getSupabaseUrl()).hostname;
  return `sb-${hostname.split(".")[0]}-auth-token`;
}

export function readSupabaseStoredAccessToken() {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(getSupabaseAuthStorageKey());
    if (!raw) return null;

    const session = JSON.parse(raw) as {
      access_token?: unknown;
      currentSession?: { access_token?: unknown };
      session?: { access_token?: unknown };
    };
    const token =
      session.access_token ?? session.currentSession?.access_token ?? session.session?.access_token;

    return typeof token === "string" && token ? token : null;
  } catch {
    return null;
  }
}

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}

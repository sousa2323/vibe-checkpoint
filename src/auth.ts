import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react";

const fallbackAuthUrl =
  "https://ep-sparkling-sea-acu02pkf.neonauth.sa-east-1.aws.neon.tech/neondb/auth";
const authProxyPath = "/api/auth";

function getBrowserAuthUrl() {
  const configuredUrl = import.meta.env.VITE_NEON_AUTH_PROXY_PATH ?? authProxyPath;
  return new URL(configuredUrl, window.location.origin).toString().replace(/\/+$/, "");
}

function getClientAuthUrl() {
  if (typeof window !== "undefined") {
    return getBrowserAuthUrl();
  }

  const authUrl =
    process.env.NEON_AUTH_URL ??
    process.env.VITE_NEON_AUTH_URL ??
    import.meta.env.VITE_NEON_AUTH_URL;

  if (authUrl) {
    return authUrl;
  }

  if (!import.meta.env.PROD) {
    return fallbackAuthUrl;
  }

  throw new Error("NEON_AUTH_URL não configurada.");
}

export const authClient = createAuthClient(getClientAuthUrl(), {
  adapter: BetterAuthReactAdapter(),
});

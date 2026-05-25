import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react";

export const fallbackAuthUrl =
  "https://ep-sparkling-sea-acu02pkf.neonauth.sa-east-1.aws.neon.tech/neondb/auth";

function getClientAuthUrl() {
  const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
  if (authUrl) return authUrl;
  if (!import.meta.env.PROD) return fallbackAuthUrl;

  throw new Error("VITE_NEON_AUTH_URL não configurada.");
}

export const authClient = createAuthClient(getClientAuthUrl(), {
  adapter: BetterAuthReactAdapter(),
});

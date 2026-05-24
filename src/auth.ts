import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react";

export const fallbackAuthUrl =
  "https://ep-sparkling-sea-acu02pkf.neonauth.sa-east-1.aws.neon.tech/neondb/auth";

export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL || fallbackAuthUrl, {
  adapter: BetterAuthReactAdapter(),
});

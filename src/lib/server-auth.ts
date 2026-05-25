import { getRequestHeaders } from "@tanstack/start-server-core";

const fallbackAuthUrl =
  "https://ep-sparkling-sea-acu02pkf.neonauth.sa-east-1.aws.neon.tech/neondb/auth";
const isProduction = process.env.NODE_ENV === "production";

type AuthSessionPayload = {
  user?: {
    id?: string;
  };
  data?: {
    user?: {
      id?: string;
    };
  };
};

type AuthLookupResult = {
  userId: string | null;
  hadSessionCookie: boolean;
};

function getAuthUrl() {
  const authUrl =
    process.env.NEON_AUTH_URL ??
    process.env.VITE_NEON_AUTH_URL ??
    import.meta.env.VITE_NEON_AUTH_URL;

  if (authUrl) return authUrl;
  if (!isProduction) return fallbackAuthUrl;

  throw new Error("NEON_AUTH_URL não configurada.");
}

function getSessionCookie(cookieHeader: string) {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.split("=")[0]?.includes("session_token"));
}

async function getAuthenticatedUserId(): Promise<AuthLookupResult> {
  const cookieHeader = getRequestHeaders().get("cookie");
  if (!cookieHeader) return { userId: null, hadSessionCookie: false };

  const sessionCookie = getSessionCookie(cookieHeader);
  if (!sessionCookie) return { userId: null, hadSessionCookie: false };

  try {
    const response = await fetch(`${getAuthUrl().replace(/\/+$/, "")}/get-session`, {
      headers: { Cookie: sessionCookie },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return { userId: null, hadSessionCookie: true };

    const payload = (await response.json()) as AuthSessionPayload | null;
    return {
      userId: payload?.user?.id ?? payload?.data?.user?.id ?? null,
      hadSessionCookie: true,
    };
  } catch {
    return { userId: null, hadSessionCookie: true };
  }
}

export async function requireAuthenticatedUserId(expectedUserId?: string) {
  if (!expectedUserId) throw new Error("Usuário não autenticado.");

  const session = await getAuthenticatedUserId();
  if (!session.userId) {
    throw new Error("Usuário não autenticado.");
  }
  const sessionUserId = session.userId;
  if (sessionUserId !== expectedUserId)
    throw new Error("Sessão não corresponde ao usuário informado.");

  return sessionUserId;
}

export async function getOptionalAuthenticatedUserId(expectedUserId?: string) {
  if (!expectedUserId) return null;

  try {
    return await requireAuthenticatedUserId(expectedUserId);
  } catch {
    return null;
  }
}

import { getRequestHeaders } from "@tanstack/start-server-core";
import { supabaseAccessTokenCookie } from "./auth-cookie";
import { getSupabaseServerClient } from "./supabase-server";

type AuthLookupResult = {
  userId: string | null;
  hadSessionCookie: boolean;
};

function getBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function getCookieValue(cookieHeader: string, name: string) {
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.slice(name.length + 1));
}

async function getAuthenticatedUserId(): Promise<AuthLookupResult> {
  const headers = getRequestHeaders();
  const cookieHeader = headers.get("cookie");
  const cookieAccessToken = cookieHeader
    ? getCookieValue(cookieHeader, supabaseAccessTokenCookie)
    : null;
  const bearerAccessToken = getBearerToken(headers.get("authorization"));
  const accessTokens = [bearerAccessToken, cookieAccessToken].filter(
    (token, index, tokens): token is string => Boolean(token) && tokens.indexOf(token) === index,
  );

  if (!accessTokens.length) return { userId: null, hadSessionCookie: false };

  const supabase = getSupabaseServerClient();
  for (const accessToken of accessTokens) {
    try {
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (!error && data.user?.id) return { userId: data.user.id, hadSessionCookie: true };
    } catch {
      // Try the next available token. Bearer takes priority over cookie.
    }
  }

  return { userId: null, hadSessionCookie: true };
}

export async function requireAuthenticatedUserId(expectedUserId?: string) {
  if (!expectedUserId) throw new Error("Usuário não autenticado.");

  const session = await getAuthenticatedUserId();
  if (!session.userId) {
    throw new Error("Usuário não autenticado.");
  }
  const sessionUserId = session.userId;
  if (sessionUserId !== expectedUserId) {
    throw new Error("Sessão não corresponde ao usuário informado.");
  }

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

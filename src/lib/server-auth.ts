import { getRequestHeaders } from "@tanstack/start-server-core";
import { supabaseAccessTokenCookie } from "./auth-cookie";
import { getSupabaseServerClient } from "./supabase-server";

type AuthLookupResult = {
  userId: string | null;
  hadSessionCookie: boolean;
};

function getCookieValue(cookieHeader: string, name: string) {
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.slice(name.length + 1));
}

async function getAuthenticatedUserId(): Promise<AuthLookupResult> {
  const cookieHeader = getRequestHeaders().get("cookie");
  if (!cookieHeader) return { userId: null, hadSessionCookie: false };

  const accessToken = getCookieValue(cookieHeader, supabaseAccessTokenCookie);
  if (!accessToken) return { userId: null, hadSessionCookie: false };

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user?.id) return { userId: null, hadSessionCookie: true };

    return { userId: data.user.id, hadSessionCookie: true };
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

import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabaseAccessTokenCookie } from "./lib/auth-cookie";
import { getSupabaseBrowserClient } from "./lib/supabase-client";

type AuthSessionData = {
  user: Pick<User, "id" | "email" | "user_metadata">;
};

export function getAuthUserName(user: AuthSessionData["user"] | null | undefined) {
  const metadata = user?.user_metadata;
  const name = metadata?.name ?? metadata?.full_name;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
}

function toAuthSessionData(session: Session | null): AuthSessionData | null {
  if (!session?.user) return null;
  return { user: session.user };
}

function writeAccessTokenCookie(session: Session | null) {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (!session?.access_token) {
    document.cookie = `${supabaseAccessTokenCookie}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    return;
  }

  const maxAge = Math.max(0, (session.expires_at ?? 0) - Math.floor(Date.now() / 1000));
  document.cookie = `${supabaseAccessTokenCookie}=${encodeURIComponent(
    session.access_token,
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

async function getCurrentSession() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  writeAccessTokenCookie(data.session);
  return toAuthSessionData(data.session);
}

function useSession() {
  const [data, setData] = useState<AuthSessionData | null>(null);
  const [isPending, setIsPending] = useState(true);

  const refetch = async () => {
    const sessionData = await getCurrentSession();
    setData(sessionData);
    setIsPending(false);
    return { data: sessionData };
  };

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data: sessionResult }) => {
      if (!isMounted) return;
      writeAccessTokenCookie(sessionResult.session);
      setData(toAuthSessionData(sessionResult.session));
      setIsPending(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      writeAccessTokenCookie(session);
      setData(toAuthSessionData(session));
      setIsPending(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { data, isPending, refetch };
}

export const authClient = {
  useSession,
  signIn: {
    email: async ({ email, password }: { email: string; password: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      writeAccessTokenCookie(data.session);
      return { data: toAuthSessionData(data.session) };
    },
  },
  signUp: {
    email: async ({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({ email, password, options });
      if (error) throw error;
      writeAccessTokenCookie(data.session);
      return { data: toAuthSessionData(data.session), needsEmailConfirmation: !data.session };
    },
  },
  resetPassword: {
    email: async ({ email, redirectTo }: { email: string; redirectTo: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      return { data };
    },
  },
  exchangeCodeForSession: async (code: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    writeAccessTokenCookie(data.session);
    return { data: toAuthSessionData(data.session) };
  },
  updatePassword: async ({ password }: { password: string }) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return getCurrentSession();
  },
  signOut: async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    writeAccessTokenCookie(null);
    if (error) throw error;
  },
};

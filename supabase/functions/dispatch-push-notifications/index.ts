// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  route: string;
  target_type: string;
  target_id: string;
  image_url: string | null;
};

type PushTokenRow = {
  token: string;
};

type FirebaseServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-dispatch-secret",
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const dispatchSecret = Deno.env.get("PUSH_DISPATCH_SECRET");
  if (dispatchSecret && request.headers.get("x-dispatch-secret") !== dispatchSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

  if (!supabaseUrl || !serviceRoleKey || !serviceAccountJson) {
    return json(
      {
        error: "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or FIREBASE_SERVICE_ACCOUNT_JSON",
      },
      500,
    );
  }

  let serviceAccount: FirebaseServiceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson) as FirebaseServiceAccount;
  } catch (_error) {
    return json({ error: "Invalid FIREBASE_SERVICE_ACCOUNT_JSON" }, 500);
  }

  if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
    return json({ error: "Incomplete FIREBASE_SERVICE_ACCOUNT_JSON" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id,user_id,title,body,route,target_type,target_id,image_url")
    .is("pushed_at", null)
    .order("created_at", { ascending: true })
    .limit(50)
    .returns<NotificationRow[]>();

  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  let failed = 0;

  for (const notification of notifications ?? []) {
    const { data: tokens, error: tokenError } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", notification.user_id)
      .returns<PushTokenRow[]>();

    if (tokenError || !tokens?.length) {
      failed += 1;
      continue;
    }

    const results = await Promise.all(
      tokens.map(({ token }) => sendFcmNotification(serviceAccount, token, notification)),
    );

    const delivered = results.some((result) => result.ok);
    sent += results.filter((result) => result.ok).length;
    failed += results.filter((result) => !result.ok).length;

    const invalidTokens = results
      .filter((result) => result.invalidToken)
      .map((result) => result.token);

    if (invalidTokens.length > 0) {
      await supabase.from("push_tokens").delete().in("token", invalidTokens);
    }

    if (delivered) {
      await supabase
        .from("notifications")
        .update({ pushed_at: new Date().toISOString() })
        .eq("id", notification.id);
    }
  }

  return json({ sent, failed, notifications: notifications?.length ?? 0 });
});

async function sendFcmNotification(
  serviceAccount: FirebaseServiceAccount,
  token: string,
  notification: NotificationRow,
) {
  const accessToken = await getFirebaseAccessToken(serviceAccount);
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: notification.title,
            body: notification.body,
            image: notification.image_url ?? undefined,
          },
          data: {
            notificationId: notification.id,
            route: notification.route,
            targetType: notification.target_type,
            targetId: notification.target_id,
          },
          android: {
            priority: "HIGH",
            notification: {
              channel_id: "default",
            },
          },
        },
      }),
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorCode = payload?.error?.details?.find((detail: { errorCode?: string }) =>
      Boolean(detail.errorCode),
    )?.errorCode;

    return {
      ok: false,
      token,
      invalidToken: errorCode === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT",
    };
  }

  return {
    ok: Boolean(payload?.name),
    token,
    invalidToken: false,
  };
}

async function getFirebaseAccessToken(serviceAccount: FirebaseServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt - 60 > now) {
    return cachedAccessToken.token;
  }

  const jwt = await createServiceAccountJwt(serviceAccount, now);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error_description ?? "Firebase auth failed");

  cachedAccessToken = {
    token: payload.access_token,
    expiresAt: now + Number(payload.expires_in ?? 3600),
  };

  return cachedAccessToken.token;
}

async function createServiceAccountJwt(serviceAccount: FirebaseServiceAccount, issuedAt: number) {
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: issuedAt + 3600,
  };

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(claims),
  )}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedJwt),
  );

  return `${unsignedJwt}.${base64UrlEncode(signature)}`;
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function base64UrlEncode(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

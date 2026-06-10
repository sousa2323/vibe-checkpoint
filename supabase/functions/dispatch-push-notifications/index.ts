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
  const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

  if (!supabaseUrl || !serviceRoleKey || !fcmServerKey) {
    return json(
      { error: "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or FCM_SERVER_KEY" },
      500,
    );
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
      tokens.map(({ token }) => sendFcmNotification(fcmServerKey, token, notification)),
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
  fcmServerKey: string,
  token: string,
  notification: NotificationRow,
) {
  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${fcmServerKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
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
    }),
  });

  if (!response.ok) return { ok: false, token, invalidToken: false };

  const payload = await response.json().catch(() => null);
  const error = payload?.results?.[0]?.error;

  return {
    ok: Boolean(payload?.success),
    token,
    invalidToken: error === "NotRegistered" || error === "InvalidRegistration",
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { getSupabaseBrowserClient } from "./lib/supabase-client";

type ViteImportMeta = ImportMeta & {
  env?: Record<string, string | undefined>;
};

const serverFnBase = "/_serverFn/";

function getCapacitorServerFnOrigin() {
  return (import.meta as ViteImportMeta).env?.VITE_CAPACITOR_SERVER_FN_ORIGIN?.replace(/\/$/, "");
}

function shouldProxyServerFn(url: URL) {
  return (
    typeof window !== "undefined" &&
    window.location.origin === "https://localhost" &&
    url.origin === window.location.origin &&
    url.pathname.startsWith(serverFnBase)
  );
}

async function capacitorServerFnFetch(input: RequestInfo | URL, init?: RequestInit) {
  if (typeof window === "undefined") {
    return fetch(input, init);
  }

  const inputUrl = input instanceof Request ? input.url : input.toString();
  const requestUrl = new URL(inputUrl, window.location.href);
  const serverFnOrigin = getCapacitorServerFnOrigin();

  if (!serverFnOrigin || !shouldProxyServerFn(requestUrl)) {
    return fetch(input, init);
  }

  const proxiedUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, serverFnOrigin);
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  );
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return fetch(proxiedUrl, {
    ...init,
    credentials: "omit",
    headers,
    mode: "cors",
  });
}

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  serverFns: {
    fetch: capacitorServerFnFetch,
  },
}));

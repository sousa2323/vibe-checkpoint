import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { getSupabaseBrowserClient } from "./lib/supabase-client";

type ViteImportMeta = ImportMeta & {
  env?: Record<string, string | undefined>;
};

const serverFnBase = "/_serverFn/";
const capacitorOrigins = new Set(["https://localhost", "capacitor://localhost"]);
const defaultCapacitorServerFnOrigin = "https://vibe-checkpoint.vercel.app";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  origin: (origin, ctx) =>
    origin === new URL(ctx.request.url).origin || capacitorOrigins.has(origin),
  secFetchSite: (site, ctx) => {
    if (site === "same-origin" || site === "same-site") return true;
    if (site !== "cross-site") return false;

    const origin = ctx.request.headers.get("origin");
    return origin ? capacitorOrigins.has(origin) : false;
  },
});

function getCapacitorServerFnOrigin() {
  return (
    (import.meta as ViteImportMeta).env?.VITE_CAPACITOR_SERVER_FN_ORIGIN?.replace(/\/$/, "") ??
    defaultCapacitorServerFnOrigin
  );
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

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
  serverFns: {
    fetch: capacitorServerFnFetch,
  },
}));

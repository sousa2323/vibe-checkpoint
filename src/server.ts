import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { fetchMediaAsset } from "./lib/media-server";

const fallbackAuthUrl =
  "https://ep-sparkling-sea-acu02pkf.neonauth.sa-east-1.aws.neon.tech/neondb/auth";
const neonAuthCookiePrefix = "__Secure-neon-auth";
const localAuthCookiePrefix = "neon-auth";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function getAuthUrl() {
  const authUrl = process.env.NEON_AUTH_URL ?? process.env.VITE_NEON_AUTH_URL;
  if (authUrl) return authUrl;
  if (process.env.NODE_ENV !== "production") return fallbackAuthUrl;

  throw new Error("NEON_AUTH_URL não configurada.");
}

function getSetCookieHeaders(headers: Headers) {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const cookies = withGetSetCookie.getSetCookie?.();
  if (cookies?.length) return cookies;

  const setCookie = headers.get("set-cookie");
  if (!setCookie) return [];

  return [setCookie];
}

function isInsecureLocalhost(url: URL) {
  return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
}

function toUpstreamAuthCookie(cookie: string) {
  if (cookie.startsWith(`${localAuthCookiePrefix}.`)) {
    return `${neonAuthCookiePrefix}.${cookie.slice(`${localAuthCookiePrefix}.`.length)}`;
  }

  return cookie;
}

function getNeonAuthCookieHeader(headers: Headers) {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return "";

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(
      (cookie) =>
        cookie.startsWith(neonAuthCookiePrefix) || cookie.startsWith(localAuthCookiePrefix),
    )
    .map(toUpstreamAuthCookie)
    .join("; ");
}

function rewriteAuthSetCookie(cookie: string, url: URL, options?: { localAlias?: boolean }) {
  return cookie
    .split(";")
    .map((part) => part.trim())
    .map((part, index) => {
      if (index === 0 && options?.localAlias && part.startsWith(`${neonAuthCookiePrefix}.`)) {
        return `${localAuthCookiePrefix}.${part.slice(`${neonAuthCookiePrefix}.`.length)}`;
      }

      return part;
    })
    .filter((part) => {
      const lowerPart = part.toLowerCase();
      if (lowerPart.startsWith("domain=")) return false;
      if (options?.localAlias && lowerPart === "secure") return false;
      return true;
    })
    .map((part) => {
      if (isInsecureLocalhost(url) && part.toLowerCase() === "samesite=none") {
        return "SameSite=Lax";
      }

      return part;
    })
    .join("; ");
}

function copyAuthResponseHeaders(response: Response, url: URL) {
  const headers = new Headers();
  const passthroughHeaders = [
    "content-type",
    "content-length",
    "content-encoding",
    "cache-control",
    "set-auth-jwt",
    "set-auth-token",
    "x-neon-ret-request-id",
  ];

  for (const header of passthroughHeaders) {
    const value = response.headers.get(header);
    if (value) headers.set(header, value);
  }

  for (const cookie of getSetCookieHeaders(response.headers)) {
    headers.append("set-cookie", rewriteAuthSetCookie(cookie, url));
    if (isInsecureLocalhost(url) && cookie.startsWith(`${neonAuthCookiePrefix}.`)) {
      headers.append("set-cookie", rewriteAuthSetCookie(cookie, url, { localAlias: true }));
    }
  }

  return headers;
}

async function proxyAuthRequest(request: Request, url: URL) {
  const path = url.pathname.replace(/^\/api\/auth\/?/, "");
  const upstreamUrl = new URL(`${getAuthUrl().replace(/\/+$/, "")}/${path}`);
  upstreamUrl.search = url.search;
  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

  const headers = new Headers();
  for (const header of ["user-agent", "authorization", "referer", "content-type"]) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }

  const cookieHeader = getNeonAuthCookieHeader(request.headers);
  if (cookieHeader) headers.set("cookie", cookieHeader);
  headers.set("origin", request.headers.get("origin") ?? url.origin);
  headers.set("x-neon-auth-middleware", "true");

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: copyAuthResponseHeaders(response, url),
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/auth" || url.pathname.startsWith("/api/auth/")) {
        return await proxyAuthRequest(request, url);
      }

      const mediaMatch = url.pathname.match(/^\/api\/media\/([0-9a-f-]{36})$/i);
      if (request.method === "GET" && mediaMatch?.[1]) {
        const asset = await fetchMediaAsset(mediaMatch[1]);
        if (!asset) return new Response("Not found", { status: 404 });

        return new Response(asset.bytes, {
          headers: {
            "content-type": asset.mimeType,
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};

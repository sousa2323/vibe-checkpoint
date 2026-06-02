import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

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

function getAllowedCorsOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin === "https://localhost" || origin === "capacitor://localhost") {
    return origin;
  }
  return null;
}

function withCors(request: Request, response: Response): Response {
  const origin = getAllowedCorsOrigin(request);
  if (!origin) return response;

  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set(
    "access-control-allow-headers",
    "authorization, content-type, x-tsr-serverfn, x-tss-raw-response, x-tss-serialized",
  );
  headers.set("access-control-expose-headers", "x-tss-raw-response, x-tss-serialized");
  headers.append("vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function corsPreflightResponse(request: Request): Response | null {
  if (request.method !== "OPTIONS" || !getAllowedCorsOrigin(request)) {
    return null;
  }

  return withCors(request, new Response(null, { status: 204 }));
}

async function privacyExportResponse(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/privacy/export") return null;

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Método não permitido." }), {
      status: 405,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const userId = url.searchParams.get("userId") ?? "";
  const email = url.searchParams.get("email") || undefined;
  const name = url.searchParams.get("name") || undefined;
  const accountType = url.searchParams.get("accountType") || undefined;
  const mode = url.searchParams.get("mode");

  try {
    const [{ buildUserDataExport }, { requireAuthenticatedUserIdFromHeaders }] = await Promise.all([
      import("./lib/privacy-export.server"),
      import("./lib/server-auth"),
    ]);
    const authenticatedUserId = await requireAuthenticatedUserIdFromHeaders(
      request.headers,
      userId,
    );
    const payload = await buildUserDataExport(
      { userId, email, name, accountType },
      authenticatedUserId,
    );
    const fileName = `chegaai-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
    const headers = new Headers({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
    });

    if (mode !== "view") {
      headers.set("content-disposition", `attachment; filename="${fileName}"`);
    }

    return new Response(JSON.stringify(payload, null, 2), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível exportar os dados.";
    return new Response(JSON.stringify({ error: message }), {
      status: message.includes("autenticado") || message.includes("Sessão") ? 401 : 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, no-store, max-age=0",
      },
    });
  }
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
      const preflightResponse = corsPreflightResponse(request);
      if (preflightResponse) return preflightResponse;

      const exportResponse = await privacyExportResponse(request);
      if (exportResponse) return withCors(request, exportResponse);

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withCors(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return withCors(request, brandedErrorResponse());
    }
  },
};

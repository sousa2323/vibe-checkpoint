import { createServerFn } from "@tanstack/react-start";
import type { SqlClient } from "./db";

type AdminInput = {
  userId: string;
};

type UpdatePrivacyRequestInput = AdminInput & {
  requestId: string;
  status: PrivacyRequestStatus;
  internalNote?: string;
};

export type PrivacyRequestStatus = "pending" | "in_review" | "resolved" | "rejected";

export type AdminDashboard = {
  admin: {
    userId: string;
    role: string;
    displayName: string | null;
    email: string | null;
  };
  metrics: {
    users: number;
    venues: number;
    events: number;
    privacyPending: number;
  };
  privacyRequests: PrivacyRequestSummary[];
  recentUsers: AdminUserSummary[];
};

export type PrivacyRequestSummary = {
  id: string;
  userId: string;
  requestType: string;
  email: string | null;
  reason: string | null;
  status: PrivacyRequestStatus;
  internalNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type AdminUserSummary = {
  userId: string;
  accountType: string | null;
  displayName: string | null;
  email: string | null;
  createdAt: string | null;
};

export const getAdminDashboard = createServerFn({ method: "GET" })
  .inputValidator((data: AdminInput) => data)
  .handler(async ({ data }): Promise<AdminDashboard> => {
    const { userId, role, sql } = await requireAdmin(data.userId);

    const [
      adminRows,
      userRows,
      venueRows,
      eventRows,
      privacyPendingRows,
      privacyRows,
      recentUserRows,
    ] = await Promise.all([
      sql`
          SELECT up.display_name, au.email
          FROM auth.users au
          LEFT JOIN public.user_profiles up ON up.user_id = au.id::text
          WHERE au.id = ${userId}
          LIMIT 1
        `,
      sql`SELECT COUNT(*)::int AS count FROM public.user_profiles`,
      sql`SELECT COUNT(*)::int AS count FROM public.venues`,
      sql`SELECT COUNT(*)::int AS count FROM public.events`,
      sql`SELECT COUNT(*)::int AS count FROM public.privacy_requests WHERE status = 'pending'`,
      sql`
          SELECT id, user_id, request_type, email, reason, status, internal_note, created_at, resolved_at
          FROM public.privacy_requests
          ORDER BY created_at DESC
          LIMIT 30
        `,
      sql`
          SELECT up.user_id, up.account_type, up.display_name, au.email, up.created_at
          FROM public.user_profiles up
          LEFT JOIN auth.users au ON au.id = up.user_id::uuid
          ORDER BY up.created_at DESC NULLS LAST
          LIMIT 8
        `,
    ]);

    return {
      admin: {
        userId,
        role,
        displayName: nullableString(adminRows[0]?.display_name),
        email: nullableString(adminRows[0]?.email),
      },
      metrics: {
        users: readCount(userRows),
        venues: readCount(venueRows),
        events: readCount(eventRows),
        privacyPending: readCount(privacyPendingRows),
      },
      privacyRequests: privacyRows.map(toPrivacyRequest),
      recentUsers: recentUserRows.map(toAdminUser),
    };
  });

export const getAdminAccess = createServerFn({ method: "GET" })
  .inputValidator((data: AdminInput) => data)
  .handler(async ({ data }) => {
    try {
      const { userId, role } = await requireAdmin(data.userId);
      return { isAdmin: true, userId, role };
    } catch {
      return { isAdmin: false, userId: data.userId, role: null };
    }
  });

export const updatePrivacyRequestStatus = createServerFn({ method: "POST" })
  .inputValidator((data: UpdatePrivacyRequestInput) => data)
  .handler(async ({ data }) => {
    const { userId, sql } = await requireAdmin(data.userId);
    const nextStatus = normalizePrivacyStatus(data.status);
    const note = data.internalNote?.trim() || null;
    const resolvedAt = nextStatus === "resolved" || nextStatus === "rejected" ? new Date() : null;

    const rows = await sql`
      UPDATE public.privacy_requests
      SET status = ${nextStatus},
          internal_note = ${note},
          resolved_at = ${resolvedAt}
      WHERE id = ${data.requestId}
      RETURNING id, user_id, request_type, email, reason, status, internal_note, created_at, resolved_at
    `;

    if (!rows[0]) throw new Error("Pedido LGPD não encontrado.");

    await sql`
      INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, metadata)
      VALUES (${userId}, 'privacy_request_status_updated', 'privacy_request', ${data.requestId}, ${JSON.stringify({ status: nextStatus, hasNote: Boolean(note) })}::jsonb)
    `;

    return toPrivacyRequest(rows[0]);
  });

async function requireAdmin(expectedUserId: string) {
  const [{ getSql }, { requireAuthenticatedUserId }] = await Promise.all([
    import("./db"),
    import("./server-auth"),
  ]);
  const userId = await requireAuthenticatedUserId(expectedUserId);
  const sql = await getSql();
  if (!sql) throw new Error("DATABASE_URL não configurada para o painel admin.");

  await ensureAdminSchema(sql);

  const envAdminIds = new Set(
    (process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  if (envAdminIds.has(userId)) return { userId, role: "admin", sql };

  const rows = await sql`
    SELECT role
    FROM public.admin_users
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  const role = rows[0]?.role;
  if (typeof role !== "string") throw new Error("Acesso admin não autorizado.");

  return { userId, role, sql };
}

async function ensureAdminSchema(sql: SqlClient) {
  await sql`
    CREATE TABLE IF NOT EXISTS public.admin_users (
      user_id uuid PRIMARY KEY,
      role text NOT NULL DEFAULT 'admin',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS public.privacy_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      request_type text NOT NULL,
      email text,
      reason text,
      status text NOT NULL DEFAULT 'pending',
      internal_note text,
      created_at timestamptz NOT NULL DEFAULT now(),
      resolved_at timestamptz
    )
  `;

  await sql`ALTER TABLE public.privacy_requests ADD COLUMN IF NOT EXISTS internal_note text`;

  await sql`
    CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id uuid NOT NULL,
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id text,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

function normalizePrivacyStatus(status: string): PrivacyRequestStatus {
  if (["pending", "in_review", "resolved", "rejected"].includes(status)) {
    return status as PrivacyRequestStatus;
  }
  throw new Error("Status LGPD inválido.");
}

function readCount(rows: Record<string, unknown>[]) {
  const value = rows[0]?.count;
  return typeof value === "number" ? value : Number(value ?? 0);
}

function toPrivacyRequest(row: Record<string, unknown>): PrivacyRequestSummary {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    requestType: String(row.request_type),
    email: nullableString(row.email),
    reason: nullableString(row.reason),
    status: normalizePrivacyStatus(String(row.status)),
    internalNote: nullableString(row.internal_note),
    createdAt: stringifyDate(row.created_at),
    resolvedAt: row.resolved_at ? stringifyDate(row.resolved_at) : null,
  };
}

function toAdminUser(row: Record<string, unknown>): AdminUserSummary {
  return {
    userId: String(row.user_id),
    accountType: nullableString(row.account_type),
    displayName: nullableString(row.display_name),
    email: nullableString(row.email),
    createdAt: row.created_at ? stringifyDate(row.created_at) : null,
  };
}

function nullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function stringifyDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : String(value ?? "");
}

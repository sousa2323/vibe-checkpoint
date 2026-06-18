import { createServerFn } from "@tanstack/react-start";
import { uniqueSlug, type SqlClient } from "./db";

type AdminInput = {
  userId: string;
};

type UpdatePrivacyRequestInput = AdminInput & {
  requestId: string;
  status: PrivacyRequestStatus;
  internalNote?: string;
};

type UpdateVenueApprovalInput = AdminInput & {
  requestId: string;
  status: VenueApprovalStatus;
  internalNote?: string;
};

type AdminUsersInput = AdminInput & {
  query?: string;
};

type AdminUserDetailInput = AdminInput & {
  targetUserId: string;
};

export type PrivacyRequestStatus = "pending" | "in_review" | "resolved" | "rejected";

export type VenueApprovalStatus = "pending" | "approved" | "rejected";

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
    venueApprovalsPending: number;
  };
  privacyRequests: PrivacyRequestSummary[];
  venueApprovals: VenueApprovalSummary[];
  recentUsers: AdminUserSummary[];
  auditLogs: AdminAuditLogSummary[];
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
  avatarUrl: string | null;
  email: string | null;
  createdAt: string | null;
  lastActivityAt: string | null;
};

export type VenueApprovalSummary = {
  id: string;
  userId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  venueName: string;
  businessRole: string;
  category: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  address: string | null;
  whatsapp: string | null;
  instagram: string | null;
  capacity: number | null;
  description: string | null;
  coverImageUrl: string | null;
  status: VenueApprovalStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type AdminUserDetail = {
  profile: AdminUserSummary & {
    onboardingCompleted: boolean;
  };
  counts: {
    savedEvents: number;
    checkins: number;
    reviews: number;
    posts: number;
    comments: number;
    groupPlans: number;
    ownedVenues: number;
    ownedEvents: number;
    privacyRequests: number;
  };
  savedEvents: AdminNamedItem[];
  checkins: AdminNamedItem[];
  reviews: AdminTextItem[];
  posts: AdminTextItem[];
  comments: AdminTextItem[];
  groupPlans: AdminTextItem[];
  ownedVenues: AdminNamedItem[];
  ownedEvents: AdminNamedItem[];
  privacyRequests: PrivacyRequestSummary[];
};

export type AdminNamedItem = {
  id: string;
  label: string;
  helper: string | null;
  createdAt: string | null;
};

export type AdminTextItem = AdminNamedItem & {
  text: string | null;
};

export type AdminAuditLogSummary = {
  id: string;
  adminUserId: string;
  adminName: string | null;
  adminEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  createdAt: string;
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
      venueApprovalPendingRows,
      privacyRows,
      venueApprovalRows,
      recentUserRows,
      auditRows,
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
      sql`SELECT COUNT(*)::int AS count FROM public.venue_claim_requests WHERE status = 'pending'`,
      sql`
          SELECT id, user_id, request_type, email, reason, status, internal_note, created_at, resolved_at
          FROM public.privacy_requests
          ORDER BY created_at DESC
          LIMIT 30
        `,
      venueApprovalQuery(sql),
      sql`
          SELECT up.user_id, up.account_type, up.display_name, up.avatar_url, au.email, up.created_at,
            GREATEST(
              up.updated_at,
              up.created_at,
              (SELECT MAX(created_at) FROM public.checkins WHERE user_id = up.user_id),
              (SELECT MAX(created_at) FROM public.saved_events WHERE user_id = up.user_id),
              (SELECT MAX(created_at) FROM public.event_reviews WHERE user_id = up.user_id),
              (SELECT MAX(created_at) FROM public.user_posts WHERE user_id = up.user_id),
              (SELECT MAX(created_at) FROM public.user_post_comments WHERE user_id = up.user_id)
            ) AS last_activity_at
          FROM public.user_profiles up
          LEFT JOIN auth.users au ON au.id = up.user_id::uuid
          ORDER BY up.created_at DESC NULLS LAST
          LIMIT 8
        `,
      auditLogQuery(sql),
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
        venueApprovalsPending: readCount(venueApprovalPendingRows),
      },
      privacyRequests: privacyRows.map(toPrivacyRequest),
      venueApprovals: venueApprovalRows.map(toVenueApproval),
      recentUsers: recentUserRows.map(toAdminUser),
      auditLogs: auditRows.map(toAdminAuditLog),
    };
  });

export const getAdminUsers = createServerFn({ method: "GET" })
  .inputValidator((data: AdminUsersInput) => data)
  .handler(async ({ data }): Promise<AdminUserSummary[]> => {
    const { sql } = await requireAdmin(data.userId);
    const search = data.query?.trim() ? `%${data.query.trim()}%` : null;
    const rows = await sql`
      SELECT up.user_id, up.account_type, up.display_name, up.avatar_url, au.email, up.created_at,
        GREATEST(
          up.updated_at,
          up.created_at,
          (SELECT MAX(created_at) FROM public.checkins WHERE user_id = up.user_id),
          (SELECT MAX(created_at) FROM public.saved_events WHERE user_id = up.user_id),
          (SELECT MAX(created_at) FROM public.event_reviews WHERE user_id = up.user_id),
          (SELECT MAX(created_at) FROM public.user_posts WHERE user_id = up.user_id),
          (SELECT MAX(created_at) FROM public.user_post_comments WHERE user_id = up.user_id)
        ) AS last_activity_at
      FROM public.user_profiles up
      LEFT JOIN auth.users au ON au.id = up.user_id::uuid
      WHERE ${search}::text IS NULL
        OR up.display_name ILIKE ${search}
        OR au.email ILIKE ${search}
        OR up.account_type ILIKE ${search}
      ORDER BY up.created_at DESC NULLS LAST
      LIMIT 50
    `;

    return rows.map(toAdminUser);
  });

export const getAdminUserDetail = createServerFn({ method: "GET" })
  .inputValidator((data: AdminUserDetailInput) => data)
  .handler(async ({ data }): Promise<AdminUserDetail> => {
    const { userId, sql } = await requireAdmin(data.userId);
    const targetUserId = data.targetUserId;

    const [profileRows, savedRows, checkinRows, reviewRows, postRows, commentRows] =
      await Promise.all([
        sql`
          SELECT up.user_id, up.account_type, up.display_name, up.avatar_url, up.onboarding_completed,
            au.email, up.created_at,
            GREATEST(up.updated_at, up.created_at) AS last_activity_at
          FROM public.user_profiles up
          LEFT JOIN auth.users au ON au.id = up.user_id::uuid
          WHERE up.user_id = ${targetUserId}
          LIMIT 1
        `,
        sql`
          SELECT se.event_id AS id, e.title AS label, v.name AS helper, se.created_at
          FROM public.saved_events se
          LEFT JOIN public.events e ON e.id = se.event_id
          LEFT JOIN public.venues v ON v.id = e.venue_id
          WHERE se.user_id = ${targetUserId}
          ORDER BY se.created_at DESC
          LIMIT 8
        `,
        sql`
          SELECT c.id, COALESCE(e.title, v.name, 'Check-in') AS label, v.name AS helper, c.created_at
          FROM public.checkins c
          LEFT JOIN public.events e ON e.id = c.event_id
          LEFT JOIN public.venues v ON v.id = c.venue_id
          WHERE c.user_id = ${targetUserId}
          ORDER BY c.created_at DESC
          LIMIT 8
        `,
        sql`
          SELECT er.id, COALESCE(e.title, 'Avaliação') AS label, er.comment AS text, er.created_at
          FROM public.event_reviews er
          LEFT JOIN public.events e ON e.id = er.event_id
          WHERE er.user_id = ${targetUserId}
          ORDER BY er.created_at DESC
          LIMIT 8
        `,
        sql`
          SELECT p.id, COALESCE(v.name, e.title, 'Post') AS label, p.caption AS text, p.created_at
          FROM public.user_posts p
          LEFT JOIN public.venues v ON v.id = p.venue_id
          LEFT JOIN public.events e ON e.id = p.event_id
          WHERE p.user_id = ${targetUserId}
          ORDER BY p.created_at DESC
          LIMIT 8
        `,
        sql`
          SELECT pc.id, COALESCE(p.caption, 'Comentário') AS label, pc.body AS text, pc.created_at
          FROM public.user_post_comments pc
          LEFT JOIN public.user_posts p ON p.id = pc.post_id
          WHERE pc.user_id = ${targetUserId}
          ORDER BY pc.created_at DESC
          LIMIT 8
        `,
      ]);

    if (!profileRows[0]) throw new Error("Usuário não encontrado.");

    const [groupRows, venueRows, eventRows, privacyRows, countRows] = await Promise.all([
      sql`
        SELECT id, title AS label, description AS text, created_at
        FROM public.group_plans
        WHERE creator_user_id = ${targetUserId}
        ORDER BY created_at DESC
        LIMIT 8
      `,
      sql`
        SELECT id, name AS label, neighborhood AS helper, created_at
        FROM public.venues
        WHERE owner_user_id = ${targetUserId}
        ORDER BY created_at DESC
        LIMIT 8
      `,
      sql`
        SELECT e.id, e.title AS label, v.name AS helper, e.created_at
        FROM public.events e
        JOIN public.venues v ON v.id = e.venue_id
        WHERE v.owner_user_id = ${targetUserId}
        ORDER BY e.created_at DESC
        LIMIT 8
      `,
      sql`
        SELECT id, user_id, request_type, email, reason, status, internal_note, created_at, resolved_at
        FROM public.privacy_requests
        WHERE user_id = ${targetUserId}::uuid
        ORDER BY created_at DESC
      `,
      sql`
        SELECT
          (SELECT COUNT(*)::int FROM public.saved_events WHERE user_id = ${targetUserId}) AS saved_events,
          (SELECT COUNT(*)::int FROM public.checkins WHERE user_id = ${targetUserId}) AS checkins,
          (SELECT COUNT(*)::int FROM public.event_reviews WHERE user_id = ${targetUserId}) AS reviews,
          (SELECT COUNT(*)::int FROM public.user_posts WHERE user_id = ${targetUserId}) AS posts,
          (SELECT COUNT(*)::int FROM public.user_post_comments WHERE user_id = ${targetUserId}) AS comments,
          (SELECT COUNT(*)::int FROM public.group_plans WHERE creator_user_id = ${targetUserId}) AS group_plans,
          (SELECT COUNT(*)::int FROM public.venues WHERE owner_user_id = ${targetUserId}) AS owned_venues,
          (SELECT COUNT(*)::int FROM public.events e JOIN public.venues v ON v.id = e.venue_id WHERE v.owner_user_id = ${targetUserId}) AS owned_events,
          (SELECT COUNT(*)::int FROM public.privacy_requests WHERE user_id = ${targetUserId}::uuid) AS privacy_requests
      `,
    ]);

    await insertAuditLog(sql, userId, "user_detail_opened", "user", targetUserId, {});

    const counts = countRows[0] ?? {};
    return {
      profile: {
        ...toAdminUser(profileRows[0]),
        avatarUrl: nullableString(profileRows[0].avatar_url),
        onboardingCompleted: Boolean(profileRows[0].onboarding_completed),
      },
      counts: {
        savedEvents: Number(counts.saved_events ?? 0),
        checkins: Number(counts.checkins ?? 0),
        reviews: Number(counts.reviews ?? 0),
        posts: Number(counts.posts ?? 0),
        comments: Number(counts.comments ?? 0),
        groupPlans: Number(counts.group_plans ?? 0),
        ownedVenues: Number(counts.owned_venues ?? 0),
        ownedEvents: Number(counts.owned_events ?? 0),
        privacyRequests: Number(counts.privacy_requests ?? 0),
      },
      savedEvents: savedRows.map(toNamedItem),
      checkins: checkinRows.map(toNamedItem),
      reviews: reviewRows.map(toTextItem),
      posts: postRows.map(toTextItem),
      comments: commentRows.map(toTextItem),
      groupPlans: groupRows.map(toTextItem),
      ownedVenues: venueRows.map(toNamedItem),
      ownedEvents: eventRows.map(toNamedItem),
      privacyRequests: privacyRows.map(toPrivacyRequest),
    };
  });

export const getAdminAuditLogs = createServerFn({ method: "GET" })
  .inputValidator((data: AdminInput) => data)
  .handler(async ({ data }): Promise<AdminAuditLogSummary[]> => {
    const { sql } = await requireAdmin(data.userId);
    const rows = await auditLogQuery(sql);
    return rows.map(toAdminAuditLog);
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

    await insertAuditLog(
      sql,
      userId,
      "privacy_request_status_updated",
      "privacy_request",
      data.requestId,
      {
        status: nextStatus,
        hasNote: Boolean(note),
      },
    );

    return toPrivacyRequest(rows[0]);
  });

export const updateVenueApprovalStatus = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateVenueApprovalInput) => data)
  .handler(async ({ data }) => {
    const { userId, sql } = await requireAdmin(data.userId);
    const nextStatus = normalizeVenueApprovalStatus(data.status);
    const note = data.internalNote?.trim() || null;

    if (nextStatus === "approved") {
      const requestRows = await sql`
        SELECT *
        FROM public.venue_claim_requests
        WHERE id = ${data.requestId}
        LIMIT 1
      `;
      const request = requestRows[0];
      if (!request) throw new Error("Solicitação de estabelecimento não encontrada.");

      const targetUserId = String(request.user_id);
      const existingVenueRows = await sql`
        SELECT id
        FROM public.venues
        WHERE owner_user_id = ${targetUserId}
        ORDER BY created_at ASC
        LIMIT 1
      `;

      let venueId = existingVenueRows[0]?.id ? String(existingVenueRows[0].id) : null;
      if (venueId) {
        await sql`
          UPDATE public.venues
          SET
            name = ${String(request.venue_name).trim()},
            business_role = ${String(request.business_role).trim()},
            neighborhood = ${nullableString(request.neighborhood) ?? "São Paulo"},
            city = ${nullableString(request.city) ?? "São Paulo"},
            state = ${nullableString(request.state) ?? "SP"},
            address = ${nullableString(request.address)},
            description = ${nullableString(request.description)},
            category = ${nullableString(request.category)},
            instagram = ${nullableString(request.instagram)},
            whatsapp = ${nullableString(request.whatsapp) ?? nullableString(request.phone)},
            capacity = ${request.capacity == null ? null : Number(request.capacity)},
            latitude = COALESCE(${request.latitude == null ? null : Number(request.latitude)}, latitude),
            longitude = COALESCE(${request.longitude == null ? null : Number(request.longitude)}, longitude),
            cover_image_url = COALESCE(${nullableString(request.cover_image_url)}, cover_image_url),
            updated_at = now()
          WHERE id = ${venueId}
        `;
      } else {
        const slug = await uniqueSlug(sql, "venues", String(request.venue_name));
        const venueRows = await sql`
          INSERT INTO public.venues (
            owner_user_id,
            name,
            slug,
            business_role,
            neighborhood,
            city,
            state,
            address,
            description,
            category,
            instagram,
            whatsapp,
            capacity,
            latitude,
            longitude,
            cover_image_url
          )
          VALUES (
            ${targetUserId},
            ${String(request.venue_name).trim()},
            ${slug},
            ${String(request.business_role).trim()},
            ${nullableString(request.neighborhood) ?? "São Paulo"},
            ${nullableString(request.city) ?? "São Paulo"},
            ${nullableString(request.state) ?? "SP"},
            ${nullableString(request.address)},
            ${nullableString(request.description)},
            ${nullableString(request.category)},
            ${nullableString(request.instagram)},
            ${nullableString(request.whatsapp) ?? nullableString(request.phone)},
            ${request.capacity == null ? null : Number(request.capacity)},
            ${request.latitude == null ? null : Number(request.latitude)},
            ${request.longitude == null ? null : Number(request.longitude)},
            ${nullableString(request.cover_image_url)}
          )
          RETURNING id
        `;
        venueId = String(venueRows[0].id);
      }

      await sql`
        INSERT INTO public.user_profiles (user_id, account_type, onboarding_completed)
        VALUES (${targetUserId}, 'owner', true)
        ON CONFLICT (user_id) DO UPDATE SET
          account_type = 'owner',
          onboarding_completed = true,
          updated_at = now()
      `;

      await sql`
        UPDATE public.venue_claim_requests
        SET status = 'approved',
            review_note = ${note},
            reviewed_by = ${userId},
            reviewed_at = now(),
            approved_venue_id = ${venueId},
            updated_at = now()
        WHERE id = ${data.requestId}
      `;

      await insertAuditLog(
        sql,
        userId,
        "venue_approval_approved",
        "venue_claim_request",
        data.requestId,
        {
          targetUserId,
          venueId,
        },
      );
    } else {
      const rows = await sql`
        UPDATE public.venue_claim_requests
        SET status = 'rejected',
            review_note = ${note},
            reviewed_by = ${userId},
            reviewed_at = now(),
            updated_at = now()
        WHERE id = ${data.requestId}
        RETURNING user_id
      `;
      if (!rows[0]) throw new Error("Solicitação de estabelecimento não encontrada.");

      await insertAuditLog(
        sql,
        userId,
        "venue_approval_rejected",
        "venue_claim_request",
        data.requestId,
        {
          targetUserId: String(rows[0].user_id),
          hasNote: Boolean(note),
        },
      );
    }

    const rows = await venueApprovalQuery(sql, data.requestId);
    return toVenueApproval(rows[0]);
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

function auditLogQuery(sql: SqlClient) {
  return sql`
    SELECT l.id, l.admin_user_id, up.display_name AS admin_name, au.email AS admin_email,
      l.action, l.entity_type, l.entity_id, l.created_at,
      COALESCE(target_user.display_name, target_auth.email, privacy_user.display_name, privacy_auth.email) AS entity_label
    FROM public.admin_audit_logs l
    LEFT JOIN public.user_profiles up ON up.user_id = l.admin_user_id::text
    LEFT JOIN auth.users au ON au.id = l.admin_user_id
    LEFT JOIN public.user_profiles target_user ON l.entity_type = 'user' AND target_user.user_id = l.entity_id
    LEFT JOIN auth.users target_auth ON l.entity_type = 'user' AND target_auth.id = l.entity_id::uuid
    LEFT JOIN public.privacy_requests pr ON l.entity_type = 'privacy_request' AND pr.id::text = l.entity_id
    LEFT JOIN public.user_profiles privacy_user ON privacy_user.user_id = pr.user_id::text
    LEFT JOIN auth.users privacy_auth ON privacy_auth.id = pr.user_id
    ORDER BY l.created_at DESC
    LIMIT 50
  `;
}

function venueApprovalQuery(sql: SqlClient, requestId?: string) {
  return sql`
    SELECT vcr.id, vcr.user_id, vcr.venue_name, vcr.business_role, vcr.category, vcr.city,
      vcr.state, vcr.neighborhood, vcr.address, vcr.whatsapp, vcr.instagram, vcr.capacity,
      vcr.description, vcr.cover_image_url, vcr.status, vcr.review_note, vcr.created_at,
      vcr.updated_at, up.display_name AS requester_name, au.email AS requester_email
    FROM public.venue_claim_requests vcr
    LEFT JOIN public.user_profiles up ON up.user_id = vcr.user_id
    LEFT JOIN auth.users au ON au.id::text = vcr.user_id
    WHERE ${requestId ?? null}::text IS NULL OR vcr.id::text = ${requestId ?? null}::text
    ORDER BY
      CASE vcr.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
      vcr.created_at DESC
    LIMIT ${requestId ? 1 : 40}
  `;
}

async function insertAuditLog(
  sql: SqlClient,
  adminUserId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown>,
) {
  await sql`
    INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, metadata)
    VALUES (${adminUserId}, ${action}, ${entityType}, ${entityId}, ${JSON.stringify(metadata)}::jsonb)
  `;
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

  await sql`ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY`;

  await ensureVenueApprovalSchema(sql);

  await sql`DROP POLICY IF EXISTS "No direct access to admin users" ON public.admin_users`;
  await sql`DROP POLICY IF EXISTS "No direct access to privacy requests" ON public.privacy_requests`;
  await sql`DROP POLICY IF EXISTS "No direct access to admin audit logs" ON public.admin_audit_logs`;

  await sql`
    CREATE POLICY "No direct access to admin users"
      ON public.admin_users
      FOR ALL
      USING (false)
      WITH CHECK (false)
  `;
  await sql`
    CREATE POLICY "No direct access to privacy requests"
      ON public.privacy_requests
      FOR ALL
      USING (false)
      WITH CHECK (false)
  `;
  await sql`
    CREATE POLICY "No direct access to admin audit logs"
      ON public.admin_audit_logs
      FOR ALL
      USING (false)
      WITH CHECK (false)
  `;

  await sql`REVOKE ALL ON TABLE public.admin_users FROM anon, authenticated`;
  await sql`REVOKE ALL ON TABLE public.privacy_requests FROM anon, authenticated`;
  await sql`REVOKE ALL ON TABLE public.admin_audit_logs FROM anon, authenticated`;
}

async function ensureVenueApprovalSchema(sql: SqlClient) {
  await sql`
    ALTER TABLE public.venue_claim_requests
    ADD COLUMN IF NOT EXISTS category text,
    ADD COLUMN IF NOT EXISTS city text,
    ADD COLUMN IF NOT EXISTS state text,
    ADD COLUMN IF NOT EXISTS instagram text,
    ADD COLUMN IF NOT EXISTS whatsapp text,
    ADD COLUMN IF NOT EXISTS capacity integer,
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS latitude double precision,
    ADD COLUMN IF NOT EXISTS longitude double precision,
    ADD COLUMN IF NOT EXISTS cover_image_url text,
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS review_note text,
    ADD COLUMN IF NOT EXISTS reviewed_by text,
    ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
    ADD COLUMN IF NOT EXISTS approved_venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS venue_claim_requests_status_created_idx
      ON public.venue_claim_requests (status, created_at DESC)
  `;
}

function normalizePrivacyStatus(status: string): PrivacyRequestStatus {
  if (["pending", "in_review", "resolved", "rejected"].includes(status)) {
    return status as PrivacyRequestStatus;
  }
  throw new Error("Status LGPD inválido.");
}

function normalizeVenueApprovalStatus(status: string): VenueApprovalStatus {
  if (["pending", "approved", "rejected"].includes(status)) {
    return status as VenueApprovalStatus;
  }
  throw new Error("Status de estabelecimento inválido.");
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

function toVenueApproval(row: Record<string, unknown>): VenueApprovalSummary {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    requesterName: nullableString(row.requester_name),
    requesterEmail: nullableString(row.requester_email),
    venueName: String(row.venue_name),
    businessRole: String(row.business_role),
    category: nullableString(row.category),
    city: nullableString(row.city),
    state: nullableString(row.state),
    neighborhood: nullableString(row.neighborhood),
    address: nullableString(row.address),
    whatsapp: nullableString(row.whatsapp),
    instagram: nullableString(row.instagram),
    capacity: row.capacity == null ? null : Number(row.capacity),
    description: nullableString(row.description),
    coverImageUrl: nullableString(row.cover_image_url),
    status: normalizeVenueApprovalStatus(String(row.status)),
    reviewNote: nullableString(row.review_note),
    createdAt: stringifyDate(row.created_at),
    updatedAt: row.updated_at ? stringifyDate(row.updated_at) : null,
  };
}

function toAdminUser(row: Record<string, unknown>): AdminUserSummary {
  return {
    userId: String(row.user_id),
    accountType: nullableString(row.account_type),
    displayName: nullableString(row.display_name),
    avatarUrl: nullableString(row.avatar_url),
    email: nullableString(row.email),
    createdAt: row.created_at ? stringifyDate(row.created_at) : null,
    lastActivityAt: row.last_activity_at ? stringifyDate(row.last_activity_at) : null,
  };
}

function toNamedItem(row: Record<string, unknown>): AdminNamedItem {
  return {
    id: String(row.id),
    label: nullableString(row.label) ?? "Sem título",
    helper: nullableString(row.helper),
    createdAt: row.created_at ? stringifyDate(row.created_at) : null,
  };
}

function toTextItem(row: Record<string, unknown>): AdminTextItem {
  return {
    ...toNamedItem(row),
    text: nullableString(row.text),
  };
}

function toAdminAuditLog(row: Record<string, unknown>): AdminAuditLogSummary {
  return {
    id: String(row.id),
    adminUserId: String(row.admin_user_id),
    adminName: nullableString(row.admin_name),
    adminEmail: nullableString(row.admin_email),
    action: String(row.action),
    entityType: String(row.entity_type),
    entityId: nullableString(row.entity_id),
    entityLabel: nullableString(row.entity_label),
    createdAt: stringifyDate(row.created_at),
  };
}

function nullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function stringifyDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : String(value ?? "");
}

import { getSql } from "./db";
import { requireAuthenticatedUserId } from "./server-auth";
import type {
  CountSummary,
  ExportUserDataInput,
  JsonRow,
  JsonValue,
  UserDataExport,
} from "./privacy-actions";

export async function buildUserDataExport(
  data: ExportUserDataInput,
  authenticatedUserId?: string,
): Promise<UserDataExport> {
  const userId = authenticatedUserId ?? (await requireAuthenticatedUserId(data.userId));
  const exportedAt = new Date().toISOString();
  const subject = {
    userId,
    email: data.email,
    name: data.name,
    accountType: data.accountType,
  };

  const sql = await getSql();
  if (!sql) {
    return {
      exportedAt,
      subject,
      profile: null,
      venueClaims: [],
      ownedVenues: [],
      checkins: [],
      savedEvents: [],
      eventReviews: [],
      venueFollowers: [],
      feedPosts: [],
      postComments: [],
      groupPlans: [],
      counts: emptyCounts(),
      note: "DATABASE_URL não configurada. Exportação limitada aos dados da sessão.",
    };
  }

  const [profileRows, venueClaimRows, ownedVenueRows, checkinRows, savedRows, reviewRows] =
    await Promise.all([
      sql`
        SELECT user_id, account_type, display_name, avatar_url, onboarding_completed, created_at, updated_at
        FROM public.user_profiles
        WHERE user_id = ${userId}
        LIMIT 1
      `,
      sql`
        SELECT venue_name, business_role, phone, neighborhood, address, created_at
        FROM public.venue_claim_requests
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `,
      sql`
        SELECT id, name, slug, business_role, neighborhood, city, state, address, description, phone, category, instagram, whatsapp, capacity, latitude, longitude, cover_image_url, created_at, updated_at
        FROM public.venues
        WHERE owner_user_id = ${userId}
        ORDER BY created_at DESC
      `,
      sql`
        SELECT c.id, c.venue_id, v.name AS venue_name, c.event_id, e.title AS event_title, c.created_at
        FROM public.checkins c
        LEFT JOIN public.venues v ON v.id = c.venue_id
        LEFT JOIN public.events e ON e.id = c.event_id
        WHERE c.user_id = ${userId}
        ORDER BY c.created_at DESC
      `,
      sql`
        SELECT se.event_id, e.title AS event_title, e.starts_at, v.name AS venue_name, se.created_at
        FROM public.saved_events se
        LEFT JOIN public.events e ON e.id = se.event_id
        LEFT JOIN public.venues v ON v.id = e.venue_id
        WHERE se.user_id = ${userId}
        ORDER BY se.created_at DESC
      `,
      sql`
        SELECT er.id, er.event_id, e.title AS event_title, er.atmosphere, er.music, er.price, er.movement, er.comment, er.created_at, er.updated_at
        FROM public.event_reviews er
        LEFT JOIN public.events e ON e.id = er.event_id
        WHERE er.user_id = ${userId}
        ORDER BY er.created_at DESC
      `,
    ]);

  const [followerRows, postRows, commentRows, groupRows, ownedEventRows] = await Promise.all([
    sql`
      SELECT vf.venue_id, v.name AS venue_name, vf.created_at
      FROM public.venue_followers vf
      LEFT JOIN public.venues v ON v.id = vf.venue_id
      WHERE vf.user_id = ${userId}
      ORDER BY vf.created_at DESC
    `,
    sql`
      SELECT p.id, p.venue_id, v.name AS venue_name, p.event_id, e.title AS event_title, p.caption, p.tagged_person, p.photo_urls, p.created_at, p.updated_at
      FROM public.user_posts p
      LEFT JOIN public.venues v ON v.id = p.venue_id
      LEFT JOIN public.events e ON e.id = p.event_id
      WHERE p.user_id = ${userId}
      ORDER BY p.created_at DESC
    `,
    sql`
      SELECT pc.id, pc.post_id, pc.body, pc.created_at
      FROM public.user_post_comments pc
      WHERE pc.user_id = ${userId}
      ORDER BY pc.created_at DESC
    `,
    sql`
      SELECT id, title, description, status, created_at
      FROM public.group_plans
      WHERE creator_user_id = ${userId}
      ORDER BY created_at DESC
    `,
    sql`
      SELECT e.id, e.venue_id, v.name AS venue_name, e.title, e.category, e.description, e.starts_at, e.price_cents, e.image_url, e.created_at, e.updated_at
      FROM public.events e
      JOIN public.venues v ON v.id = e.venue_id
      WHERE v.owner_user_id = ${userId}
      ORDER BY e.created_at DESC
    `,
  ]);

  return {
    exportedAt,
    subject,
    profile: profileRows[0] ? toJsonRow(profileRows[0]) : null,
    venueClaims: toJsonRows(venueClaimRows),
    ownedVenues: toJsonRows(ownedVenueRows),
    checkins: toJsonRows(checkinRows),
    savedEvents: toJsonRows(savedRows),
    eventReviews: toJsonRows(reviewRows),
    venueFollowers: toJsonRows(followerRows),
    feedPosts: toJsonRows(postRows),
    postComments: toJsonRows(commentRows),
    groupPlans: toJsonRows(groupRows),
    counts: {
      checkins: checkinRows.length,
      savedEvents: savedRows.length,
      eventReviews: reviewRows.length,
      venueFollowers: followerRows.length,
      feedPosts: postRows.length,
      postComments: commentRows.length,
      groupPlans: groupRows.length,
      ownedVenues: ownedVenueRows.length,
      ownedEvents: ownedEventRows.length,
    },
    note: "Exportação básica para atendimento LGPD. Dados de terceiros e dados técnicos internos podem ser limitados por segurança e privacidade.",
  };
}

function toJsonRows(rows: Record<string, unknown>[]): JsonRow[] {
  return rows.map(toJsonRow);
}

function toJsonRow(row: Record<string, unknown>): JsonRow {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, toJsonValue(value)]));
}

function toJsonValue(value: unknown): JsonValue {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") return toJsonRow(value as Record<string, unknown>);
  return String(value);
}

function emptyCounts(): CountSummary {
  return {
    checkins: 0,
    savedEvents: 0,
    eventReviews: 0,
    venueFollowers: 0,
    feedPosts: 0,
    postComments: 0,
    groupPlans: 0,
    ownedVenues: 0,
    ownedEvents: 0,
  };
}

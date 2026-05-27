import { createServerFn } from "@tanstack/react-start";
import { getSql, type SqlClient, uniqueSlug } from "./db";
import { getOptionalAuthenticatedUserId, requireAuthenticatedUserId } from "./server-auth";
import { fetchWithTimeout, timeoutMessage } from "./timeout";

export interface EventSummary {
  id: string;
  venueId: string;
  title: string;
  venue: string;
  venueName: string;
  venueNeighborhood: string;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  description?: string;
  createdAt?: string;
  date: string;
  startsAt: string;
  priceCents?: number;
  price?: string;
  going: number;
  image: string;
  live: boolean;
  category: string;
  venueCategory?: string;
  saved?: boolean;
  checkedIn?: boolean;
  reward?: VenueReward | null;
  attendees: UserAvatarSummary[];
}

export interface UserAvatarSummary {
  userId: string;
  name: string;
  avatarUrl?: string;
}

export interface VenueSummary {
  id: string;
  name: string;
  description?: string;
  neighborhood: string;
  city?: string;
  address?: string;
  instagram?: string;
  latitude?: number;
  longitude?: number;
  image: string;
  liveEvents: number;
  checkins: number;
  favoriteCount?: number;
  favorited?: boolean;
  followerCount?: number;
  followed?: boolean;
  reward?: VenueReward | null;
}

export interface VenueReward {
  id: string;
  venueId: string;
  action: "checkin" | "save" | "share" | "follow";
  title: string;
  description: string;
  status: "active" | "inactive";
  maxRedemptions?: number;
  validUntil?: string;
}

export interface VenueUpdateSummary {
  id: string;
  venueId: string;
  venueName: string;
  venueNeighborhood: string;
  venueImage: string;
  title: string;
  body: string;
  kind: "news" | "promo" | "event";
  createdAt: string;
}

export interface AgendaReminderSummary {
  id: string;
  eventId: string;
  title: string;
  venue: string;
  image: string;
  date: string;
  startsAt: string;
}

export interface GroupPlanOptionSummary {
  id: string;
  eventId?: string;
  title: string;
  subtitle: string;
  image: string;
  votes: number;
  voted?: boolean;
}

export interface GroupPlanSummary {
  id: string;
  title: string;
  description?: string;
  status: "open" | "closed";
  createdAt: string;
  options: GroupPlanOptionSummary[];
  totalVotes: number;
  userVoteOptionId?: string;
}

export interface FeedPostSummary {
  id: string;
  userId: string;
  authorName: string;
  authorAvatarUrl?: string;
  venueId: string;
  venueName: string;
  venueNeighborhood: string;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  eventId?: string;
  eventTitle?: string;
  caption: string;
  taggedPerson?: string;
  photoUrls: string[];
  likes: number;
  comments: number;
  liked?: boolean;
  createdAt: string;
}

export interface PostCommentSummary {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
}

export interface EventReviewSummary {
  id: string;
  eventId: string;
  userId: string;
  atmosphere: number;
  music: number;
  price: number;
  movement: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserEventReviewSummary extends EventReviewSummary {
  eventTitle: string;
  eventDate: string;
  venueId: string;
  venueName: string;
  venueNeighborhood: string;
  eventImage: string;
}

export interface OwnerReviewSummary extends UserEventReviewSummary {
  authorName: string;
  authorAvatarUrl?: string;
}

export interface OwnerReviewStats {
  total: number;
  average: number;
  atmosphere: number;
  music: number;
  price: number;
  movement: number;
  recent: OwnerReviewSummary[];
}

export interface PostComposerEventOption {
  id: string;
  title: string;
  venueId: string;
  venueName: string;
  venueNeighborhood: string;
}

export interface LocationLookupResult {
  label: string;
  latitude: number;
  longitude: number;
}

export interface VenueDetail {
  venue: VenueSummary;
  events: EventSummary[];
  checkins: number;
  checkedIn?: boolean;
}

export interface OwnerDashboard {
  venue: VenueSummary | null;
  metrics: {
    views: number;
    events: number;
    checkins: number;
    savedEvents: number;
    followers: number;
    reviews: number;
  };
  events: EventSummary[];
  updates: VenueUpdateSummary[];
  reviews: OwnerReviewStats;
  topSavedEvent?: {
    id: string;
    title: string;
    saved: number;
  };
  nextEvent?: {
    id: string;
    title: string;
    date: string;
  };
  reward?: VenueReward | null;
}

export interface UserActivityStats {
  checkins: number;
  reviews: number;
  saved: number;
}

type CreateEventInput = {
  userId: string;
  title: string;
  category: string;
  description?: string;
  startsAt: string;
  priceCents?: number;
  imageUrl: string;
};

type UpdateEventInput = {
  userId: string;
  eventId: string;
  title: string;
  category: string;
  description?: string;
  startsAt: string;
  priceCents?: number;
  imageUrl?: string;
};

type OwnerEventActionInput = {
  userId: string;
  eventId: string;
};

type CheckinInput = {
  userId: string;
  venueId: string;
  eventId?: string;
};

type CreateUserPostInput = {
  userId: string;
  authorName?: string;
  authorAvatarUrl?: string;
  eventId: string;
  caption: string;
  photoUrls: string[];
  taggedPerson?: string;
};

type PostActionInput = {
  userId: string;
  postId: string;
};

type AddPostCommentInput = PostActionInput & {
  body: string;
};

type UpsertEventReviewInput = {
  userId: string;
  eventId: string;
  atmosphere: number;
  music: number;
  price: number;
  movement: number;
  comment?: string;
};

type UpsertRewardInput = {
  userId: string;
  title: string;
  description: string;
  action: VenueReward["action"];
  status: VenueReward["status"];
  maxRedemptions?: number;
  validUntil?: string;
};

type CreateVenueUpdateInput = {
  userId: string;
  title: string;
  body: string;
  kind: VenueUpdateSummary["kind"];
};

type CreateGroupPlanInput = {
  userId?: string;
  title: string;
  description?: string;
  eventIds: string[];
};

type VoteGroupPlanInput = {
  groupId: string;
  optionId: string;
  voterKey: string;
  voterName?: string;
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatEventDate(value: string | Date) {
  const date = new Date(value);
  const [day, month] = monthFormatter.format(date).replace(".", "").split(" de ");
  return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}`;
}

function formatCurrency(cents?: number | null) {
  if (cents == null) return undefined;
  return currencyFormatter.format(cents / 100);
}

function mapReward(row: Record<string, unknown> | undefined): VenueReward | null {
  if (!row?.reward_id) return null;

  return {
    id: String(row.reward_id),
    venueId: String(row.reward_venue_id ?? row.venue_id),
    action: String(row.reward_action ?? "checkin") as VenueReward["action"],
    title: String(row.reward_title),
    description: String(row.reward_description ?? ""),
    status: String(row.reward_status ?? "active") as VenueReward["status"],
    maxRedemptions:
      row.reward_max_redemptions == null ? undefined : Number(row.reward_max_redemptions),
    validUntil: row.reward_valid_until ? String(row.reward_valid_until) : undefined,
  };
}

function mapEvent(row: Record<string, unknown>, saved = false, checkedIn = false): EventSummary {
  return {
    id: String(row.id),
    venueId: String(row.venue_id),
    title: String(row.title),
    venue: `${row.venue_name}, ${row.neighborhood}`,
    venueName: String(row.venue_name),
    venueNeighborhood: String(row.neighborhood),
    venueAddress: row.address ? String(row.address) : undefined,
    venueLatitude: row.latitude == null ? undefined : Number(row.latitude),
    venueLongitude: row.longitude == null ? undefined : Number(row.longitude),
    description: row.description ? String(row.description) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    date: formatEventDate(String(row.starts_at)),
    startsAt: String(row.starts_at),
    priceCents: row.price_cents == null ? undefined : Number(row.price_cents),
    price: row.price_cents == null ? undefined : formatCurrency(Number(row.price_cents)),
    going: Number(row.attendee_count ?? row.confirmed_count ?? 0),
    image: String(row.image_url),
    live: Boolean(row.is_live),
    category: String(row.category),
    venueCategory: row.venue_category ? String(row.venue_category) : undefined,
    saved,
    checkedIn,
    reward: mapReward(row),
    attendees: mapAttendees(row.attendees),
  };
}

function mapAttendees(value: unknown): UserAvatarSummary[] {
  const attendees = typeof value === "string" ? safeJsonParse(value) : value;
  if (!Array.isArray(attendees)) return [];

  return attendees
    .map<UserAvatarSummary | null>((attendee) => {
      if (!attendee || typeof attendee !== "object") return null;
      const item = attendee as Record<string, unknown>;
      return {
        userId: String(item.userId ?? item.user_id ?? ""),
        name: item.name ? String(item.name) : "Alguém por perto",
        avatarUrl:
          item.avatarUrl || item.avatar_url ? String(item.avatarUrl ?? item.avatar_url) : undefined,
      };
    })
    .filter((attendee): attendee is UserAvatarSummary => Boolean(attendee?.userId));
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function mapFeedPost(row: Record<string, unknown>, liked = false): FeedPostSummary {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    authorName: row.author_name ? String(row.author_name) : "Alguém por perto",
    authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : undefined,
    venueId: String(row.venue_id),
    venueName: String(row.venue_name),
    venueNeighborhood: String(row.neighborhood),
    venueAddress: row.address ? String(row.address) : undefined,
    venueLatitude: row.latitude == null ? undefined : Number(row.latitude),
    venueLongitude: row.longitude == null ? undefined : Number(row.longitude),
    eventId: row.event_id ? String(row.event_id) : undefined,
    eventTitle: row.event_title ? String(row.event_title) : undefined,
    caption: String(row.caption ?? ""),
    taggedPerson: row.tagged_person ? String(row.tagged_person) : undefined,
    photoUrls: Array.isArray(row.photo_urls) ? row.photo_urls.map(String) : [],
    likes: Number(row.likes ?? 0),
    comments: Number(row.comments ?? 0),
    liked: Boolean(row.liked ?? liked),
    createdAt: String(row.created_at),
  };
}

function mapAgendaReminder(row: Record<string, unknown>): AgendaReminderSummary {
  return {
    id: `agenda-${String(row.id)}`,
    eventId: String(row.id),
    title: String(row.title),
    venue: `${row.venue_name}, ${row.neighborhood}`,
    image: String(row.image_url),
    date: formatEventDate(String(row.starts_at)),
    startsAt: String(row.starts_at),
  };
}

function mapGroupPlan(rows: Record<string, unknown>[], voterKey?: string): GroupPlanSummary | null {
  const first = rows[0];
  if (!first) return null;

  const options = rows
    .filter((row) => row.option_id)
    .map<GroupPlanOptionSummary>((row) => ({
      id: String(row.option_id),
      eventId: row.event_id ? String(row.event_id) : undefined,
      title: String(row.option_title),
      subtitle: String(row.option_subtitle ?? ""),
      image: String(row.option_image_url),
      votes: Number(row.vote_count ?? 0),
      voted: voterKey ? String(row.user_vote_option_id ?? "") === String(row.option_id) : false,
    }));
  const userVoteOptionId = voterKey
    ? rows.find((row) => row.user_vote_option_id)?.user_vote_option_id
    : undefined;

  return {
    id: String(first.id),
    title: String(first.title),
    description: first.description ? String(first.description) : undefined,
    status: String(first.status ?? "open") as GroupPlanSummary["status"],
    createdAt: String(first.created_at),
    options,
    totalVotes: options.reduce((total, option) => total + option.votes, 0),
    userVoteOptionId: userVoteOptionId ? String(userVoteOptionId) : undefined,
  };
}

function mapPostComment(row: Record<string, unknown>): PostCommentSummary {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    userId: String(row.user_id),
    authorName: row.author_name ? String(row.author_name) : "Alguém por perto",
    authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : undefined,
    body: String(row.body ?? ""),
    createdAt: String(row.created_at),
  };
}

function mapEventReview(row: Record<string, unknown>): EventReviewSummary {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    userId: String(row.user_id),
    atmosphere: Number(row.atmosphere),
    music: Number(row.music),
    price: Number(row.price),
    movement: Number(row.movement),
    comment: row.comment ? String(row.comment) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapUserEventReview(row: Record<string, unknown>): UserEventReviewSummary {
  return {
    ...mapEventReview(row),
    eventTitle: String(row.event_title),
    eventDate: formatEventDate(String(row.starts_at)),
    venueId: String(row.venue_id),
    venueName: String(row.venue_name),
    venueNeighborhood: String(row.neighborhood),
    eventImage: String(row.image_url),
  };
}

function mapOwnerReview(row: Record<string, unknown>): OwnerReviewSummary {
  return {
    ...mapUserEventReview(row),
    authorName: row.author_name ? String(row.author_name) : "Cliente ChegaAi",
    authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : undefined,
  };
}

const EMPTY_OWNER_REVIEW_STATS: OwnerReviewStats = {
  total: 0,
  average: 0,
  atmosphere: 0,
  music: 0,
  price: 0,
  movement: 0,
  recent: [],
};

function roundRating(value: unknown) {
  const rating = Number(value ?? 0);
  if (!Number.isFinite(rating)) return 0;
  return Math.round(rating * 10) / 10;
}

function mapVenueUpdate(row: Record<string, unknown>): VenueUpdateSummary {
  return {
    id: String(row.id),
    venueId: String(row.venue_id),
    venueName: String(row.venue_name),
    venueNeighborhood: String(row.neighborhood),
    venueImage: String(row.cover_image_url),
    title: String(row.title),
    body: String(row.body ?? ""),
    kind: String(row.kind ?? "news") as VenueUpdateSummary["kind"],
    createdAt: String(row.created_at),
  };
}

async function ensureVenueUpdatesSchema(_sql: SqlClient) {
  return;
}

async function ensureNotificationReadsSchema(_sql: SqlClient) {
  return;
}

async function ensureGroupPlansSchema(_sql: SqlClient) {
  return;
}

async function ensurePostsSchema(_sql: SqlClient) {
  return;
}

async function ensureEventReviewsSchema(_sql: SqlClient) {
  return;
}

function mapVenue(row: Record<string, unknown>): VenueSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : undefined,
    neighborhood: String(row.neighborhood),
    city: row.city ? String(row.city) : undefined,
    address: row.address ? String(row.address) : undefined,
    instagram: row.instagram ? String(row.instagram) : undefined,
    latitude: row.latitude == null ? undefined : Number(row.latitude),
    longitude: row.longitude == null ? undefined : Number(row.longitude),
    image: String(row.cover_image_url),
    liveEvents: Number(row.live_events ?? 0),
    checkins: Number(row.checkins ?? 0),
    favoriteCount: Number(row.favorite_count ?? 0),
    favorited: Boolean(row.favorited ?? false),
    followerCount: Number(row.follower_count ?? 0),
    followed: Boolean(row.followed ?? false),
    reward: mapReward(row),
  };
}

async function ensureRewardsSchema(_sql: SqlClient) {
  return;
}

async function ensureVenueFollowersSchema(_sql: SqlClient) {
  return;
}

async function getEventById(sql: SqlClient, eventId: string) {
  const rows = await sql`
    SELECT
      e.id,
      e.venue_id,
      e.title,
      e.category,
      e.description,
      e.created_at,
      e.starts_at,
      e.price_cents,
      e.confirmed_count,
      (SELECT COUNT(DISTINCT c.user_id)::int FROM public.checkins c WHERE c.event_id = e.id) AS attendee_count,
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object('userId', attendee.user_id, 'name', attendee.display_name, 'avatarUrl', attendee.avatar_url)
          ORDER BY attendee.created_at DESC
        )
        FROM (
          SELECT c.user_id, COALESCE(up.display_name, 'Alguém por perto') AS display_name, up.avatar_url, c.created_at
          FROM public.checkins c
          LEFT JOIN public.user_profiles up ON up.user_id = c.user_id
          WHERE c.event_id = e.id
          ORDER BY c.created_at DESC
          LIMIT 3
        ) attendee
      ), '[]'::jsonb) AS attendees,
        e.image_url,
        (e.status = 'published' AND e.starts_at <= now() AND e.starts_at >= now() - interval '6 hours') AS is_live,
        v.name AS venue_name,
        v.neighborhood,
        v.address,
        v.category AS venue_category
    FROM public.events e
    JOIN public.venues v ON v.id = e.venue_id
    WHERE e.id = ${eventId}
    LIMIT 1
  `;

  return rows[0] ? mapEvent(rows[0]) : null;
}

export const getEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<EventSummary[]> => {
    const sql = await getSql();
    if (!sql) return [];

    const rows = await sql`
      SELECT
        e.id,
        e.venue_id,
        e.title,
        e.category,
        e.description,
        e.created_at,
        e.starts_at,
        e.price_cents,
        e.confirmed_count,
        (SELECT COUNT(DISTINCT c.user_id)::int FROM public.checkins c WHERE c.event_id = e.id) AS attendee_count,
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('userId', attendee.user_id, 'name', attendee.display_name, 'avatarUrl', attendee.avatar_url)
            ORDER BY attendee.created_at DESC
          )
          FROM (
            SELECT c.user_id, COALESCE(up.display_name, 'Alguém por perto') AS display_name, up.avatar_url, c.created_at
            FROM public.checkins c
            LEFT JOIN public.user_profiles up ON up.user_id = c.user_id
            WHERE c.event_id = e.id
            ORDER BY c.created_at DESC
            LIMIT 3
          ) attendee
        ), '[]'::jsonb) AS attendees,
        e.image_url,
        (e.starts_at <= now() AND e.starts_at >= now() - interval '6 hours') AS is_live,
        v.name AS venue_name,
        v.neighborhood,
        v.address,
        v.category AS venue_category,
        v.latitude,
        v.longitude
      FROM public.events e
      JOIN public.venues v ON v.id = e.venue_id
      WHERE e.status = 'published'
      ORDER BY e.starts_at ASC
    `;

    return rows.map((row) => mapEvent(row));
  },
);

export const getVenues = createServerFn({ method: "GET" }).handler(
  async (): Promise<VenueSummary[]> => {
    const sql = await getSql();
    if (!sql) return [];
    await ensureRewardsSchema(sql);
    await ensureVenueFollowersSchema(sql);

    const rows = await sql`
      SELECT
        v.id,
        v.name,
        v.description,
        v.neighborhood,
        v.city,
        v.address,
        v.instagram,
        v.latitude,
        v.longitude,
        v.cover_image_url,
        COUNT(DISTINCT e.id) FILTER (
          WHERE e.status = 'published'
            AND e.starts_at <= now()
            AND e.starts_at >= now() - interval '6 hours'
        ) AS live_events,
        COUNT(DISTINCT c.user_id) AS checkins,
        COUNT(DISTINCT fv.user_id) AS favorite_count,
        COUNT(DISTINCT vf.user_id) AS follower_count,
        r.id AS reward_id,
        r.venue_id AS reward_venue_id,
        r.action AS reward_action,
        r.title AS reward_title,
        r.description AS reward_description,
        r.status AS reward_status,
        r.max_redemptions AS reward_max_redemptions,
        r.valid_until AS reward_valid_until
      FROM public.venues v
      LEFT JOIN public.events e ON e.venue_id = v.id
      LEFT JOIN public.checkins c ON c.venue_id = v.id
      LEFT JOIN public.favorite_venues fv ON fv.venue_id = v.id
      LEFT JOIN public.venue_followers vf ON vf.venue_id = v.id
      LEFT JOIN LATERAL (
        SELECT *
        FROM public.venue_rewards vr
        WHERE vr.venue_id = v.id
          AND vr.status = 'active'
          AND (vr.valid_until IS NULL OR vr.valid_until > now())
        ORDER BY vr.updated_at DESC
        LIMIT 1
      ) r ON true
      GROUP BY v.id, r.id, r.venue_id, r.action, r.title, r.description, r.status, r.max_redemptions, r.valid_until
      ORDER BY live_events DESC, checkins DESC, v.name ASC
    `;

    return rows.map(mapVenue);
  },
);

export const getSavedEventIds = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return [] as string[];

    const sql = await getSql();
    if (!sql) return [] as string[];

    const rows = await sql`
      SELECT event_id
      FROM public.saved_events
      WHERE user_id = ${userId}
    `;

    return rows.map((row) => String(row.event_id));
  });

export const getCheckedInEventIds = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return [] as string[];

    const sql = await getSql();
    if (!sql) return [] as string[];

    const rows = await sql`
      SELECT c.event_id
      FROM public.checkins c
      JOIN public.events e ON e.id = c.event_id
      WHERE c.user_id = ${userId}
        AND e.status = 'published'
    `;

    return rows.map((row) => String(row.event_id));
  });

export const getFavoriteVenueIds = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return [] as string[];

    const sql = await getSql();
    if (!sql) return [] as string[];

    const rows = await sql`
      SELECT venue_id
      FROM public.favorite_venues
      WHERE user_id = ${userId}
    `;

    return rows.map((row) => String(row.venue_id));
  });

export const getSavedEvents = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }) => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return [] as EventSummary[];

    const sql = await getSql();
    if (!sql) return [] as EventSummary[];

    const rows = await sql`
      SELECT
        e.id,
        e.venue_id,
        e.title,
        e.category,
        e.description,
        e.created_at,
        e.starts_at,
        e.price_cents,
        e.confirmed_count,
        (SELECT COUNT(DISTINCT c.user_id)::int FROM public.checkins c WHERE c.event_id = e.id) AS attendee_count,
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('userId', attendee.user_id, 'name', attendee.display_name, 'avatarUrl', attendee.avatar_url)
            ORDER BY attendee.created_at DESC
          )
          FROM (
            SELECT c.user_id, COALESCE(up.display_name, 'Alguém por perto') AS display_name, up.avatar_url, c.created_at
            FROM public.checkins c
            LEFT JOIN public.user_profiles up ON up.user_id = c.user_id
            WHERE c.event_id = e.id
            ORDER BY c.created_at DESC
            LIMIT 3
          ) attendee
        ), '[]'::jsonb) AS attendees,
        e.image_url,
        (e.starts_at <= now() AND e.starts_at >= now() - interval '6 hours') AS is_live,
        v.name AS venue_name,
        v.neighborhood,
        v.address,
        v.category AS venue_category,
        v.latitude,
        v.longitude
      FROM public.saved_events se
      JOIN public.events e ON e.id = se.event_id
      JOIN public.venues v ON v.id = e.venue_id
      WHERE se.user_id = ${userId}
        AND e.status = 'published'
      ORDER BY e.starts_at ASC
    `;

    return rows.map((row) => mapEvent(row, true));
  });

export const getAgendaReminders = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<AgendaReminderSummary[]> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return [];

    const sql = await getSql();
    if (!sql) return [];

    const rows = await sql`
      SELECT
        e.id,
        e.title,
        e.starts_at,
        e.image_url,
        v.name AS venue_name,
        v.neighborhood
      FROM public.saved_events se
      JOIN public.events e ON e.id = se.event_id
      JOIN public.venues v ON v.id = e.venue_id
      WHERE se.user_id = ${userId}
        AND e.status = 'published'
        AND e.starts_at > now()
        AND e.starts_at <= now() + interval '24 hours'
      ORDER BY e.starts_at ASC
      LIMIT 5
    `;

    return rows.map(mapAgendaReminder);
  });

export const getUserActivityStats = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<UserActivityStats> => {
    const empty = { checkins: 0, reviews: 0, saved: 0 };
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return empty;

    const sql = await getSql();
    if (!sql) return empty;

    await ensureEventReviewsSchema(sql);

    const [checkinRows, savedRows, reviewRows] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS count
        FROM public.checkins c
        LEFT JOIN public.events e ON e.id = c.event_id
        WHERE c.user_id = ${userId}
          AND (c.event_id IS NULL OR e.status <> 'cancelled')
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM public.saved_events se
        JOIN public.events e ON e.id = se.event_id
        WHERE se.user_id = ${userId}
          AND e.status = 'published'
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM public.event_reviews er
        JOIN public.events e ON e.id = er.event_id
        WHERE er.user_id = ${userId}
          AND e.status <> 'cancelled'
      `,
    ]);

    return {
      checkins: Number(checkinRows[0]?.count ?? 0),
      reviews: Number(reviewRows[0]?.count ?? 0),
      saved: Number(savedRows[0]?.count ?? 0),
    };
  });

export const getUserEventReview = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string; eventId: string }) => data)
  .handler(async ({ data }): Promise<EventReviewSummary | null> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return null;

    const sql = await getSql();
    if (!sql) return null;
    await ensureEventReviewsSchema(sql);

    const rows = await sql`
      SELECT id, event_id, user_id, atmosphere, music, price, movement, comment, created_at, updated_at
      FROM public.event_reviews
      WHERE user_id = ${userId}
        AND event_id = ${data.eventId}
      LIMIT 1
    `;

    return rows[0] ? mapEventReview(rows[0]) : null;
  });

export const getUserEventReviews = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<UserEventReviewSummary[]> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return [];

    const sql = await getSql();
    if (!sql) return [];
    await ensureEventReviewsSchema(sql);

    const rows = await sql`
      SELECT
        er.id,
        er.event_id,
        er.user_id,
        er.atmosphere,
        er.music,
        er.price,
        er.movement,
        er.comment,
        er.created_at,
        er.updated_at,
        e.title AS event_title,
        e.starts_at,
        e.image_url,
        v.id AS venue_id,
        v.name AS venue_name,
        v.neighborhood
      FROM public.event_reviews er
      JOIN public.events e ON e.id = er.event_id
      JOIN public.venues v ON v.id = e.venue_id
      WHERE er.user_id = ${userId}
        AND e.status <> 'cancelled'
      ORDER BY er.updated_at DESC
      LIMIT 50
    `;

    return rows.map(mapUserEventReview);
  });

export const upsertEventReview = createServerFn({ method: "POST" })
  .inputValidator((data: UpsertEventReviewInput) => data)
  .handler(async ({ data }): Promise<EventReviewSummary> => {
    const userId = await requireAuthenticatedUserId(data.userId);

    const atmosphere = normalizeRating(data.atmosphere);
    const music = normalizeRating(data.music);
    const price = normalizeRating(data.price);
    const movement = normalizeRating(data.movement);
    const comment = data.comment?.trim().slice(0, 240) ?? "";

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensureEventReviewsSchema(sql);

    const checkins = await sql`
      SELECT e.starts_at <= now() - interval '6 hours' AS review_available
      FROM public.checkins c
      JOIN public.events e ON e.id = c.event_id
      WHERE c.user_id = ${userId}
        AND c.event_id = ${data.eventId}
        AND e.status = 'published'
      LIMIT 1
    `;
    if (checkins.length === 0) throw new Error("Faça check-in no evento antes de avaliar.");
    if (!checkins[0]?.review_available) {
      throw new Error("A avaliação será liberada depois que o evento terminar.");
    }

    const rows = await sql`
      INSERT INTO public.event_reviews (event_id, user_id, atmosphere, music, price, movement, comment)
      VALUES (${data.eventId}, ${userId}, ${atmosphere}, ${music}, ${price}, ${movement}, ${comment})
      ON CONFLICT (event_id, user_id) DO UPDATE SET
        atmosphere = EXCLUDED.atmosphere,
        music = EXCLUDED.music,
        price = EXCLUDED.price,
        movement = EXCLUDED.movement,
        comment = EXCLUDED.comment,
        updated_at = now()
      RETURNING id, event_id, user_id, atmosphere, music, price, movement, comment, created_at, updated_at
    `;

    return mapEventReview(rows[0]);
  });

function normalizeRating(value: number) {
  const rating = Math.round(Number(value));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("Escolha notas de 1 a 5.");
  }
  return rating;
}

export const createGroupPlan = createServerFn({ method: "POST" })
  .inputValidator((data: CreateGroupPlanInput) => data)
  .handler(async ({ data }): Promise<GroupPlanSummary> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    const title = data.title.trim();
    const description = data.description?.trim() ?? "";
    const eventIds = Array.from(new Set(data.eventIds.filter(Boolean))).slice(0, 4);

    if (!title) throw new Error("Dê um nome para o rolê.");
    if (eventIds.length < 2) throw new Error("Escolha pelo menos 2 opções para votar.");

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensureGroupPlansSchema(sql);

    const eventRows = await sql`
      SELECT
        e.id,
        e.title,
        e.image_url,
        e.starts_at,
        v.name AS venue_name,
        v.neighborhood
      FROM public.events e
      JOIN public.venues v ON v.id = e.venue_id
      WHERE e.id = ANY(${eventIds})
        AND e.status = 'published'
      ORDER BY e.starts_at ASC
    `;

    if (eventRows.length < 2) throw new Error("Escolha eventos publicados para montar o rolê.");

    const groupRows = await sql`
      INSERT INTO public.group_plans (creator_user_id, title, description)
      VALUES (${userId}, ${title.slice(0, 90)}, ${description.slice(0, 180)})
      RETURNING id
    `;
    const groupId = String(groupRows[0].id);

    for (const [position, event] of eventRows.slice(0, 4).entries()) {
      await sql`
        INSERT INTO public.group_plan_options (
          group_id,
          event_id,
          title,
          subtitle,
          image_url,
          position
        )
        VALUES (
          ${groupId},
          ${String(event.id)},
          ${String(event.title)},
          ${`${event.venue_name}, ${event.neighborhood} · ${formatEventDate(String(event.starts_at))}`},
          ${String(event.image_url)},
          ${position}
        )
      `;
    }

    const group = await loadGroupPlan(sql, groupId);
    if (!group) throw new Error("Não foi possível criar o rolê.");
    return group;
  });

export const getGroupPlan = createServerFn({ method: "GET" })
  .inputValidator((data: { groupId: string; voterKey?: string }) => data)
  .handler(async ({ data }): Promise<GroupPlanSummary | null> => {
    const sql = await getSql();
    if (!sql) return null;
    await ensureGroupPlansSchema(sql);
    return loadGroupPlan(sql, data.groupId, data.voterKey);
  });

export const voteGroupPlan = createServerFn({ method: "POST" })
  .inputValidator((data: VoteGroupPlanInput) => data)
  .handler(async ({ data }): Promise<GroupPlanSummary> => {
    const voterKey = data.voterKey.trim();
    if (!voterKey) throw new Error("Identifique seu voto.");

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensureGroupPlansSchema(sql);

    const optionRows = await sql`
      SELECT group_id
      FROM public.group_plan_options
      WHERE id = ${data.optionId}
        AND group_id = ${data.groupId}
      LIMIT 1
    `;
    if (optionRows.length === 0) throw new Error("Opção de voto não encontrada.");

    await sql`
      INSERT INTO public.group_plan_votes (group_id, option_id, voter_key, voter_name)
      VALUES (
        ${data.groupId},
        ${data.optionId},
        ${voterKey.slice(0, 120)},
        ${(data.voterName?.trim() || "Alguém no grupo").slice(0, 80)}
      )
      ON CONFLICT (group_id, voter_key) DO UPDATE SET
        option_id = EXCLUDED.option_id,
        voter_name = EXCLUDED.voter_name,
        created_at = now()
    `;

    const group = await loadGroupPlan(sql, data.groupId, voterKey);
    if (!group) throw new Error("Rolê não encontrado.");
    return group;
  });

async function loadGroupPlan(sql: SqlClient, groupId: string, voterKey?: string) {
  const rows = await sql`
    SELECT
      gp.id,
      gp.title,
      gp.description,
      gp.status,
      gp.created_at,
      gpo.id AS option_id,
      gpo.event_id,
      gpo.title AS option_title,
      gpo.subtitle AS option_subtitle,
      gpo.image_url AS option_image_url,
      gpo.position,
      COUNT(gpv.voter_key)::int AS vote_count,
      user_vote.option_id AS user_vote_option_id
    FROM public.group_plans gp
    LEFT JOIN public.group_plan_options gpo ON gpo.group_id = gp.id
    LEFT JOIN public.group_plan_votes gpv ON gpv.option_id = gpo.id
    LEFT JOIN public.group_plan_votes user_vote ON user_vote.group_id = gp.id
      AND user_vote.voter_key = ${voterKey ?? ""}
    WHERE gp.id = ${groupId}
    GROUP BY gp.id, gpo.id, user_vote.option_id
    ORDER BY gpo.position ASC
  `;

  return mapGroupPlan(rows, voterKey);
}

export const getFeedPosts = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<FeedPostSummary[]> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    const sql = await getSql();
    if (!sql) return [];
    await ensurePostsSchema(sql);

    const rows = await sql`
      SELECT
        p.id,
        p.user_id,
        COALESCE(up.display_name, 'Alguém por perto') AS author_name,
        up.avatar_url AS author_avatar_url,
        p.venue_id,
        p.event_id,
        p.caption,
        p.tagged_person,
        p.created_at,
        v.name AS venue_name,
        v.neighborhood,
        v.address,
        v.latitude,
        v.longitude,
        e.title AS event_title,
        COALESCE(array_agg(pm.media_url ORDER BY pm.position) FILTER (WHERE pm.media_url IS NOT NULL), ARRAY[]::text[]) AS photo_urls,
        COUNT(DISTINCT pl.user_id)::int AS likes,
        COUNT(DISTINCT pc.id)::int AS comments,
        EXISTS (
          SELECT 1
          FROM public.user_post_likes current_like
          WHERE current_like.post_id = p.id
            AND current_like.user_id = ${userId ?? ""}
        ) AS liked
      FROM public.user_posts p
      JOIN public.venues v ON v.id = p.venue_id
      LEFT JOIN public.events e ON e.id = p.event_id
      LEFT JOIN public.user_profiles up ON up.user_id = p.user_id
      LEFT JOIN public.user_post_media pm ON pm.post_id = p.id
      LEFT JOIN public.user_post_likes pl ON pl.post_id = p.id
      LEFT JOIN public.user_post_comments pc ON pc.post_id = p.id
      GROUP BY p.id, up.display_name, up.avatar_url, v.id, e.id
      ORDER BY p.created_at DESC
      LIMIT 40
    `;

    return rows.map((row) => mapFeedPost(row));
  });

export const getPostComposerEvents = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<PostComposerEventOption[]> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return [];

    const sql = await getSql();
    if (!sql) return [];

    const rows = await sql`
      SELECT DISTINCT
        e.id,
        e.title,
        e.venue_id,
        v.name AS venue_name,
        v.neighborhood
      FROM public.checkins c
      JOIN public.events e ON e.id = c.event_id
      JOIN public.venues v ON v.id = e.venue_id
      WHERE c.user_id = ${userId}
        AND e.status = 'published'
        AND e.starts_at <= now()
        AND e.starts_at >= now() - interval '6 hours'
      ORDER BY e.title ASC
    `;

    return rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      venueId: String(row.venue_id),
      venueName: String(row.venue_name),
      venueNeighborhood: String(row.neighborhood),
    }));
  });

export const createUserPost = createServerFn({ method: "POST" })
  .inputValidator((data: CreateUserPostInput) => data)
  .handler(async ({ data }): Promise<FeedPostSummary> => {
    const userId = await requireAuthenticatedUserId(data.userId);
    if (!data.eventId) throw new Error("Selecione um evento acontecendo agora.");

    const caption = data.caption.trim();
    const taggedPerson = data.taggedPerson?.trim();
    const photoUrls = data.photoUrls
      .map((url) => url.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (!caption && photoUrls.length === 0) {
      throw new Error("Escreva uma legenda ou adicione pelo menos uma foto.");
    }

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensurePostsSchema(sql);
    await ensurePostAuthorProfile(sql, userId, data.authorName, data.authorAvatarUrl);

    const events = await sql`
      SELECT e.id, e.venue_id
      FROM public.checkins c
      JOIN public.events e ON e.id = c.event_id
      WHERE c.user_id = ${userId}
        AND e.id = ${data.eventId}
        AND e.status = 'published'
        AND e.starts_at <= now()
        AND e.starts_at >= now() - interval '6 hours'
      LIMIT 1
    `;
    const event = events[0];
    if (!event) throw new Error("Faça check-in em um evento acontecendo agora para postar.");

    const posts = await sql`
      INSERT INTO public.user_posts (user_id, venue_id, event_id, caption, tagged_person)
      VALUES (
        ${userId},
        ${String(event.venue_id)},
        ${data.eventId},
        ${caption},
        ${taggedPerson || null}
      )
      RETURNING id
    `;
    const postId = String(posts[0].id);

    for (const [position, mediaUrl] of photoUrls.entries()) {
      await sql`
        INSERT INTO public.user_post_media (post_id, media_url, position)
        VALUES (${postId}, ${mediaUrl}, ${position})
      `;
    }

    const rows = await sql`
      SELECT
        p.id,
        p.user_id,
        COALESCE(up.display_name, 'Você') AS author_name,
        up.avatar_url AS author_avatar_url,
        p.venue_id,
        p.event_id,
        p.caption,
        p.tagged_person,
        p.created_at,
        v.name AS venue_name,
        v.neighborhood,
        v.address,
        v.latitude,
        v.longitude,
        e.title AS event_title,
        COALESCE(array_agg(pm.media_url ORDER BY pm.position) FILTER (WHERE pm.media_url IS NOT NULL), ARRAY[]::text[]) AS photo_urls,
        0::int AS likes,
        0::int AS comments,
        false AS liked
      FROM public.user_posts p
      JOIN public.venues v ON v.id = p.venue_id
      LEFT JOIN public.events e ON e.id = p.event_id
      LEFT JOIN public.user_profiles up ON up.user_id = p.user_id
      LEFT JOIN public.user_post_media pm ON pm.post_id = p.id
      WHERE p.id = ${postId}
      GROUP BY p.id, up.display_name, up.avatar_url, v.id, e.id
      LIMIT 1
    `;

    return mapFeedPost(rows[0]);
  });

async function ensurePostAuthorProfile(
  sql: SqlClient,
  userId: string,
  authorName?: string,
  authorAvatarUrl?: string,
) {
  const displayName = authorName?.trim();
  const avatarUrl = authorAvatarUrl?.trim();
  if (!displayName && !avatarUrl) return;

  await sql`
    INSERT INTO public.user_profiles (user_id, account_type, display_name, avatar_url, onboarding_completed)
    VALUES (${userId}, 'explorer', ${displayName || null}, ${avatarUrl || null}, true)
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
      updated_at = now()
  `;
}

export const togglePostLike = createServerFn({ method: "POST" })
  .inputValidator((data: PostActionInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensurePostsSchema(sql);

    const existing = await sql`
      SELECT 1
      FROM public.user_post_likes
      WHERE post_id = ${data.postId}
        AND user_id = ${userId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      await sql`
        DELETE FROM public.user_post_likes
        WHERE post_id = ${data.postId}
          AND user_id = ${userId}
      `;
      return { liked: false };
    }

    await sql`
      INSERT INTO public.user_post_likes (post_id, user_id)
      VALUES (${data.postId}, ${userId})
      ON CONFLICT (post_id, user_id) DO NOTHING
    `;
    return { liked: true };
  });

export const getPostComments = createServerFn({ method: "GET" })
  .inputValidator((data: { postId: string }) => data)
  .handler(async ({ data }): Promise<PostCommentSummary[]> => {
    const sql = await getSql();
    if (!sql) return [];
    await ensurePostsSchema(sql);

    const rows = await sql`
      SELECT
        pc.id,
        pc.post_id,
        pc.user_id,
        COALESCE(up.display_name, 'Alguém por perto') AS author_name,
        up.avatar_url AS author_avatar_url,
        pc.body,
        pc.created_at
      FROM public.user_post_comments pc
      LEFT JOIN public.user_profiles up ON up.user_id = pc.user_id
      WHERE pc.post_id = ${data.postId}
      ORDER BY pc.created_at ASC
      LIMIT 80
    `;

    return rows.map(mapPostComment);
  });

export const addPostComment = createServerFn({ method: "POST" })
  .inputValidator((data: AddPostCommentInput) => data)
  .handler(async ({ data }): Promise<PostCommentSummary> => {
    const userId = await requireAuthenticatedUserId(data.userId);
    const body = data.body.trim();
    if (!body) throw new Error("Escreva um comentário.");

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensurePostsSchema(sql);

    const rows = await sql`
      INSERT INTO public.user_post_comments (post_id, user_id, body)
      VALUES (${data.postId}, ${userId}, ${body.slice(0, 280)})
      RETURNING id, post_id, user_id, body, created_at
    `;

    const authorRows = await sql`
      SELECT COALESCE(display_name, 'Você') AS author_name, avatar_url AS author_avatar_url
      FROM public.user_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    return mapPostComment({
      ...rows[0],
      author_name: authorRows[0]?.author_name ?? "Você",
      author_avatar_url: authorRows[0]?.author_avatar_url,
    });
  });

export const getEventDetails = createServerFn({ method: "GET" })
  .inputValidator((data: { eventId: string; userId?: string }) => data)
  .handler(async ({ data }): Promise<EventSummary | null> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    const sql = await getSql();
    if (!sql) return null;
    await ensureRewardsSchema(sql);
    await ensureVenueFollowersSchema(sql);

    const rows = await sql`
      SELECT
        e.id,
        e.venue_id,
        e.title,
        e.category,
        e.description,
        e.created_at,
        e.starts_at,
        e.price_cents,
        e.confirmed_count,
        (SELECT COUNT(DISTINCT c.user_id)::int FROM public.checkins c WHERE c.event_id = e.id) AS attendee_count,
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('userId', attendee.user_id, 'name', attendee.display_name, 'avatarUrl', attendee.avatar_url)
            ORDER BY attendee.created_at DESC
          )
          FROM (
            SELECT c.user_id, COALESCE(up.display_name, 'Alguém por perto') AS display_name, up.avatar_url, c.created_at
            FROM public.checkins c
            LEFT JOIN public.user_profiles up ON up.user_id = c.user_id
            WHERE c.event_id = e.id
            ORDER BY c.created_at DESC
            LIMIT 3
          ) attendee
        ), '[]'::jsonb) AS attendees,
        e.image_url,
        (e.starts_at <= now() AND e.starts_at >= now() - interval '6 hours') AS is_live,
        v.name AS venue_name,
        v.neighborhood,
        v.address,
        v.category AS venue_category,
        v.latitude,
        v.longitude,
        r.id AS reward_id,
        r.venue_id AS reward_venue_id,
        r.action AS reward_action,
        r.title AS reward_title,
        r.description AS reward_description,
        r.status AS reward_status,
        r.max_redemptions AS reward_max_redemptions,
        r.valid_until AS reward_valid_until,
        EXISTS (
          SELECT 1
          FROM public.saved_events se
          WHERE se.event_id = e.id
            AND se.user_id = ${userId ?? ""}
        ) AS saved,
        EXISTS (
          SELECT 1
          FROM public.checkins c
          WHERE c.event_id = e.id
            AND c.user_id = ${userId ?? ""}
        ) AS checked_in
      FROM public.events e
      JOIN public.venues v ON v.id = e.venue_id
      LEFT JOIN LATERAL (
        SELECT *
        FROM public.venue_rewards vr
        WHERE vr.venue_id = v.id
          AND vr.status = 'active'
          AND (vr.valid_until IS NULL OR vr.valid_until > now())
        ORDER BY vr.updated_at DESC
        LIMIT 1
      ) r ON true
      WHERE e.id = ${data.eventId}
        AND e.status = 'published'
      LIMIT 1
    `;

    return rows[0] ? mapEvent(rows[0], Boolean(rows[0].saved), Boolean(rows[0].checked_in)) : null;
  });

export const getVenueDetails = createServerFn({ method: "GET" })
  .inputValidator((data: { venueId: string; userId?: string }) => data)
  .handler(async ({ data }): Promise<VenueDetail | null> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    const sql = await getSql();
    if (!sql) return null;
    await ensureRewardsSchema(sql);

    const venueRows = await sql`
      SELECT
        v.id,
        v.name,
        v.description,
        v.neighborhood,
        v.city,
        v.address,
        v.latitude,
        v.longitude,
        v.cover_image_url,
        COUNT(DISTINCT e.id) FILTER (
          WHERE e.status = 'published'
            AND e.starts_at <= now()
            AND e.starts_at >= now() - interval '6 hours'
        ) AS live_events,
        COUNT(DISTINCT c.user_id) AS checkins,
        COUNT(DISTINCT fv.user_id) AS favorite_count,
        COUNT(DISTINCT vf.user_id) AS follower_count,
        r.id AS reward_id,
        r.venue_id AS reward_venue_id,
        r.action AS reward_action,
        r.title AS reward_title,
        r.description AS reward_description,
        r.status AS reward_status,
        r.max_redemptions AS reward_max_redemptions,
        r.valid_until AS reward_valid_until,
        EXISTS (
          SELECT 1
          FROM public.favorite_venues current_favorite
          WHERE current_favorite.venue_id = v.id
            AND current_favorite.user_id = ${userId ?? ""}
        ) AS favorited,
        EXISTS (
          SELECT 1
          FROM public.venue_followers current_follower
          WHERE current_follower.venue_id = v.id
            AND current_follower.user_id = ${userId ?? ""}
        ) AS followed,
        EXISTS (
          SELECT 1
          FROM public.checkins current_checkin
          WHERE current_checkin.venue_id = v.id
            AND current_checkin.event_id IS NULL
            AND current_checkin.user_id = ${userId ?? ""}
        ) AS checked_in
      FROM public.venues v
      LEFT JOIN public.events e ON e.venue_id = v.id
      LEFT JOIN public.checkins c ON c.venue_id = v.id
      LEFT JOIN public.favorite_venues fv ON fv.venue_id = v.id
      LEFT JOIN public.venue_followers vf ON vf.venue_id = v.id
      LEFT JOIN LATERAL (
        SELECT *
        FROM public.venue_rewards vr
        WHERE vr.venue_id = v.id
          AND vr.status = 'active'
          AND vr.action = 'checkin'
          AND (vr.valid_until IS NULL OR vr.valid_until > now())
        ORDER BY vr.updated_at DESC
        LIMIT 1
      ) r ON true
      WHERE v.id = ${data.venueId}
      GROUP BY v.id, r.id, r.venue_id, r.action, r.title, r.description, r.status, r.max_redemptions, r.valid_until
      LIMIT 1
    `;

    const venueRow = venueRows[0];
    if (!venueRow) return null;
    const venue = mapVenue(venueRow);

    const [eventRows, checkinRows] = await Promise.all([
      sql`
        SELECT
          e.id,
          e.venue_id,
          e.title,
          e.category,
          e.description,
          e.created_at,
          e.starts_at,
          e.price_cents,
          e.confirmed_count,
          (SELECT COUNT(DISTINCT c.user_id)::int FROM public.checkins c WHERE c.event_id = e.id) AS attendee_count,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object('userId', attendee.user_id, 'name', attendee.display_name, 'avatarUrl', attendee.avatar_url)
              ORDER BY attendee.created_at DESC
            )
            FROM (
              SELECT c.user_id, COALESCE(up.display_name, 'Alguém por perto') AS display_name, up.avatar_url, c.created_at
              FROM public.checkins c
              LEFT JOIN public.user_profiles up ON up.user_id = c.user_id
              WHERE c.event_id = e.id
              ORDER BY c.created_at DESC
              LIMIT 3
            ) attendee
          ), '[]'::jsonb) AS attendees,
          e.image_url,
          (e.starts_at <= now() AND e.starts_at >= now() - interval '6 hours') AS is_live,
          v.name AS venue_name,
          v.neighborhood,
          v.address,
          v.category AS venue_category,
          v.latitude,
          v.longitude,
          r.id AS reward_id,
          r.venue_id AS reward_venue_id,
          r.action AS reward_action,
          r.title AS reward_title,
          r.description AS reward_description,
          r.status AS reward_status,
          r.max_redemptions AS reward_max_redemptions,
          r.valid_until AS reward_valid_until,
          EXISTS (
            SELECT 1
            FROM public.saved_events se
            WHERE se.event_id = e.id
              AND se.user_id = ${userId ?? ""}
          ) AS saved,
          EXISTS (
            SELECT 1
            FROM public.checkins c
            WHERE c.event_id = e.id
              AND c.user_id = ${userId ?? ""}
          ) AS checked_in
        FROM public.events e
        JOIN public.venues v ON v.id = e.venue_id
        LEFT JOIN LATERAL (
          SELECT *
          FROM public.venue_rewards vr
          WHERE vr.venue_id = v.id
            AND vr.status = 'active'
            AND vr.action = 'checkin'
            AND (vr.valid_until IS NULL OR vr.valid_until > now())
          ORDER BY vr.updated_at DESC
          LIMIT 1
        ) r ON true
        WHERE e.venue_id = ${data.venueId}
          AND e.status = 'published'
        ORDER BY e.starts_at ASC
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM public.checkins c
        LEFT JOIN public.events e ON e.id = c.event_id
        WHERE c.venue_id = ${data.venueId}
          AND (c.event_id IS NULL OR e.status <> 'cancelled')
      `,
    ]);

    return {
      venue,
      events: eventRows.map((row) => mapEvent(row, Boolean(row.saved), Boolean(row.checked_in))),
      checkins: Number(checkinRows[0]?.count ?? 0),
      checkedIn: Boolean(venueRow.checked_in),
    };
  });

export const toggleSavedEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; eventId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");

    const existing = await sql`
      SELECT 1
      FROM public.saved_events
      WHERE user_id = ${userId}
        AND event_id = ${data.eventId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      await sql`
        DELETE FROM public.saved_events
        WHERE user_id = ${userId}
          AND event_id = ${data.eventId}
      `;
      return { saved: false };
    }

    await sql`
      INSERT INTO public.saved_events (user_id, event_id)
      VALUES (${userId}, ${data.eventId})
      ON CONFLICT (user_id, event_id) DO NOTHING
    `;

    return { saved: true };
  });

export const toggleFavoriteVenue = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; venueId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");

    const existing = await sql`
      SELECT 1
      FROM public.favorite_venues
      WHERE user_id = ${userId}
        AND venue_id = ${data.venueId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      await sql`
        DELETE FROM public.favorite_venues
        WHERE user_id = ${userId}
          AND venue_id = ${data.venueId}
      `;
      return { favorited: false };
    }

    await sql`
      INSERT INTO public.favorite_venues (user_id, venue_id)
      VALUES (${userId}, ${data.venueId})
      ON CONFLICT (user_id, venue_id) DO NOTHING
    `;

    return { favorited: true };
  });

export const toggleVenueFollow = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; venueId: string }) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensureVenueFollowersSchema(sql);

    const existing = await sql`
      SELECT 1
      FROM public.venue_followers
      WHERE user_id = ${userId}
        AND venue_id = ${data.venueId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      await sql`
        DELETE FROM public.venue_followers
        WHERE user_id = ${userId}
          AND venue_id = ${data.venueId}
      `;
      return { followed: false };
    }

    await sql`
      INSERT INTO public.venue_followers (user_id, venue_id)
      VALUES (${userId}, ${data.venueId})
      ON CONFLICT (user_id, venue_id) DO NOTHING
    `;

    return { followed: true };
  });

export const toggleCheckin = createServerFn({ method: "POST" })
  .inputValidator((data: CheckinInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");

    const existing = data.eventId
      ? await sql`
          SELECT 1
          FROM public.checkins
          WHERE user_id = ${userId}
            AND venue_id = ${data.venueId}
            AND event_id = ${data.eventId}
          LIMIT 1
        `
      : await sql`
          SELECT 1
          FROM public.checkins
          WHERE user_id = ${userId}
            AND venue_id = ${data.venueId}
            AND event_id IS NULL
          LIMIT 1
        `;

    if (existing.length > 0) {
      if (data.eventId) {
        await sql`
          DELETE FROM public.checkins
          WHERE user_id = ${userId}
            AND venue_id = ${data.venueId}
            AND event_id = ${data.eventId}
        `;
      } else {
        await sql`
          DELETE FROM public.checkins
          WHERE user_id = ${userId}
            AND venue_id = ${data.venueId}
            AND event_id IS NULL
        `;
      }

      return { checkedIn: false };
    }

    await sql`
      INSERT INTO public.checkins (user_id, venue_id, event_id)
      VALUES (${userId}, ${data.venueId}, ${data.eventId ?? null})
      ON CONFLICT (user_id, venue_id, event_id) DO NOTHING
    `;

    return { checkedIn: true };
  });

export const upsertOwnerReward = createServerFn({ method: "POST" })
  .inputValidator((data: UpsertRewardInput) => data)
  .handler(async ({ data }): Promise<VenueReward> => {
    const userId = await requireAuthenticatedUserId(data.userId);
    if (!data.title.trim()) throw new Error("Informe o título da recompensa.");
    if (!data.description.trim()) throw new Error("Explique como o cliente resgata a recompensa.");

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensureRewardsSchema(sql);

    const venues = await sql`
      SELECT id
      FROM public.venues
      WHERE owner_user_id = ${userId}
      ORDER BY created_at ASC
      LIMIT 1
    `;
    const venue = venues[0];
    if (!venue) throw new Error("Cadastre seu estabelecimento antes de criar recompensas.");

    await sql`
      UPDATE public.venue_rewards
      SET status = 'inactive', updated_at = now()
      WHERE venue_id = ${String(venue.id)}
    `;

    const rows = await sql`
      INSERT INTO public.venue_rewards (
        venue_id,
        action,
        title,
        description,
        status,
        max_redemptions,
        valid_until
      )
      VALUES (
        ${String(venue.id)},
        ${data.action},
        ${data.title.trim()},
        ${data.description.trim()},
        ${data.status},
        ${data.maxRedemptions ?? null},
        ${data.validUntil || null}
      )
      RETURNING
        id AS reward_id,
        venue_id AS reward_venue_id,
        action AS reward_action,
        title AS reward_title,
        description AS reward_description,
        status AS reward_status,
        max_redemptions AS reward_max_redemptions,
        valid_until AS reward_valid_until
    `;

    const reward = mapReward(rows[0]);
    if (!reward) throw new Error("Não foi possível salvar a recompensa.");
    return reward;
  });

export const createVenueUpdate = createServerFn({ method: "POST" })
  .inputValidator((data: CreateVenueUpdateInput) => data)
  .handler(async ({ data }): Promise<VenueUpdateSummary> => {
    const userId = await requireAuthenticatedUserId(data.userId);
    if (!data.title.trim()) throw new Error("Informe o título da novidade.");
    if (!data.body.trim()) throw new Error("Escreva a mensagem para os seguidores.");

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensureVenueUpdatesSchema(sql);

    const venues = await sql`
      SELECT id
      FROM public.venues
      WHERE owner_user_id = ${userId}
      ORDER BY created_at ASC
      LIMIT 1
    `;
    const venue = venues[0];
    if (!venue) throw new Error("Cadastre seu estabelecimento antes de publicar novidades.");

    const rows = await sql`
      INSERT INTO public.venue_updates (venue_id, title, body, kind)
      VALUES (${String(venue.id)}, ${data.title.trim()}, ${data.body.trim()}, ${data.kind})
      RETURNING id, venue_id, title, body, kind, created_at
    `;

    const updateRows = await sql`
      SELECT
        vu.id,
        vu.venue_id,
        vu.title,
        vu.body,
        vu.kind,
        vu.created_at,
        v.name AS venue_name,
        v.neighborhood,
        v.cover_image_url
      FROM public.venue_updates vu
      JOIN public.venues v ON v.id = vu.venue_id
      WHERE vu.id = ${String(rows[0].id)}
      LIMIT 1
    `;

    return mapVenueUpdate(updateRows[0]);
  });

export const getFollowerUpdates = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<VenueUpdateSummary[]> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return [];

    const sql = await getSql();
    if (!sql) return [];
    await ensureVenueUpdatesSchema(sql);

    const rows = await sql`
      SELECT
        vu.id,
        vu.venue_id,
        vu.title,
        vu.body,
        vu.kind,
        vu.created_at,
        v.name AS venue_name,
        v.neighborhood,
        v.cover_image_url
      FROM public.venue_updates vu
      JOIN public.venue_followers vf ON vf.venue_id = vu.venue_id
      JOIN public.venues v ON v.id = vu.venue_id
      WHERE vf.user_id = ${userId}
      ORDER BY vu.created_at DESC
      LIMIT 30
    `;

    return rows.map(mapVenueUpdate);
  });

export const getUnreadNotificationCount = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<number> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return 0;

    const sql = await getSql();
    if (!sql) return 0;
    await ensureNotificationReadsSchema(sql);

    const rows = await sql`
      SELECT
        (
          SELECT COUNT(DISTINCT vu.id)::int
          FROM public.venue_updates vu
          JOIN public.venue_followers vf ON vf.venue_id = vu.venue_id
          LEFT JOIN public.user_notification_reads unr ON unr.user_id = vf.user_id
          WHERE vf.user_id = ${userId}
            AND vu.created_at > COALESCE(unr.last_seen_at, '-infinity'::timestamptz)
        ) + (
          SELECT COUNT(DISTINCT se.event_id)::int
          FROM public.saved_events se
          JOIN public.events e ON e.id = se.event_id
          WHERE se.user_id = ${userId}
            AND e.status = 'published'
            AND e.starts_at > now()
            AND e.starts_at <= now() + interval '24 hours'
        ) AS unread_count
    `;

    return Number(rows[0]?.unread_count ?? 0);
  });

export const markNotificationsSeen = createServerFn({ method: "POST" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return;

    const sql = await getSql();
    if (!sql) return;
    await ensureNotificationReadsSchema(sql);

    await sql`
      INSERT INTO public.user_notification_reads (user_id, last_seen_at, updated_at)
      VALUES (${userId}, now(), now())
      ON CONFLICT (user_id) DO UPDATE SET
        last_seen_at = EXCLUDED.last_seen_at,
        updated_at = EXCLUDED.updated_at
    `;
  });

export const createEventForOwner = createServerFn({ method: "POST" })
  .inputValidator((data: CreateEventInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);
    if (!data.title.trim() || !data.category.trim() || !data.startsAt || !data.imageUrl) {
      throw new Error("Preencha título, categoria, data e imagem.");
    }

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");

    const venues = await sql`
      SELECT id
      FROM public.venues
      WHERE owner_user_id = ${userId}
      ORDER BY created_at ASC
      LIMIT 1
    `;
    const venue = venues[0];
    if (!venue) throw new Error("Cadastre seu estabelecimento antes de publicar eventos.");

    const slug = await uniqueSlug(sql, "events", data.title);
    const rows = await sql`
      INSERT INTO public.events (
        venue_id,
        title,
        slug,
        category,
        description,
        starts_at,
        price_cents,
        image_url,
        status
      )
      VALUES (
        ${String(venue.id)},
        ${data.title.trim()},
        ${slug},
        ${data.category.trim()},
        ${data.description?.trim() || null},
        ${data.startsAt},
        ${data.priceCents ?? null},
        ${data.imageUrl},
        'published'
      )
      RETURNING id
    `;

    return getEventById(sql, String(rows[0].id));
  });

export const updateEventForOwner = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateEventInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);
    if (!data.eventId) throw new Error("Evento não encontrado.");
    if (!data.title.trim() || !data.category.trim() || !data.startsAt) {
      throw new Error("Preencha título, categoria e data do evento.");
    }

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");

    const ownerRows = await sql`
      SELECT e.id
      FROM public.events e
      JOIN public.venues v ON v.id = e.venue_id
      WHERE e.id = ${data.eventId}
        AND v.owner_user_id = ${userId}
      LIMIT 1
    `;
    if (!ownerRows[0]) throw new Error("Você só pode editar eventos do seu estabelecimento.");

    await sql`
      UPDATE public.events
      SET
        title = ${data.title.trim()},
        category = ${data.category.trim()},
        description = ${data.description?.trim() || null},
        starts_at = ${data.startsAt},
        price_cents = ${data.priceCents ?? null},
        image_url = COALESCE(${data.imageUrl ?? null}, image_url),
        updated_at = now()
      WHERE id = ${data.eventId}
    `;

    return getEventById(sql, data.eventId);
  });

export const deleteEventForOwner = createServerFn({ method: "POST" })
  .inputValidator((data: OwnerEventActionInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);
    if (!data.eventId) throw new Error("Evento não encontrado.");

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");

    const rows = await sql`
      UPDATE public.events e
      SET
        status = 'cancelled',
        updated_at = now()
      FROM public.venues v
      WHERE e.venue_id = v.id
        AND e.id = ${data.eventId}
        AND v.owner_user_id = ${userId}
        AND e.status = 'published'
      RETURNING e.id
    `;

    if (!rows[0]) throw new Error("Evento não encontrado para este estabelecimento.");

    return { deleted: true };
  });

export const getOwnerDashboard = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<OwnerDashboard> => {
    const empty = {
      venue: null,
      metrics: { views: 0, events: 0, checkins: 0, savedEvents: 0, followers: 0, reviews: 0 },
      events: [],
      updates: [],
      reviews: EMPTY_OWNER_REVIEW_STATS,
    };

    const userId = await requireAuthenticatedUserId(data.userId);

    const sql = await getSql();
    if (!sql) return empty;
    await ensureRewardsSchema(sql);
    await ensureVenueUpdatesSchema(sql);
    await ensureEventReviewsSchema(sql);

    const venueRows = await sql`
      SELECT
        v.id,
        v.name,
        v.description,
        v.neighborhood,
        v.city,
        v.address,
        v.latitude,
        v.longitude,
        v.cover_image_url,
        COUNT(DISTINCT e.id) FILTER (
          WHERE e.status = 'published'
            AND e.starts_at <= now()
            AND e.starts_at >= now() - interval '6 hours'
        ) AS live_events,
        COUNT(DISTINCT c.user_id) AS checkins,
        COUNT(DISTINCT fv.user_id) AS favorite_count,
        COUNT(DISTINCT vf.user_id) AS follower_count
      FROM public.venues v
      LEFT JOIN public.events e ON e.venue_id = v.id
      LEFT JOIN public.checkins c ON c.venue_id = v.id
      LEFT JOIN public.favorite_venues fv ON fv.venue_id = v.id
      LEFT JOIN public.venue_followers vf ON vf.venue_id = v.id
      WHERE v.owner_user_id = ${userId}
      GROUP BY v.id
      ORDER BY v.created_at ASC
      LIMIT 1
    `;
    const venueRow = venueRows[0];
    if (!venueRow) return empty;

    const venue = mapVenue(venueRow);
    const [
      metricRows,
      eventRows,
      topSavedRows,
      rewardRows,
      updateRows,
      reviewStatsRows,
      reviewRows,
    ] = await Promise.all([
      sql`
        SELECT
          COUNT(DISTINCT e.id)::int AS events,
          COUNT(DISTINCT se.user_id || ':' || se.event_id)::int AS saved_events,
          COUNT(DISTINCT vf.user_id)::int AS followers,
          (
            SELECT COUNT(c.id)::int
            FROM public.checkins c
            LEFT JOIN public.events ce ON ce.id = c.event_id
            WHERE c.venue_id = ${venue.id}
              AND (c.event_id IS NULL OR ce.status <> 'cancelled')
          ) AS checkins
        FROM public.venues v
        LEFT JOIN public.events e ON e.venue_id = v.id AND e.status = 'published'
        LEFT JOIN public.saved_events se ON se.event_id = e.id
        LEFT JOIN public.venue_followers vf ON vf.venue_id = v.id
        WHERE v.id = ${venue.id}
      `,
      sql`
        SELECT
          e.id,
          e.venue_id,
          e.title,
          e.category,
          e.description,
          e.created_at,
          e.starts_at,
          e.price_cents,
          e.confirmed_count,
          (SELECT COUNT(DISTINCT c.user_id)::int FROM public.checkins c WHERE c.event_id = e.id) AS attendee_count,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object('userId', attendee.user_id, 'name', attendee.display_name, 'avatarUrl', attendee.avatar_url)
              ORDER BY attendee.created_at DESC
            )
            FROM (
              SELECT c.user_id, COALESCE(up.display_name, 'Alguém por perto') AS display_name, up.avatar_url, c.created_at
              FROM public.checkins c
              LEFT JOIN public.user_profiles up ON up.user_id = c.user_id
              WHERE c.event_id = e.id
              ORDER BY c.created_at DESC
              LIMIT 3
            ) attendee
          ), '[]'::jsonb) AS attendees,
          e.image_url,
          (e.starts_at <= now() AND e.starts_at >= now() - interval '6 hours') AS is_live,
          v.name AS venue_name,
          v.neighborhood,
          v.address,
          v.category AS venue_category,
          v.latitude,
          v.longitude
        FROM public.events e
        JOIN public.venues v ON v.id = e.venue_id
        WHERE e.venue_id = ${venue.id}
          AND e.status = 'published'
        ORDER BY e.starts_at ASC
        LIMIT 5
      `,
      sql`
        SELECT
          e.id,
          e.title,
          COUNT(se.user_id)::int AS saved
        FROM public.events e
        LEFT JOIN public.saved_events se ON se.event_id = e.id
        WHERE e.venue_id = ${venue.id}
          AND e.status = 'published'
        GROUP BY e.id
        ORDER BY saved DESC, e.starts_at ASC
        LIMIT 1
      `,
      sql`
        SELECT
          id AS reward_id,
          venue_id AS reward_venue_id,
          action AS reward_action,
          title AS reward_title,
          description AS reward_description,
          status AS reward_status,
          max_redemptions AS reward_max_redemptions,
          valid_until AS reward_valid_until
        FROM public.venue_rewards
        WHERE venue_id = ${venue.id}
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      sql`
        SELECT
          vu.id,
          vu.venue_id,
          vu.title,
          vu.body,
          vu.kind,
          vu.created_at,
          v.name AS venue_name,
          v.neighborhood,
          v.cover_image_url
        FROM public.venue_updates vu
        JOIN public.venues v ON v.id = vu.venue_id
        WHERE vu.venue_id = ${venue.id}
        ORDER BY vu.created_at DESC
        LIMIT 3
      `,
      sql`
        SELECT
          COUNT(er.id)::int AS total,
          AVG((er.atmosphere + er.music + er.price + er.movement) / 4.0) AS average,
          AVG(er.atmosphere) AS atmosphere,
          AVG(er.music) AS music,
          AVG(er.price) AS price,
          AVG(er.movement) AS movement
        FROM public.event_reviews er
        JOIN public.events e ON e.id = er.event_id
        WHERE e.venue_id = ${venue.id}
          AND e.status <> 'cancelled'
      `,
      sql`
        SELECT
          er.id,
          er.event_id,
          er.user_id,
          er.atmosphere,
          er.music,
          er.price,
          er.movement,
          er.comment,
          er.created_at,
          er.updated_at,
          e.title AS event_title,
          e.starts_at,
          e.image_url,
          v.id AS venue_id,
          v.name AS venue_name,
          v.neighborhood,
          COALESCE(up.display_name, 'Cliente ChegaAi') AS author_name,
          up.avatar_url AS author_avatar_url
        FROM public.event_reviews er
        JOIN public.events e ON e.id = er.event_id
        JOIN public.venues v ON v.id = e.venue_id
        LEFT JOIN public.user_profiles up ON up.user_id = er.user_id
        WHERE e.venue_id = ${venue.id}
          AND e.status <> 'cancelled'
        ORDER BY er.updated_at DESC
        LIMIT 6
      `,
    ]);

    const metrics = metricRows[0] ?? { events: 0, checkins: 0 };
    const topSaved = topSavedRows[0];
    const nextEvent = eventRows[0];
    const reward = mapReward(rewardRows[0]);
    const reviewStats = reviewStatsRows[0];
    const reviewTotal = Number(reviewStats?.total ?? 0);
    const reviews: OwnerReviewStats = {
      total: reviewTotal,
      average: roundRating(reviewStats?.average),
      atmosphere: roundRating(reviewStats?.atmosphere),
      music: roundRating(reviewStats?.music),
      price: roundRating(reviewStats?.price),
      movement: roundRating(reviewStats?.movement),
      recent: reviewRows.map(mapOwnerReview),
    };

    return {
      venue,
      metrics: {
        views: 0,
        events: Number(metrics.events ?? 0),
        checkins: Number(metrics.checkins ?? 0),
        savedEvents: Number(metrics.saved_events ?? 0),
        followers: Number(metrics.followers ?? 0),
        reviews: reviewTotal,
      },
      events: eventRows.map((row) => mapEvent(row)),
      updates: updateRows.map(mapVenueUpdate),
      reviews,
      reward,
      topSavedEvent: topSaved
        ? {
            id: String(topSaved.id),
            title: String(topSaved.title),
            saved: Number(topSaved.saved ?? 0),
          }
        : undefined,
      nextEvent: nextEvent
        ? {
            id: String(nextEvent.id),
            title: String(nextEvent.title),
            date: formatEventDate(String(nextEvent.starts_at)),
          }
        : undefined,
    };
  });

export const searchLocation = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }): Promise<LocationLookupResult | null> => {
    const query = data.query.trim();
    if (query.length < 3) return null;

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("q", /brasil/i.test(query) ? query : `${query}, Brasil`);

    try {
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            "User-Agent": "ChegaAi/1.0 geolocation contact: admin@chegaai.local",
            Accept: "application/json",
          },
        },
        8000,
        timeoutMessage("buscar o endereço no mapa"),
      );
      if (!response.ok) return null;

      const results = (await response.json()) as Array<{
        display_name?: string;
        lat?: string;
        lon?: string;
      }>;
      const first = results[0];
      if (!first?.lat || !first.lon) return null;

      return {
        label: first.display_name?.split(",").slice(0, 3).join(",") || query,
        latitude: Number(first.lat),
        longitude: Number(first.lon),
      };
    } catch {
      return null;
    }
  });

export const reverseLocationLabel = createServerFn({ method: "GET" })
  .inputValidator((data: { latitude: number; longitude: number }) => data)
  .handler(async ({ data }): Promise<string | null> => {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("lat", String(data.latitude));
    url.searchParams.set("lon", String(data.longitude));

    try {
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            "User-Agent": "ChegaAi/1.0 geolocation contact: admin@chegaai.local",
            Accept: "application/json",
          },
        },
        8000,
        timeoutMessage("buscar o endereço no mapa"),
      );
      if (!response.ok) return null;

      const result = (await response.json()) as {
        address?: {
          city?: string;
          town?: string;
          village?: string;
          hamlet?: string;
          municipality?: string;
          county?: string;
          neighbourhood?: string;
          city_district?: string;
          suburb?: string;
          quarter?: string;
          residential?: string;
          state?: string;
          state_code?: string;
        };
      };
      const address = result.address;
      const locality = firstFilled(
        address?.neighbourhood,
        address?.suburb,
        address?.quarter,
        address?.residential,
        address?.city_district,
        address?.hamlet,
      );
      const city = firstFilled(
        address?.city,
        address?.town,
        address?.municipality,
        address?.county,
      );
      const fallback = firstFilled(locality, city, address?.village);
      const uf = stateToUf(address?.state_code ?? address?.state);
      if (!fallback) return null;

      const place =
        locality && city && !samePlace(locality, city) ? `${locality}, ${city}` : fallback;

      return uf ? `${place} - ${uf}` : place;
    } catch {
      return null;
    }
  });

function firstFilled(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean);
}

function samePlace(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" }) === 0;
}

function stateToUf(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim();
  if (/^[A-Z]{2}$/.test(normalized)) return normalized;

  const states: Record<string, string> = {
    acre: "AC",
    alagoas: "AL",
    amapá: "AP",
    amazonas: "AM",
    bahia: "BA",
    ceará: "CE",
    "distrito federal": "DF",
    "espírito santo": "ES",
    goiás: "GO",
    maranhão: "MA",
    "mato grosso": "MT",
    "mato grosso do sul": "MS",
    "minas gerais": "MG",
    pará: "PA",
    paraíba: "PB",
    paraná: "PR",
    pernambuco: "PE",
    piauí: "PI",
    "rio de janeiro": "RJ",
    "rio grande do norte": "RN",
    "rio grande do sul": "RS",
    rondônia: "RO",
    roraima: "RR",
    "santa catarina": "SC",
    "são paulo": "SP",
    sergipe: "SE",
    tocantins: "TO",
  };

  return states[normalized.toLowerCase()];
}

import { createServerFn } from "@tanstack/react-start";
import { getSql, type SqlClient, uniqueSlug } from "./db";
import {
  EVENT_ACTIVE_WINDOW_HOURS,
  EVENT_POST_WINDOW_HOURS,
  getWeeklyRecurrenceParts,
  type EventRecurrenceType,
} from "./event-time";
import { assertAllowedPublicMediaUrl } from "./media";
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
  redemption?: RewardRedemptionSummary | null;
  attendees: UserAvatarSummary[];
  recurrenceType: EventRecurrenceType;
  recurrenceWeekday?: number;
  recurrenceTime?: string;
}

export interface UserAvatarSummary {
  userId: string;
  name: string;
  avatarUrl?: string;
}

export interface VenueSummary {
  id: string;
  name: string;
  category?: string;
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
  redemption?: RewardRedemptionSummary | null;
}

export interface VenueReward {
  id: string;
  venueId: string;
  eventId?: string;
  action: "checkin" | "save" | "share" | "follow";
  title: string;
  description: string;
  status: "active" | "inactive";
  maxRedemptions?: number;
  validUntil?: string;
}

export interface RewardRedemptionSummary {
  id: string;
  rewardId: string;
  venueId: string;
  eventId?: string;
  code: string;
  status: "pending" | "redeemed" | "expired" | "cancelled";
  createdAt: string;
  redeemedAt?: string;
  rewardTitle?: string;
  venueName?: string;
}

export type RedeemRewardResult =
  | "redeemed"
  | "not_found"
  | "expired"
  | "already_redeemed"
  | "reward_inactive";

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

export interface NotificationSummary {
  id: string;
  type:
    | "venue_update"
    | "new_event"
    | "event_reminder"
    | "post_mention"
    | "post_comment"
    | "group_activity"
    | "reward";
  title: string;
  body: string;
  targetType: "venue" | "event" | "post" | "group" | "profile";
  targetId: string;
  route: string;
  image?: string;
  read: boolean;
  archived: boolean;
  createdAt: string;
}

export type PushPlatform = "ios" | "android" | "web";

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
  taggedUserId?: string;
  taggedUsers?: UserMentionSummary[];
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

export type OwnerCrmSegmentKey =
  | "all"
  | "recurring"
  | "inactive"
  | "saved-not-visited"
  | "recent"
  | "low-rating"
  | "follower-not-visited";

export interface OwnerCrmSegment {
  key: OwnerCrmSegmentKey;
  label: string;
  count: number;
}

export interface OwnerCrmCustomer {
  userId: string;
  name: string;
  avatarUrl?: string;
  checkins: number;
  lastCheckin?: string;
  savedEvents: number;
  followed: boolean;
  favorited: boolean;
  reviews: number;
  averageRating: number;
  lastInteraction?: string;
  segments: OwnerCrmSegmentKey[];
}

export interface OwnerCrm {
  totalCustomers: number;
  segments: OwnerCrmSegment[];
  customers: OwnerCrmCustomer[];
}

export interface PostComposerEventOption {
  id: string;
  title: string;
  venueId: string;
  venueName: string;
  venueNeighborhood: string;
}

export interface UserMentionSummary {
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
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
  crm: OwnerCrm;
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
  rewardRedemptions: {
    redeemed: number;
    pending: number;
    recent: OwnerRedemptionEntry[];
  };
}

export interface OwnerRedemptionEntry {
  id: string;
  code: string;
  customerName: string;
  rewardTitle: string;
  redeemedAt: string;
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
  recurrenceType?: EventRecurrenceType;
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
  recurrenceType?: EventRecurrenceType;
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
  taggedUserId?: string;
  taggedUsers?: UserMentionSummary[];
};

type PostActionInput = {
  userId: string;
  postId: string;
};

type UpdateUserPostInput = PostActionInput & {
  caption: string;
  photoUrls?: string[];
  taggedPerson?: string;
  taggedUserId?: string;
  taggedUsers?: UserMentionSummary[];
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
  eventId?: string;
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
  userId: string;
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

const eventActiveWindowInterval = `${EVENT_ACTIVE_WINDOW_HOURS} hours`;
const eventPostWindowInterval = `${EVENT_POST_WINDOW_HOURS} hours`;

function normalizeRecurrence(type?: EventRecurrenceType, startsAt?: string) {
  if (type !== "weekly") {
    return { recurrenceType: "none" as const, recurrenceWeekday: null, recurrenceTime: null };
  }

  const parts = startsAt ? getWeeklyRecurrenceParts(startsAt) : null;
  if (!parts) throw new Error("Informe uma data válida para repetir semanalmente.");

  return {
    recurrenceType: "weekly" as const,
    recurrenceWeekday: parts.weekday,
    recurrenceTime: parts.time,
  };
}

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
    eventId: row.reward_event_id ? String(row.reward_event_id) : undefined,
    action: String(row.reward_action ?? "checkin") as VenueReward["action"],
    title: String(row.reward_title),
    description: String(row.reward_description ?? ""),
    status: String(row.reward_status ?? "active") as VenueReward["status"],
    maxRedemptions:
      row.reward_max_redemptions == null ? undefined : Number(row.reward_max_redemptions),
    validUntil: row.reward_valid_until ? String(row.reward_valid_until) : undefined,
  };
}

function mapRedemption(
  row: Record<string, unknown> | undefined,
  prefix = "redemption_",
): RewardRedemptionSummary | null {
  const get = (key: string) => row?.[`${prefix}${key}`];
  if (!get("id")) return null;

  return {
    id: String(get("id")),
    rewardId: String(get("reward_id")),
    venueId: String(get("venue_id")),
    eventId: get("event_id") ? String(get("event_id")) : undefined,
    code: String(get("code")),
    status: String(get("status")) as RewardRedemptionSummary["status"],
    createdAt: String(get("created_at")),
    redeemedAt: get("redeemed_at") ? String(get("redeemed_at")) : undefined,
    rewardTitle: get("reward_title") ? String(get("reward_title")) : undefined,
    venueName: get("venue_name") ? String(get("venue_name")) : undefined,
  };
}

function mapEvent(row: Record<string, unknown>, saved = false, checkedIn = false): EventSummary {
  const recurrenceType = String(row.recurrence_type ?? "none") as EventRecurrenceType;

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
    redemption: mapRedemption(row),
    attendees: mapAttendees(row.attendees),
    recurrenceType,
    recurrenceWeekday: row.recurrence_weekday == null ? undefined : Number(row.recurrence_weekday),
    recurrenceTime: row.recurrence_time ? String(row.recurrence_time) : undefined,
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

function mapTaggedUsers(value: unknown): UserMentionSummary[] {
  const parsed = typeof value === "string" ? safeJsonParse(value) : value;
  if (!Array.isArray(parsed)) return [];

  const users: UserMentionSummary[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const userId = row.userId ?? row.user_id;
    if (!userId) continue;
    users.push({
      userId: String(userId),
      username: row.username ? String(row.username) : undefined,
      displayName: row.displayName
        ? String(row.displayName)
        : row.display_name
          ? String(row.display_name)
          : row.displayLabel
            ? String(row.displayLabel)
            : row.display_label
              ? String(row.display_label)
              : undefined,
      avatarUrl: row.avatarUrl
        ? String(row.avatarUrl)
        : row.avatar_url
          ? String(row.avatar_url)
          : undefined,
    });
  }

  return users;
}

function mapFeedPost(row: Record<string, unknown>, liked = false): FeedPostSummary {
  const taggedUsers = mapTaggedUsers(row.tagged_users);
  const legacyTaggedUser =
    taggedUsers.length === 0 && row.tagged_user_id
      ? [
          {
            userId: String(row.tagged_user_id),
            username: row.tagged_person ? String(row.tagged_person).replace(/^@/, "") : undefined,
            displayName: row.tagged_person ? String(row.tagged_person) : undefined,
          },
        ]
      : [];
  const resolvedTaggedUsers = taggedUsers.length > 0 ? taggedUsers : legacyTaggedUser;

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
    taggedUserId: row.tagged_user_id ? String(row.tagged_user_id) : undefined,
    taggedUsers: resolvedTaggedUsers,
    photoUrls: Array.isArray(row.photo_urls) ? row.photo_urls.map(String) : [],
    likes: Number(row.likes ?? 0),
    comments: Number(row.comments ?? 0),
    liked: Boolean(row.liked ?? liked),
    createdAt: String(row.created_at),
  };
}

function mapUserMention(row: Record<string, unknown>): UserMentionSummary {
  return {
    userId: String(row.user_id),
    username: row.username ? String(row.username) : undefined,
    displayName: row.display_name ? String(row.display_name) : undefined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
  };
}

function normalizeMentionQuery(value?: string) {
  return (value ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._ ]/g, "")
    .slice(0, 40);
}

function mentionDisplayName(user: UserMentionSummary) {
  return user.username ? `@${user.username}` : (user.displayName ?? "").trim();
}

function normalizeTaggedUserInput(users?: UserMentionSummary[]) {
  const seen = new Set<string>();
  const normalized: UserMentionSummary[] = [];

  for (const user of users ?? []) {
    const userId = user.userId?.trim();
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    normalized.push({ userId });
    if (normalized.length >= 10) break;
  }

  return normalized;
}

async function getMentionedUser(
  sql: SqlClient,
  taggedUserId: string | undefined,
  authorUserId: string,
) {
  const userId = taggedUserId?.trim();
  if (!userId || userId === authorUserId) return null;

  const rows = await sql`
    SELECT user_id, username, display_name, avatar_url
    FROM public.user_profiles
    WHERE user_id = ${userId}
      AND account_type = 'explorer'
    LIMIT 1
  `;

  return rows[0] ? mapUserMention(rows[0]) : null;
}

async function getMentionedUsers(
  sql: SqlClient,
  taggedUsers: UserMentionSummary[] | undefined,
  fallbackTaggedUserId: string | undefined,
  authorUserId: string,
) {
  const requestedUsers = normalizeTaggedUserInput(
    taggedUsers?.length
      ? taggedUsers
      : fallbackTaggedUserId
        ? [{ userId: fallbackTaggedUserId }]
        : [],
  ).filter((user) => user.userId !== authorUserId);
  if (requestedUsers.length === 0) return [];

  const userIds = requestedUsers.map((user) => user.userId);
  const rows = await sql`
    SELECT user_id, username, display_name, avatar_url
    FROM public.user_profiles
    WHERE user_id = ANY(${userIds})
      AND account_type = 'explorer'
  `;

  const usersById = new Map(rows.map((row) => [String(row.user_id), mapUserMention(row)]));
  return userIds.map((userId) => usersById.get(userId)).filter(Boolean) as UserMentionSummary[];
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

function mapNotification(row: Record<string, unknown>): NotificationSummary {
  return {
    id: String(row.id),
    type: String(row.type) as NotificationSummary["type"],
    title: String(row.title),
    body: String(row.body ?? ""),
    targetType: String(row.target_type) as NotificationSummary["targetType"],
    targetId: String(row.target_id),
    route: String(row.route),
    image: row.image_url ? String(row.image_url) : undefined,
    read: Boolean(row.read_at),
    archived: Boolean(row.archived_at),
    createdAt: String(row.created_at),
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

const OWNER_CRM_SEGMENT_LABELS: Record<OwnerCrmSegmentKey, string> = {
  all: "Todos",
  recurring: "Recorrentes",
  inactive: "Sumidos 30d",
  "saved-not-visited": "Salvaram e não foram",
  recent: "Recentes",
  "low-rating": "Avaliaram mal",
  "follower-not-visited": "Seguidores sem check-in",
};

const EMPTY_OWNER_CRM: OwnerCrm = {
  totalCustomers: 0,
  segments: Object.entries(OWNER_CRM_SEGMENT_LABELS).map(([key, label]) => ({
    key: key as OwnerCrmSegmentKey,
    label,
    count: 0,
  })),
  customers: [],
};

function getCrmCustomerSegments(customer: Omit<OwnerCrmCustomer, "segments">) {
  const segments: OwnerCrmSegmentKey[] = ["all"];
  const lastCheckinTime = customer.lastCheckin ? new Date(customer.lastCheckin).getTime() : 0;
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  if (customer.checkins >= 2) segments.push("recurring");
  if (lastCheckinTime && now - lastCheckinTime >= thirtyDays) segments.push("inactive");
  if (customer.savedEvents > 0 && customer.checkins === 0) segments.push("saved-not-visited");
  if (lastCheckinTime && now - lastCheckinTime <= sevenDays) segments.push("recent");
  if (customer.reviews > 0 && customer.averageRating > 0 && customer.averageRating < 3) {
    segments.push("low-rating");
  }
  if (customer.followed && customer.checkins === 0) segments.push("follower-not-visited");

  return segments;
}

function mapOwnerCrm(rows: Record<string, unknown>[]): OwnerCrm {
  const customers = rows.map((row) => {
    const customer = {
      userId: String(row.user_id),
      name: row.name ? String(row.name) : "Cliente ChegaAi",
      avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
      checkins: Number(row.checkins ?? 0),
      lastCheckin: row.last_checkin ? String(row.last_checkin) : undefined,
      savedEvents: Number(row.saved_events ?? 0),
      followed: Boolean(row.followed),
      favorited: Boolean(row.favorited),
      reviews: Number(row.reviews ?? 0),
      averageRating: roundRating(row.average_rating),
      lastInteraction: row.last_interaction ? String(row.last_interaction) : undefined,
    } satisfies Omit<OwnerCrmCustomer, "segments">;

    return { ...customer, segments: getCrmCustomerSegments(customer) };
  });

  const segments = Object.entries(OWNER_CRM_SEGMENT_LABELS).map(([key, label]) => ({
    key: key as OwnerCrmSegmentKey,
    label,
    count: customers.filter((customer) => customer.segments.includes(key as OwnerCrmSegmentKey))
      .length,
  }));

  return {
    totalCustomers: customers.length,
    segments,
    customers,
  };
}

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

let notificationsSchemaReady = false;

async function ensureNotificationsSchema(sql: SqlClient) {
  if (notificationsSchemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS public.notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      unique_key text NOT NULL,
      type text NOT NULL,
      title text NOT NULL,
      body text NOT NULL DEFAULT '',
      target_type text NOT NULL,
      target_id text NOT NULL,
      route text NOT NULL,
      image_url text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      read_at timestamptz,
      archived_at timestamptz,
      pushed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT notifications_user_unique_key_unique UNIQUE (user_id, unique_key)
    )
  `;

  await sql`
    ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS archived_at timestamptz
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS public.push_tokens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      token text NOT NULL UNIQUE,
      platform text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON public.notifications (user_id, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS notifications_user_active_created_idx
    ON public.notifications (user_id, created_at DESC)
    WHERE archived_at IS NULL
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
    ON public.notifications (user_id, created_at DESC)
    WHERE read_at IS NULL AND archived_at IS NULL
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS push_tokens_user_idx
    ON public.push_tokens (user_id, last_seen_at DESC)
  `;

  await ensureNotificationSecurityPolicies(sql);

  notificationsSchemaReady = true;
}

async function ensureNotificationSecurityPolicies(sql: SqlClient) {
  await sql`
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY
  `;

  await sql`
    ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY
  `;

  await sql`
    REVOKE ALL ON public.notifications FROM anon
  `;

  await sql`
    REVOKE ALL ON public.push_tokens FROM anon
  `;

  await sql`
    GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated
  `;

  await sql`
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notifications'
          AND policyname = 'Users can read own notifications'
      ) THEN
        CREATE POLICY "Users can read own notifications"
          ON public.notifications FOR SELECT
          TO authenticated
          USING (user_id = auth.uid()::text);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notifications'
          AND policyname = 'Users can update own notifications'
      ) THEN
        CREATE POLICY "Users can update own notifications"
          ON public.notifications FOR UPDATE
          TO authenticated
          USING (user_id = auth.uid()::text)
          WITH CHECK (user_id = auth.uid()::text);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notifications'
          AND policyname = 'Users can delete own notifications'
      ) THEN
        CREATE POLICY "Users can delete own notifications"
          ON public.notifications FOR DELETE
          TO authenticated
          USING (user_id = auth.uid()::text);
      END IF;
    END $$
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'push_tokens'
          AND policyname = 'Users can read own push tokens'
      ) THEN
        CREATE POLICY "Users can read own push tokens"
          ON public.push_tokens FOR SELECT
          TO authenticated
          USING (user_id = auth.uid()::text);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'push_tokens'
          AND policyname = 'Users can insert own push tokens'
      ) THEN
        CREATE POLICY "Users can insert own push tokens"
          ON public.push_tokens FOR INSERT
          TO authenticated
          WITH CHECK (user_id = auth.uid()::text);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'push_tokens'
          AND policyname = 'Users can update own push tokens'
      ) THEN
        CREATE POLICY "Users can update own push tokens"
          ON public.push_tokens FOR UPDATE
          TO authenticated
          USING (user_id = auth.uid()::text)
          WITH CHECK (user_id = auth.uid()::text);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'push_tokens'
          AND policyname = 'Users can delete own push tokens'
      ) THEN
        CREATE POLICY "Users can delete own push tokens"
          ON public.push_tokens FOR DELETE
          TO authenticated
          USING (user_id = auth.uid()::text);
      END IF;
    END $$
  `;
}

async function materializeDueEventReminderNotifications(sql: SqlClient, userId: string) {
  await ensureEventsRecurrenceSchema(sql);
  await ensureNotificationsSchema(sql);

  await sql`
    INSERT INTO public.notifications (
      user_id,
      unique_key,
      type,
      title,
      body,
      target_type,
      target_id,
      route,
      image_url,
      created_at
    )
    SELECT
      ${userId},
      'event_reminder:' || e.id::text || ':' || to_char(occurrence.starts_at, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
      'event_reminder',
      e.title,
      'Seu evento salvo começa ' || CASE
        WHEN EXTRACT(EPOCH FROM (occurrence.starts_at - now())) < 3600
          THEN 'em ' || GREATEST(1, ROUND(EXTRACT(EPOCH FROM (occurrence.starts_at - now())) / 60))::int || ' min.'
        ELSE 'em ' || ROUND(EXTRACT(EPOCH FROM (occurrence.starts_at - now())) / 3600)::int || ' h.'
      END,
      'event',
      e.id::text,
      '/events/' || e.id::text,
      e.image_url,
      LEAST(now(), occurrence.starts_at)
    FROM public.saved_events se
    JOIN public.events e ON e.id = se.event_id
    CROSS JOIN LATERAL (
      SELECT CASE
        WHEN e.recurrence_type = 'weekly' THEN
          CASE
            WHEN date_trunc('day', now())
              + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
              + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
            THEN date_trunc('day', now())
              + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
              + e.recurrence_time
            ELSE date_trunc('day', now())
              + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
              + e.recurrence_time
              + interval '7 days'
          END
        ELSE e.starts_at
      END AS starts_at
    ) occurrence
    WHERE se.user_id = ${userId}
      AND e.status = 'published'
      AND occurrence.starts_at > now()
      AND occurrence.starts_at <= now() + interval '24 hours'
    ON CONFLICT (user_id, unique_key) DO NOTHING
  `;
}

async function ensureGroupPlansSchema(_sql: SqlClient) {
  return;
}

let postsSchemaReady = false;

async function ensurePostsSchema(sql: SqlClient) {
  if (postsSchemaReady) return;

  await sql`
    ALTER TABLE public.user_posts
    ADD COLUMN IF NOT EXISTS tagged_user_id text
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS user_posts_tagged_user_created_idx
    ON public.user_posts (tagged_user_id, created_at DESC)
    WHERE tagged_user_id IS NOT NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS public.user_post_mentions (
      post_id uuid NOT NULL REFERENCES public.user_posts(id) ON DELETE CASCADE,
      user_id text NOT NULL,
      display_label text NOT NULL,
      position integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (post_id, user_id),
      CONSTRAINT user_post_mentions_position_check CHECK (position >= 0 AND position < 10)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS user_post_mentions_post_position_idx
    ON public.user_post_mentions (post_id, position)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS user_post_mentions_user_created_idx
    ON public.user_post_mentions (user_id, created_at DESC)
  `;

  await sql`
    ALTER TABLE public.user_post_mentions ENABLE ROW LEVEL SECURITY
  `;

  await sql`
    INSERT INTO public.user_post_mentions (post_id, user_id, display_label, position)
    SELECT
      p.id,
      p.tagged_user_id,
      COALESCE(p.tagged_person, '@' || up.username, up.display_name, 'Pessoa marcada'),
      0
    FROM public.user_posts p
    LEFT JOIN public.user_profiles up ON up.user_id = p.tagged_user_id
    WHERE p.tagged_user_id IS NOT NULL
    ON CONFLICT (post_id, user_id) DO NOTHING
  `;

  postsSchemaReady = true;
}

async function ensureEventReviewsSchema(_sql: SqlClient) {
  return;
}

let eventsRecurrenceSchemaReady = false;

async function ensureEventsRecurrenceSchema(sql: SqlClient) {
  if (eventsRecurrenceSchemaReady) return;

  await sql`
    ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS recurrence_weekday integer,
    ADD COLUMN IF NOT EXISTS recurrence_time time
  `;

  await sql`
    ALTER TABLE public.checkins
    ADD COLUMN IF NOT EXISTS occurrence_starts_at timestamp with time zone
  `;

  eventsRecurrenceSchemaReady = true;
}

function mapVenue(row: Record<string, unknown>): VenueSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    category: row.category ? String(row.category) : undefined,
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
    redemption: mapRedemption(row),
  };
}

let rewardsSchemaReady = false;

async function ensureRewardsSchema(sql: SqlClient) {
  if (rewardsSchemaReady) return;

  await sql`
    ALTER TABLE public.venue_rewards
    ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS venue_rewards_event_status_idx
    ON public.venue_rewards (event_id, status, updated_at DESC)
    WHERE event_id IS NOT NULL
  `;

  rewardsSchemaReady = true;
}

let rewardRedemptionsSchemaReady = false;

async function ensureRewardRedemptionsSchema(sql: SqlClient) {
  if (rewardRedemptionsSchemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS public.reward_redemptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      reward_id uuid NOT NULL REFERENCES public.venue_rewards(id) ON DELETE CASCADE,
      venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
      event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
      user_id text NOT NULL,
      code text NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      redeemed_at timestamptz,
      redeemed_by text,
      CONSTRAINT reward_redemptions_status_check CHECK (status IN ('pending', 'redeemed', 'expired', 'cancelled')),
      CONSTRAINT reward_redemptions_reward_user_unique UNIQUE (reward_id, user_id)
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS reward_redemptions_code_idx
    ON public.reward_redemptions (code)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS reward_redemptions_venue_status_idx
    ON public.reward_redemptions (venue_id, status, created_at DESC)
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.generate_redemption_code()
    RETURNS text
    LANGUAGE plpgsql
    VOLATILE
    AS $fn$
    DECLARE
      alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      bytes bytea := gen_random_bytes(6);
      result text := '';
      i int;
    BEGIN
      FOR i IN 0..5 LOOP
        result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
      END LOOP;
      RETURN result;
    END;
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.claim_reward_redemption(
      p_reward_id uuid,
      p_user_id text,
      p_event_id uuid DEFAULT NULL
    )
    RETURNS public.reward_redemptions
    LANGUAGE plpgsql
    VOLATILE
    AS $fn$
    DECLARE
      v_reward public.venue_rewards%rowtype;
      v_existing public.reward_redemptions%rowtype;
      v_has_existing boolean := false;
      v_issued_count bigint;
      v_code text;
      v_attempt int;
    BEGIN
      SELECT * INTO v_reward
      FROM public.venue_rewards
      WHERE id = p_reward_id AND status = 'active'
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN NULL;
      END IF;

      IF v_reward.event_id IS NOT NULL AND v_reward.event_id IS DISTINCT FROM p_event_id THEN
        RETURN NULL;
      END IF;

      IF v_reward.valid_until IS NOT NULL AND v_reward.valid_until <= now() THEN
        RETURN NULL;
      END IF;

      SELECT * INTO v_existing
      FROM public.reward_redemptions
      WHERE reward_id = p_reward_id AND user_id = p_user_id;
      v_has_existing := FOUND;

      IF v_has_existing AND v_existing.status IN ('pending', 'redeemed') THEN
        RETURN v_existing;
      END IF;

      IF v_reward.max_redemptions IS NOT NULL THEN
        SELECT count(*) INTO v_issued_count
        FROM public.reward_redemptions
        WHERE reward_id = p_reward_id AND status IN ('pending', 'redeemed');

        IF v_issued_count >= v_reward.max_redemptions THEN
          RETURN NULL;
        END IF;
      END IF;

      FOR v_attempt IN 1..5 LOOP
        v_code := public.generate_redemption_code();
        BEGIN
          IF v_has_existing THEN
            UPDATE public.reward_redemptions
            SET status = 'pending',
                code = v_code,
                event_id = coalesce(p_event_id, event_id),
                created_at = now(),
                redeemed_at = NULL,
                redeemed_by = NULL
            WHERE id = v_existing.id
            RETURNING * INTO v_existing;
          ELSE
            INSERT INTO public.reward_redemptions (reward_id, venue_id, event_id, user_id, code)
            VALUES (p_reward_id, v_reward.venue_id, p_event_id, p_user_id, v_code)
            RETURNING * INTO v_existing;
          END IF;
          RETURN v_existing;
        EXCEPTION WHEN unique_violation THEN
          NULL;
        END;
      END LOOP;

      RAISE EXCEPTION 'Não foi possível gerar um código de resgate único.';
    END;
    $fn$
  `;

  await sql`
    CREATE OR REPLACE FUNCTION public.redeem_reward_code(
      p_code text,
      p_owner_user_id text
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    VOLATILE
    AS $fn$
    DECLARE
      v_row record;
    BEGIN
      SELECT rr.id, rr.code, rr.status, rr.created_at, rr.redeemed_at,
             vr.status AS reward_status, vr.valid_until, vr.title AS reward_title,
             v.name AS venue_name,
             coalesce(up.display_name, 'Cliente') AS customer_name
      INTO v_row
      FROM public.reward_redemptions rr
      JOIN public.venue_rewards vr ON vr.id = rr.reward_id
      JOIN public.venues v ON v.id = rr.venue_id
      LEFT JOIN public.user_profiles up ON up.user_id = rr.user_id
      WHERE rr.code = upper(trim(p_code))
        AND v.owner_user_id = p_owner_user_id
      FOR UPDATE OF rr;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('result', 'not_found');
      END IF;

      IF v_row.status = 'redeemed' THEN
        RETURN jsonb_build_object(
          'result', 'already_redeemed',
          'reward_title', v_row.reward_title,
          'customer_name', v_row.customer_name,
          'redeemed_at', v_row.redeemed_at
        );
      END IF;

      IF v_row.status IN ('expired', 'cancelled') OR v_row.reward_status <> 'active' THEN
        RETURN jsonb_build_object('result', 'reward_inactive');
      END IF;

      IF v_row.valid_until IS NOT NULL AND v_row.valid_until <= now() THEN
        UPDATE public.reward_redemptions SET status = 'expired' WHERE id = v_row.id;
        RETURN jsonb_build_object('result', 'expired');
      END IF;

      UPDATE public.reward_redemptions
      SET status = 'redeemed', redeemed_at = now(), redeemed_by = p_owner_user_id
      WHERE id = v_row.id;

      RETURN jsonb_build_object(
        'result', 'redeemed',
        'reward_title', v_row.reward_title,
        'customer_name', v_row.customer_name,
        'venue_name', v_row.venue_name,
        'redeemed_at', now()
      );
    END;
    $fn$
  `;

  await sql`
    REVOKE EXECUTE ON FUNCTION public.generate_redemption_code()
    FROM public, anon, authenticated
  `;

  await sql`
    REVOKE EXECUTE ON FUNCTION public.claim_reward_redemption(uuid, text, uuid)
    FROM public, anon, authenticated
  `;

  await sql`
    REVOKE EXECUTE ON FUNCTION public.redeem_reward_code(text, text)
    FROM public, anon, authenticated
  `;

  rewardRedemptionsSchemaReady = true;
}

async function claimRewardForAction(
  sql: SqlClient,
  input: { venueId: string; eventId?: string; userId: string; action: VenueReward["action"] },
): Promise<RewardRedemptionSummary | null> {
  await ensureRewardRedemptionsSchema(sql);

  const rewardRows = await sql`
    SELECT id
    FROM public.venue_rewards
    WHERE venue_id = ${input.venueId}
      AND action = ${input.action}
      AND status = 'active'
      AND (event_id IS NULL OR event_id = ${input.eventId ?? null})
      AND (valid_until IS NULL OR valid_until > now())
    ORDER BY CASE WHEN event_id = ${input.eventId ?? null} THEN 0 ELSE 1 END, updated_at DESC
    LIMIT 1
  `;
  const rewardId = rewardRows[0]?.id ? String(rewardRows[0].id) : null;
  if (!rewardId) return null;
  const eventId = input.eventId ?? null;

  const rows = await sql`
    SELECT * FROM public.claim_reward_redemption(${rewardId}, ${input.userId}, ${eventId})
  `;
  const row = rows[0];
  if (!row?.id) return null;

  // Notifica quem desbloqueou a recompensa. unique_key pela redemption garante
  // que não há duplicatas em check-ins repetidos. Rota para o evento ou o local.
  const redemptionId = String(row.id);
  const rewardRoute = eventId ? `/events/${eventId}` : `/venues/${input.venueId}`;
  await ensureNotificationsSchema(sql);
  await sql`
    INSERT INTO public.notifications (
      user_id, unique_key, type, title, body, target_type, target_id, route, created_at
    )
    SELECT
      ${input.userId},
      ${`reward:${redemptionId}`},
      'reward',
      'Recompensa liberada',
      'Você desbloqueou: ' || vr.title,
      ${eventId ? "event" : "venue"},
      ${eventId ?? input.venueId},
      ${rewardRoute},
      now()
    FROM public.venue_rewards vr
    WHERE vr.id = ${rewardId}
    ON CONFLICT (user_id, unique_key) DO NOTHING
  `;

  return mapRedemption(row, "");
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
      occurrence.starts_at AS starts_at,
      e.recurrence_type,
      e.recurrence_weekday,
      e.recurrence_time,
      e.price_cents,
      e.confirmed_count,
      (
        SELECT COUNT(DISTINCT c.user_id)::int
        FROM public.checkins c
        WHERE c.event_id = e.id
          AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
      ) AS attendee_count,
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
            AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
          ORDER BY c.created_at DESC
          LIMIT 3
        ) attendee
      ), '[]'::jsonb) AS attendees,
        e.image_url,
        (e.status = 'published' AND occurrence.starts_at <= now() AND occurrence.starts_at >= now() - ${eventActiveWindowInterval}::interval) AS is_live,
        v.name AS venue_name,
        v.neighborhood,
        v.address,
        v.category AS venue_category
    FROM public.events e
    CROSS JOIN LATERAL (
      SELECT CASE
        WHEN e.recurrence_type = 'weekly' THEN
          CASE
            WHEN date_trunc('day', now())
              + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
              + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
            THEN date_trunc('day', now())
              + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
              + e.recurrence_time
            ELSE date_trunc('day', now())
              + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
              + e.recurrence_time
              + interval '7 days'
          END
        ELSE e.starts_at
      END AS starts_at
    ) occurrence
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
    await ensureEventsRecurrenceSchema(sql);

    const rows = await sql`
      SELECT
        e.id,
        e.venue_id,
        e.title,
        e.category,
        e.description,
        e.created_at,
        occurrence.starts_at AS starts_at,
        e.recurrence_type,
        e.recurrence_weekday,
        e.recurrence_time,
        e.price_cents,
        e.confirmed_count,
        (
          SELECT COUNT(DISTINCT c.user_id)::int
          FROM public.checkins c
          WHERE c.event_id = e.id
            AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
        ) AS attendee_count,
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
              AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
            ORDER BY c.created_at DESC
            LIMIT 3
          ) attendee
        ), '[]'::jsonb) AS attendees,
        e.image_url,
        (occurrence.starts_at <= now() AND occurrence.starts_at >= now() - ${eventActiveWindowInterval}::interval) AS is_live,
        v.name AS venue_name,
        v.neighborhood,
        v.address,
        v.category AS venue_category,
        v.latitude,
        v.longitude
      FROM public.events e
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN e.recurrence_type = 'weekly' THEN
            CASE
              WHEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
              THEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
              ELSE date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
                + interval '7 days'
            END
          ELSE (e.starts_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'
        END AS starts_at
      ) occurrence
      JOIN public.venues v ON v.id = e.venue_id
      WHERE e.status = 'published'
      ORDER BY occurrence.starts_at ASC
    `;

    return rows.map((row) => mapEvent(row));
  },
);

export const getVenues = createServerFn({ method: "GET" }).handler(
  async (): Promise<VenueSummary[]> => {
    const sql = await getSql();
    if (!sql) return [];
    await ensureEventsRecurrenceSchema(sql);
    await ensureRewardsSchema(sql);
    await ensureVenueFollowersSchema(sql);

    const rows = await sql`
      SELECT
        v.id,
        v.name,
        v.category,
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
            AND venue_occurrence.starts_at <= now()
            AND venue_occurrence.starts_at >= now() - ${eventActiveWindowInterval}::interval
        ) AS live_events,
        COUNT(DISTINCT c.user_id) AS checkins,
        COUNT(DISTINCT fv.user_id) AS favorite_count,
        COUNT(DISTINCT vf.user_id) AS follower_count,
        r.id AS reward_id,
        r.venue_id AS reward_venue_id,
        r.event_id AS reward_event_id,
        r.action AS reward_action,
        r.title AS reward_title,
        r.description AS reward_description,
        r.status AS reward_status,
        r.max_redemptions AS reward_max_redemptions,
        r.valid_until AS reward_valid_until
      FROM public.venues v
      LEFT JOIN public.events e ON e.venue_id = v.id
      LEFT JOIN LATERAL (
        SELECT CASE
          WHEN e.recurrence_type = 'weekly' THEN
            CASE
              WHEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
              THEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
              ELSE date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
                + interval '7 days'
            END
          ELSE (e.starts_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'
        END AS starts_at
      ) venue_occurrence ON true
      LEFT JOIN public.checkins c ON c.venue_id = v.id
        AND c.event_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.events ce
          WHERE ce.id = c.event_id
            AND ce.status <> 'cancelled'
        )
      LEFT JOIN public.favorite_venues fv ON fv.venue_id = v.id
      LEFT JOIN public.venue_followers vf ON vf.venue_id = v.id
      LEFT JOIN LATERAL (
        SELECT *
        FROM public.venue_rewards vr
        WHERE vr.venue_id = v.id
          AND vr.status = 'active'
          AND vr.event_id IS NULL
          AND (vr.valid_until IS NULL OR vr.valid_until > now())
        ORDER BY vr.updated_at DESC
        LIMIT 1
      ) r ON true
      GROUP BY v.id, r.id, r.venue_id, r.event_id, r.action, r.title, r.description, r.status, r.max_redemptions, r.valid_until
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
    await ensureEventsRecurrenceSchema(sql);

    const rows = await sql`
      SELECT c.event_id
      FROM public.checkins c
      JOIN public.events e ON e.id = c.event_id
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN e.recurrence_type = 'weekly' THEN
            CASE
              WHEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
              THEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
              ELSE date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
                + interval '7 days'
            END
          ELSE e.starts_at
        END AS starts_at
      ) occurrence
      WHERE c.user_id = ${userId}
        AND e.status = 'published'
        AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
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
    await ensureEventsRecurrenceSchema(sql);

    const rows = await sql`
      SELECT
        e.id,
        e.venue_id,
        e.title,
        e.category,
        e.description,
        e.created_at,
        occurrence.starts_at AS starts_at,
        e.recurrence_type,
        e.recurrence_weekday,
        e.recurrence_time,
        e.price_cents,
        e.confirmed_count,
        (
          SELECT COUNT(DISTINCT c.user_id)::int
          FROM public.checkins c
          WHERE c.event_id = e.id
            AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
        ) AS attendee_count,
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
              AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
            ORDER BY c.created_at DESC
            LIMIT 3
          ) attendee
        ), '[]'::jsonb) AS attendees,
        e.image_url,
        (occurrence.starts_at <= now() AND occurrence.starts_at >= now() - ${eventActiveWindowInterval}::interval) AS is_live,
        v.name AS venue_name,
        v.neighborhood,
        v.address,
        v.category AS venue_category,
        v.latitude,
        v.longitude
      FROM public.saved_events se
      JOIN public.events e ON e.id = se.event_id
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN e.recurrence_type = 'weekly' THEN
            CASE
              WHEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
              THEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
              ELSE date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
                + interval '7 days'
            END
          ELSE e.starts_at
        END AS starts_at
      ) occurrence
      JOIN public.venues v ON v.id = e.venue_id
      WHERE se.user_id = ${userId}
        AND e.status = 'published'
      ORDER BY occurrence.starts_at ASC
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
    await ensureEventsRecurrenceSchema(sql);

    const rows = await sql`
      SELECT
        e.id,
        e.title,
        occurrence.starts_at AS starts_at,
        e.image_url,
        v.name AS venue_name,
        v.neighborhood
      FROM public.saved_events se
      JOIN public.events e ON e.id = se.event_id
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN e.recurrence_type = 'weekly' THEN
            CASE
              WHEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
              THEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
              ELSE date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
                + interval '7 days'
            END
          ELSE e.starts_at
        END AS starts_at
      ) occurrence
      JOIN public.venues v ON v.id = e.venue_id
      WHERE se.user_id = ${userId}
        AND e.status = 'published'
        AND occurrence.starts_at > now()
        AND occurrence.starts_at <= now() + interval '24 hours'
      ORDER BY occurrence.starts_at ASC
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
          AND c.event_id IS NOT NULL
          AND e.status <> 'cancelled'
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
    await ensureEventsRecurrenceSchema(sql);

    const checkins = await sql`
      SELECT COALESCE(c.occurrence_starts_at, e.starts_at) <= now() - ${eventActiveWindowInterval}::interval AS review_available
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

    const existingReviews = await sql`
      SELECT 1
      FROM public.event_reviews
      WHERE user_id = ${userId}
        AND event_id = ${data.eventId}
      LIMIT 1
    `;
    if (existingReviews.length > 0) throw new Error("Você já avaliou esse evento.");

    const rows = await sql`
      INSERT INTO public.event_reviews (event_id, user_id, atmosphere, music, price, movement, comment)
      VALUES (${data.eventId}, ${userId}, ${atmosphere}, ${music}, ${price}, ${movement}, ${comment})
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
    const userId = await requireAuthenticatedUserId(data.userId);
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
        AND e.starts_at >= date_trunc('day', now())
        AND e.starts_at > now() - ${eventActiveWindowInterval}::interval
      ORDER BY e.starts_at ASC
    `;

    if (eventRows.length < 2) {
      throw new Error("Escolha eventos que ainda vão acontecer ou estão rolando hoje.");
    }

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
        COALESCE(up.username, up.display_name, 'Alguém por perto') AS author_name,
        up.avatar_url AS author_avatar_url,
        p.venue_id,
        p.event_id,
        p.caption,
        p.tagged_person,
        p.tagged_user_id,
        COALESCE((
          SELECT json_agg(json_build_object(
            'userId', upm.user_id,
            'username', mention_profile.username,
            'displayName', COALESCE(mention_profile.display_name, upm.display_label),
            'avatarUrl', mention_profile.avatar_url
          ) ORDER BY upm.position)
          FROM public.user_post_mentions upm
          LEFT JOIN public.user_profiles mention_profile ON mention_profile.user_id = upm.user_id
          WHERE upm.post_id = p.id
        ), '[]'::json) AS tagged_users,
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
      GROUP BY p.id, up.username, up.display_name, up.avatar_url, v.id, e.id
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
    await ensureEventsRecurrenceSchema(sql);

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
      CROSS JOIN LATERAL (
        SELECT now() AT TIME ZONE 'America/Sao_Paulo' AS current_at
      ) local_time
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN e.recurrence_type = 'weekly' THEN
            CASE
              WHEN date_trunc('day', local_time.current_at)
                + ((e.recurrence_weekday - EXTRACT(DOW FROM local_time.current_at)::int) * interval '1 day')
                + e.recurrence_time > local_time.current_at - ${eventPostWindowInterval}::interval
              THEN (date_trunc('day', local_time.current_at)
                + ((e.recurrence_weekday - EXTRACT(DOW FROM local_time.current_at)::int) * interval '1 day')
                + e.recurrence_time) AT TIME ZONE 'America/Sao_Paulo'
              ELSE (date_trunc('day', local_time.current_at)
                + ((e.recurrence_weekday - EXTRACT(DOW FROM local_time.current_at)::int) * interval '1 day')
                + e.recurrence_time
                + interval '7 days') AT TIME ZONE 'America/Sao_Paulo'
            END
          ELSE e.starts_at
        END AS starts_at
      ) occurrence
      WHERE c.user_id = ${userId}
        AND e.status = 'published'
        AND occurrence.starts_at <= now()
        AND occurrence.starts_at >= now() - ${eventPostWindowInterval}::interval
        AND (
          e.recurrence_type <> 'weekly'
          OR (
            c.occurrence_starts_at IS NOT NULL
            AND c.occurrence_starts_at >= occurrence.starts_at - interval '1 minute'
            AND c.occurrence_starts_at < occurrence.starts_at + interval '1 minute'
          )
        )
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

export const searchUserMentions = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string; query?: string }) => data)
  .handler(async ({ data }): Promise<UserMentionSummary[]> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return [];

    const query = normalizeMentionQuery(data.query);
    if (query.length < 2) return [];

    const sql = await getSql();
    if (!sql) return [];

    const prefix = `${query}%`;
    const contains = `%${query}%`;
    const rows = await sql`
      SELECT user_id, username, display_name, avatar_url
      FROM public.user_profiles
      WHERE user_id <> ${userId}
        AND account_type = 'explorer'
        AND (
          translate(lower(COALESCE(username, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') LIKE ${contains}
          OR translate(lower(COALESCE(display_name, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') LIKE ${contains}
        )
      ORDER BY
        CASE
          WHEN translate(lower(COALESCE(username, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') LIKE ${prefix} THEN 0
          WHEN translate(lower(COALESCE(display_name, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') LIKE ${prefix} THEN 1
          ELSE 2
        END,
        COALESCE(username, display_name) ASC
      LIMIT 8
    `;

    return rows.map(mapUserMention);
  });

export const createUserPost = createServerFn({ method: "POST" })
  .inputValidator((data: CreateUserPostInput) => data)
  .handler(async ({ data }): Promise<FeedPostSummary> => {
    const userId = await requireAuthenticatedUserId(data.userId);
    if (!data.eventId) throw new Error("Selecione um evento recente.");

    const caption = data.caption.trim();
    const taggedPerson = data.taggedPerson?.trim();
    const taggedUserId = data.taggedUserId?.trim();
    const photoUrls = data.photoUrls
      .map((url) => url.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map(assertAllowedPublicMediaUrl);
    if (!caption && photoUrls.length === 0) {
      throw new Error("Escreva uma legenda ou adicione pelo menos uma foto.");
    }

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensurePostsSchema(sql);
    await ensureEventsRecurrenceSchema(sql);
    await ensurePostAuthorProfile(sql, userId, data.authorName, data.authorAvatarUrl);
    const mentionedUsers = await getMentionedUsers(sql, data.taggedUsers, taggedUserId, userId);
    const firstMentionedUser = mentionedUsers[0];
    const storedTaggedUserId = firstMentionedUser?.userId;
    const storedTaggedPerson = firstMentionedUser
      ? mentionDisplayName(firstMentionedUser)
      : taggedPerson;

    const events = await sql`
      SELECT e.id, e.venue_id
      FROM public.checkins c
      JOIN public.events e ON e.id = c.event_id
      CROSS JOIN LATERAL (
        SELECT now() AT TIME ZONE 'America/Sao_Paulo' AS current_at
      ) local_time
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN e.recurrence_type = 'weekly' THEN
            CASE
              WHEN date_trunc('day', local_time.current_at)
                + ((e.recurrence_weekday - EXTRACT(DOW FROM local_time.current_at)::int) * interval '1 day')
                + e.recurrence_time > local_time.current_at - ${eventPostWindowInterval}::interval
              THEN (date_trunc('day', local_time.current_at)
                + ((e.recurrence_weekday - EXTRACT(DOW FROM local_time.current_at)::int) * interval '1 day')
                + e.recurrence_time) AT TIME ZONE 'America/Sao_Paulo'
              ELSE (date_trunc('day', local_time.current_at)
                + ((e.recurrence_weekday - EXTRACT(DOW FROM local_time.current_at)::int) * interval '1 day')
                + e.recurrence_time
                + interval '7 days') AT TIME ZONE 'America/Sao_Paulo'
            END
          ELSE e.starts_at
        END AS starts_at
      ) occurrence
      WHERE c.user_id = ${userId}
        AND e.id = ${data.eventId}
        AND e.status = 'published'
        AND occurrence.starts_at <= now()
        AND occurrence.starts_at >= now() - ${eventPostWindowInterval}::interval
        AND (
          e.recurrence_type <> 'weekly'
          OR (
            c.occurrence_starts_at IS NOT NULL
            AND c.occurrence_starts_at >= occurrence.starts_at - interval '1 minute'
            AND c.occurrence_starts_at < occurrence.starts_at + interval '1 minute'
          )
        )
      LIMIT 1
    `;
    const event = events[0];
    if (!event) throw new Error("Faça check-in em um evento recente para postar.");

    const posts = await sql`
      INSERT INTO public.user_posts (user_id, venue_id, event_id, caption, tagged_person, tagged_user_id)
      VALUES (
        ${userId},
        ${String(event.venue_id)},
        ${data.eventId},
        ${caption},
        ${storedTaggedPerson || null},
        ${storedTaggedUserId ?? null}
      )
      RETURNING id
    `;
    const postId = String(posts[0].id);

    await syncPostMentions(sql, postId, mentionedUsers);
    await notifyTaggedUsers(sql, {
      postId,
      authorUserId: userId,
      taggedUsers: mentionedUsers,
      authorName: data.authorName,
      caption,
    });

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
        COALESCE(up.username, up.display_name, 'Você') AS author_name,
        up.avatar_url AS author_avatar_url,
        p.venue_id,
        p.event_id,
        p.caption,
        p.tagged_person,
        p.tagged_user_id,
        COALESCE((
          SELECT json_agg(json_build_object(
            'userId', upm.user_id,
            'username', mention_profile.username,
            'displayName', COALESCE(mention_profile.display_name, upm.display_label),
            'avatarUrl', mention_profile.avatar_url
          ) ORDER BY upm.position)
          FROM public.user_post_mentions upm
          LEFT JOIN public.user_profiles mention_profile ON mention_profile.user_id = upm.user_id
          WHERE upm.post_id = p.id
        ), '[]'::json) AS tagged_users,
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
      GROUP BY p.id, up.username, up.display_name, up.avatar_url, v.id, e.id
      LIMIT 1
    `;

    return mapFeedPost(rows[0]);
  });

export const updateUserPost = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateUserPostInput) => data)
  .handler(async ({ data }): Promise<FeedPostSummary> => {
    const userId = await requireAuthenticatedUserId(data.userId);
    const caption = data.caption.trim();
    const nextPhotoUrls = data.photoUrls
      ?.map((url) => url.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map(assertAllowedPublicMediaUrl);
    const taggedPerson = data.taggedPerson?.trim();
    const taggedUserId = data.taggedUserId?.trim();

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensurePostsSchema(sql);
    const mentionedUsers = await getMentionedUsers(sql, data.taggedUsers, taggedUserId, userId);
    const firstMentionedUser = mentionedUsers[0];
    const storedTaggedUserId = firstMentionedUser?.userId;
    const storedTaggedPerson = firstMentionedUser
      ? mentionDisplayName(firstMentionedUser)
      : taggedPerson;

    const existing = await sql`
      SELECT
        p.id,
        p.user_id,
        p.tagged_user_id,
        COUNT(pm.id)::int AS photo_count
      FROM public.user_posts p
      LEFT JOIN public.user_post_media pm ON pm.post_id = p.id
      WHERE p.id = ${data.postId}
      GROUP BY p.id
      LIMIT 1
    `;
    const post = existing[0];
    if (!post) throw new Error("Post não encontrado.");
    if (String(post.user_id) !== userId)
      throw new Error("Você só pode editar seus próprios posts.");
    const finalPhotoCount = nextPhotoUrls ? nextPhotoUrls.length : Number(post.photo_count ?? 0);
    if (!caption && finalPhotoCount === 0) {
      throw new Error("Escreva uma legenda ou mantenha uma foto no post.");
    }

    const previousTaggedUserIds = await getPostMentionUserIds(sql, data.postId);

    await sql`
      UPDATE public.user_posts
      SET
        caption = ${caption},
        tagged_person = ${storedTaggedPerson || null},
        tagged_user_id = ${storedTaggedUserId ?? null},
        updated_at = now()
      WHERE id = ${data.postId}
        AND user_id = ${userId}
    `;

    if (nextPhotoUrls) {
      await sql`
        DELETE FROM public.user_post_media
        WHERE post_id = ${data.postId}
      `;

      for (const [position, mediaUrl] of nextPhotoUrls.entries()) {
        await sql`
          INSERT INTO public.user_post_media (post_id, media_url, position)
          VALUES (${data.postId}, ${mediaUrl}, ${position})
        `;
      }
    }

    await syncPostMentions(sql, data.postId, mentionedUsers);
    await notifyTaggedUsers(sql, {
      postId: data.postId,
      authorUserId: userId,
      taggedUsers: mentionedUsers,
      previousTaggedUserIds,
      caption,
    });

    const rows = await sql`
      SELECT
        p.id,
        p.user_id,
        COALESCE(up.username, up.display_name, 'Você') AS author_name,
        up.avatar_url AS author_avatar_url,
        p.venue_id,
        p.event_id,
        p.caption,
        p.tagged_person,
        p.tagged_user_id,
        COALESCE((
          SELECT json_agg(json_build_object(
            'userId', upm.user_id,
            'username', mention_profile.username,
            'displayName', COALESCE(mention_profile.display_name, upm.display_label),
            'avatarUrl', mention_profile.avatar_url
          ) ORDER BY upm.position)
          FROM public.user_post_mentions upm
          LEFT JOIN public.user_profiles mention_profile ON mention_profile.user_id = upm.user_id
          WHERE upm.post_id = p.id
        ), '[]'::json) AS tagged_users,
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
            AND current_like.user_id = ${userId}
        ) AS liked
      FROM public.user_posts p
      JOIN public.venues v ON v.id = p.venue_id
      LEFT JOIN public.events e ON e.id = p.event_id
      LEFT JOIN public.user_profiles up ON up.user_id = p.user_id
      LEFT JOIN public.user_post_media pm ON pm.post_id = p.id
      LEFT JOIN public.user_post_likes pl ON pl.post_id = p.id
      LEFT JOIN public.user_post_comments pc ON pc.post_id = p.id
      WHERE p.id = ${data.postId}
      GROUP BY p.id, up.username, up.display_name, up.avatar_url, v.id, e.id
      LIMIT 1
    `;

    return mapFeedPost(rows[0]);
  });

export const deleteUserPost = createServerFn({ method: "POST" })
  .inputValidator((data: PostActionInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensurePostsSchema(sql);

    const rows = await sql`
      DELETE FROM public.user_posts
      WHERE id = ${data.postId}
        AND user_id = ${userId}
      RETURNING id
    `;

    if (rows.length === 0) throw new Error("Post não encontrado ou sem permissão para excluir.");
    return { deleted: true };
  });

async function ensurePostAuthorProfile(
  sql: SqlClient,
  userId: string,
  authorName?: string,
  authorAvatarUrl?: string,
) {
  const displayName = authorName?.trim();
  const avatarUrl = authorAvatarUrl?.trim()
    ? assertAllowedPublicMediaUrl(authorAvatarUrl.trim())
    : undefined;
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

async function getPostMentionUserIds(sql: SqlClient, postId: string) {
  const rows = await sql`
    SELECT user_id
    FROM public.user_post_mentions
    WHERE post_id = ${postId}
  `;

  return rows.map((row) => String(row.user_id));
}

async function syncPostMentions(sql: SqlClient, postId: string, users: UserMentionSummary[]) {
  await sql`
    DELETE FROM public.user_post_mentions
    WHERE post_id = ${postId}
  `;

  for (const [position, user] of users.entries()) {
    await sql`
      INSERT INTO public.user_post_mentions (post_id, user_id, display_label, position)
      VALUES (${postId}, ${user.userId}, ${mentionDisplayName(user)}, ${position})
      ON CONFLICT (post_id, user_id) DO UPDATE SET
        display_label = EXCLUDED.display_label,
        position = EXCLUDED.position
    `;
  }
}

async function notifyTaggedUser(
  sql: SqlClient,
  {
    postId,
    authorUserId,
    taggedUserId,
    authorName,
    caption,
  }: {
    postId: string;
    authorUserId: string;
    taggedUserId?: string;
    authorName?: string;
    caption: string;
  },
) {
  if (!taggedUserId || taggedUserId === authorUserId) return;

  await ensureNotificationsSchema(sql);

  const authorRows = authorName?.trim()
    ? []
    : await sql`
        SELECT COALESCE(username, display_name, 'Alguém') AS author_name
        FROM public.user_profiles
        WHERE user_id = ${authorUserId}
        LIMIT 1
      `;
  const notificationAuthorName =
    authorName?.trim() || String(authorRows[0]?.author_name ?? "Alguém");

  await sql`
    INSERT INTO public.notifications (
      user_id, unique_key, type, title, body, target_type, target_id, route, created_at
    )
    VALUES (
      ${taggedUserId},
      ${`post_mention:${postId}:${taggedUserId}`},
      'post_mention',
      ${`${notificationAuthorName} marcou você em um post`},
      ${caption.slice(0, 140)},
      'post',
      ${postId},
      '/discover',
      now()
    )
    ON CONFLICT (user_id, unique_key) DO NOTHING
  `;
}

async function notifyTaggedUsers(
  sql: SqlClient,
  {
    postId,
    authorUserId,
    taggedUsers,
    previousTaggedUserIds = [],
    authorName,
    caption,
  }: {
    postId: string;
    authorUserId: string;
    taggedUsers: UserMentionSummary[];
    previousTaggedUserIds?: string[];
    authorName?: string;
    caption: string;
  },
) {
  const previous = new Set(previousTaggedUserIds);

  for (const user of taggedUsers) {
    if (previous.has(user.userId)) continue;
    await notifyTaggedUser(sql, {
      postId,
      authorUserId,
      taggedUserId: user.userId,
      authorName,
      caption,
    });
  }
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
        COALESCE(up.username, up.display_name, 'Alguém por perto') AS author_name,
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
      SELECT COALESCE(username, display_name, 'Você') AS author_name, avatar_url AS author_avatar_url
      FROM public.user_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const commenterName = String(authorRows[0]?.author_name ?? "Alguém");
    const commentId = String(rows[0].id);

    // Notifica o autor do post (se não for o próprio comentarista). Sem tela de
    // detalhe de post, a rota aponta para o feed.
    await ensureNotificationsSchema(sql);
    await sql`
      INSERT INTO public.notifications (
        user_id, unique_key, type, title, body, target_type, target_id, route, created_at
      )
      SELECT
        p.user_id,
        ${`post_comment:${commentId}`},
        'post_comment',
        ${`${commenterName} comentou no seu post`},
        ${body.slice(0, 140)},
        'post',
        p.id::text,
        '/discover',
        now()
      FROM public.user_posts p
      WHERE p.id = ${data.postId}
        AND p.user_id <> ${userId}
      ON CONFLICT (user_id, unique_key) DO NOTHING
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
    await ensureEventsRecurrenceSchema(sql);
    await ensureRewardsSchema(sql);
    await ensureVenueFollowersSchema(sql);
    await ensureRewardRedemptionsSchema(sql);

    const rows = await sql`
      SELECT
        e.id,
        e.venue_id,
        e.title,
        e.category,
        e.description,
        e.created_at,
        occurrence.starts_at AS starts_at,
        e.recurrence_type,
        e.recurrence_weekday,
        e.recurrence_time,
        e.price_cents,
        e.confirmed_count,
        (
          SELECT COUNT(DISTINCT c.user_id)::int
          FROM public.checkins c
          WHERE c.event_id = e.id
            AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
        ) AS attendee_count,
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
              AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
            ORDER BY c.created_at DESC
            LIMIT 3
          ) attendee
        ), '[]'::jsonb) AS attendees,
        e.image_url,
        (occurrence.starts_at <= now() AND occurrence.starts_at >= now() - ${eventActiveWindowInterval}::interval) AS is_live,
        v.name AS venue_name,
        v.neighborhood,
        v.address,
        v.category AS venue_category,
        v.latitude,
        v.longitude,
        r.id AS reward_id,
        r.venue_id AS reward_venue_id,
        r.event_id AS reward_event_id,
        r.action AS reward_action,
        r.title AS reward_title,
        r.description AS reward_description,
        r.status AS reward_status,
        r.max_redemptions AS reward_max_redemptions,
        r.valid_until AS reward_valid_until,
        rr.id AS redemption_id,
        rr.reward_id AS redemption_reward_id,
        rr.venue_id AS redemption_venue_id,
        rr.event_id AS redemption_event_id,
        rr.code AS redemption_code,
        rr.status AS redemption_status,
        rr.created_at AS redemption_created_at,
        rr.redeemed_at AS redemption_redeemed_at,
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
            AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
        ) AS checked_in
      FROM public.events e
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN e.recurrence_type = 'weekly' THEN
            CASE
              WHEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
              THEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
              ELSE date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
                + interval '7 days'
            END
          ELSE e.starts_at
        END AS starts_at
      ) occurrence
      JOIN public.venues v ON v.id = e.venue_id
      LEFT JOIN LATERAL (
        SELECT *
        FROM public.venue_rewards vr
        WHERE vr.venue_id = v.id
          AND vr.status = 'active'
          AND (vr.event_id IS NULL OR vr.event_id = e.id)
          AND (vr.valid_until IS NULL OR vr.valid_until > now())
        ORDER BY CASE WHEN vr.event_id = e.id THEN 0 ELSE 1 END, vr.updated_at DESC
        LIMIT 1
      ) r ON true
      LEFT JOIN LATERAL (
        SELECT *
        FROM public.reward_redemptions prr
        WHERE prr.reward_id = r.id
          AND prr.user_id = ${userId ?? ""}
          AND prr.status IN ('pending', 'redeemed')
        LIMIT 1
      ) rr ON true
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
    await ensureEventsRecurrenceSchema(sql);
    await ensureRewardsSchema(sql);
    await ensureRewardRedemptionsSchema(sql);

    const venueRows = await sql`
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
            AND venue_occurrence.starts_at <= now()
            AND venue_occurrence.starts_at >= now() - ${eventActiveWindowInterval}::interval
        ) AS live_events,
        COUNT(DISTINCT c.user_id) AS checkins,
        COUNT(DISTINCT fv.user_id) AS favorite_count,
        COUNT(DISTINCT vf.user_id) AS follower_count,
        r.id AS reward_id,
        r.venue_id AS reward_venue_id,
        r.event_id AS reward_event_id,
        r.action AS reward_action,
        r.title AS reward_title,
        r.description AS reward_description,
        r.status AS reward_status,
        r.max_redemptions AS reward_max_redemptions,
        r.valid_until AS reward_valid_until,
        rr.id AS redemption_id,
        rr.reward_id AS redemption_reward_id,
        rr.venue_id AS redemption_venue_id,
        rr.event_id AS redemption_event_id,
        rr.code AS redemption_code,
        rr.status AS redemption_status,
        rr.created_at AS redemption_created_at,
        rr.redeemed_at AS redemption_redeemed_at,
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
        false AS checked_in
      FROM public.venues v
      LEFT JOIN public.events e ON e.venue_id = v.id
      LEFT JOIN LATERAL (
        SELECT CASE
          WHEN e.recurrence_type = 'weekly' THEN
            CASE
              WHEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
              THEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
              ELSE date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
                + interval '7 days'
            END
          ELSE e.starts_at
        END AS starts_at
      ) venue_occurrence ON true
      LEFT JOIN public.checkins c ON c.venue_id = v.id
        AND c.event_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.events ce
          WHERE ce.id = c.event_id
            AND ce.status <> 'cancelled'
        )
      LEFT JOIN public.favorite_venues fv ON fv.venue_id = v.id
      LEFT JOIN public.venue_followers vf ON vf.venue_id = v.id
      LEFT JOIN LATERAL (
        SELECT *
        FROM public.venue_rewards vr
        WHERE vr.venue_id = v.id
          AND vr.status = 'active'
          AND vr.action = 'checkin'
          AND vr.event_id IS NULL
          AND (vr.valid_until IS NULL OR vr.valid_until > now())
        ORDER BY vr.updated_at DESC
        LIMIT 1
      ) r ON true
      LEFT JOIN LATERAL (
        SELECT *
        FROM public.reward_redemptions prr
        WHERE prr.reward_id = r.id
          AND prr.user_id = ${userId ?? ""}
          AND prr.status IN ('pending', 'redeemed')
        LIMIT 1
      ) rr ON true
      WHERE v.id = ${data.venueId}
      GROUP BY v.id, r.id, r.venue_id, r.event_id, r.action, r.title, r.description, r.status, r.max_redemptions, r.valid_until,
        rr.id, rr.reward_id, rr.venue_id, rr.event_id, rr.code, rr.status, rr.created_at, rr.redeemed_at
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
          occurrence.starts_at AS starts_at,
          e.recurrence_type,
          e.recurrence_weekday,
          e.recurrence_time,
          e.price_cents,
          e.confirmed_count,
          (
            SELECT COUNT(DISTINCT c.user_id)::int
            FROM public.checkins c
            WHERE c.event_id = e.id
              AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
          ) AS attendee_count,
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
                AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
              ORDER BY c.created_at DESC
              LIMIT 3
            ) attendee
          ), '[]'::jsonb) AS attendees,
          e.image_url,
          (occurrence.starts_at <= now() AND occurrence.starts_at >= now() - ${eventActiveWindowInterval}::interval) AS is_live,
          v.name AS venue_name,
          v.neighborhood,
          v.address,
          v.category AS venue_category,
          v.latitude,
          v.longitude,
          r.id AS reward_id,
          r.venue_id AS reward_venue_id,
          r.event_id AS reward_event_id,
          r.action AS reward_action,
          r.title AS reward_title,
          r.description AS reward_description,
          r.status AS reward_status,
          r.max_redemptions AS reward_max_redemptions,
          r.valid_until AS reward_valid_until,
          rr.id AS redemption_id,
          rr.reward_id AS redemption_reward_id,
          rr.venue_id AS redemption_venue_id,
          rr.event_id AS redemption_event_id,
          rr.code AS redemption_code,
          rr.status AS redemption_status,
          rr.created_at AS redemption_created_at,
          rr.redeemed_at AS redemption_redeemed_at,
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
              AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
          ) AS checked_in
        FROM public.events e
        CROSS JOIN LATERAL (
          SELECT CASE
            WHEN e.recurrence_type = 'weekly' THEN
              CASE
                WHEN date_trunc('day', now())
                  + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                  + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
                THEN date_trunc('day', now())
                  + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                  + e.recurrence_time
                ELSE date_trunc('day', now())
                  + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                  + e.recurrence_time
                  + interval '7 days'
              END
            ELSE (e.starts_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'
          END AS starts_at
        ) occurrence
        JOIN public.venues v ON v.id = e.venue_id
        LEFT JOIN LATERAL (
          SELECT *
          FROM public.venue_rewards vr
          WHERE vr.venue_id = v.id
            AND vr.status = 'active'
            AND vr.action = 'checkin'
            AND (vr.event_id IS NULL OR vr.event_id = e.id)
            AND (vr.valid_until IS NULL OR vr.valid_until > now())
          ORDER BY CASE WHEN vr.event_id = e.id THEN 0 ELSE 1 END, vr.updated_at DESC
          LIMIT 1
        ) r ON true
        LEFT JOIN LATERAL (
          SELECT *
          FROM public.reward_redemptions prr
          WHERE prr.reward_id = r.id
            AND prr.user_id = ${userId ?? ""}
            AND prr.status IN ('pending', 'redeemed')
          LIMIT 1
        ) rr ON true
        WHERE e.venue_id = ${data.venueId}
          AND e.status = 'published'
        ORDER BY occurrence.starts_at ASC
      `,
      sql`
        SELECT COUNT(*)::int AS count
        FROM public.checkins c
        LEFT JOIN public.events e ON e.id = c.event_id
        WHERE c.venue_id = ${data.venueId}
          AND c.event_id IS NOT NULL
          AND e.status <> 'cancelled'
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
    await ensureEventsRecurrenceSchema(sql);

    const eventRows = await sql`
      SELECT occurrence.starts_at > now() - ${eventActiveWindowInterval}::interval AS actions_available
      FROM public.events e
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN e.recurrence_type = 'weekly' THEN
            CASE
              WHEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
              THEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
              ELSE date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
                + interval '7 days'
            END
          ELSE e.starts_at
        END AS starts_at
      ) occurrence
      WHERE e.id = ${data.eventId}
        AND e.status = 'published'
      LIMIT 1
    `;
    if (eventRows.length === 0) throw new Error("Evento não encontrado.");
    if (!eventRows[0]?.actions_available) {
      throw new Error("Esse evento já encerrou. Agora só a avaliação fica disponível.");
    }

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
    await ensureEventsRecurrenceSchema(sql);

    if (!data.eventId) throw new Error("Check-in disponível apenas em eventos.");

    const eventRows = await sql`
        SELECT
          occurrence.starts_at,
          occurrence.starts_at > now() - ${eventActiveWindowInterval}::interval AS not_ended,
          occurrence.starts_at <= now() AS started
        FROM public.events e
        CROSS JOIN LATERAL (
          SELECT now() AT TIME ZONE 'America/Sao_Paulo' AS current_at
        ) local_time
        CROSS JOIN LATERAL (
          SELECT CASE
            WHEN e.recurrence_type = 'weekly' THEN
              CASE
                WHEN date_trunc('day', local_time.current_at)
                  + ((e.recurrence_weekday - EXTRACT(DOW FROM local_time.current_at)::int) * interval '1 day')
                  + e.recurrence_time > local_time.current_at - ${eventActiveWindowInterval}::interval
                THEN (date_trunc('day', local_time.current_at)
                  + ((e.recurrence_weekday - EXTRACT(DOW FROM local_time.current_at)::int) * interval '1 day')
                  + e.recurrence_time) AT TIME ZONE 'America/Sao_Paulo'
                ELSE (date_trunc('day', local_time.current_at)
                  + ((e.recurrence_weekday - EXTRACT(DOW FROM local_time.current_at)::int) * interval '1 day')
                  + e.recurrence_time
                  + interval '7 days') AT TIME ZONE 'America/Sao_Paulo'
              END
            ELSE e.starts_at
          END AS starts_at
        ) occurrence
        WHERE e.id = ${data.eventId}
          AND e.venue_id = ${data.venueId}
          AND e.status = 'published'
        LIMIT 1
      `;
    if (eventRows.length === 0) throw new Error("Evento não encontrado.");
    if (!eventRows[0]?.started) throw new Error("Check-in disponível quando o evento começar.");
    if (!eventRows[0]?.not_ended) throw new Error("Check-in encerrado para esse evento.");

    const occurrenceStartsAt =
      eventRows[0].starts_at instanceof Date
        ? eventRows[0].starts_at.toISOString()
        : String(eventRows[0].starts_at);

    const existing = await sql`
        SELECT 1
        FROM public.checkins
        WHERE user_id = ${userId}
          AND venue_id = ${data.venueId}
          AND event_id = ${data.eventId}
          AND occurrence_starts_at = ${occurrenceStartsAt}
        LIMIT 1
      `;

    if (existing.length > 0) {
      await sql`
          DELETE FROM public.checkins
          WHERE user_id = ${userId}
            AND venue_id = ${data.venueId}
            AND event_id = ${data.eventId}
            AND occurrence_starts_at = ${occurrenceStartsAt}
        `;

      await ensureRewardRedemptionsSchema(sql);
      await sql`
          UPDATE public.reward_redemptions rr
          SET status = 'cancelled'
          FROM public.venue_rewards vr
          WHERE vr.id = rr.reward_id
            AND vr.action = 'checkin'
            AND rr.user_id = ${userId}
            AND rr.venue_id = ${data.venueId}
            AND rr.event_id = ${data.eventId}
            AND rr.status = 'pending'
        `;

      return { checkedIn: false, redemption: null };
    }

    await sql`
        INSERT INTO public.checkins (user_id, venue_id, event_id, occurrence_starts_at)
        VALUES (${userId}, ${data.venueId}, ${data.eventId}, ${occurrenceStartsAt})
        ON CONFLICT (user_id, venue_id, event_id) DO UPDATE SET
          occurrence_starts_at = EXCLUDED.occurrence_starts_at,
          created_at = now()
      `;

    const redemption = await claimRewardForAction(sql, {
      venueId: data.venueId,
      eventId: data.eventId,
      userId,
      action: "checkin",
    });

    return { checkedIn: true, redemption };
  });

export const redeemRewardCode = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; code: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<{
      result: RedeemRewardResult;
      rewardTitle?: string;
      customerName?: string;
      redeemedAt?: string;
    }> => {
      const userId = await requireAuthenticatedUserId(data.userId);

      const code = data.code.trim().toUpperCase();
      if (code.length !== 6) throw new Error("Informe o código de 6 caracteres do cliente.");

      const sql = await getSql();
      if (!sql) throw new Error("DATABASE_URL não configurada.");
      await ensureRewardRedemptionsSchema(sql);

      const rows = await sql`
        SELECT public.redeem_reward_code(${code}, ${userId}) AS payload
      `;
      const payload = (rows[0]?.payload ?? {}) as Record<string, unknown>;

      return {
        result: String(payload.result ?? "not_found") as RedeemRewardResult,
        rewardTitle: payload.reward_title ? String(payload.reward_title) : undefined,
        customerName: payload.customer_name ? String(payload.customer_name) : undefined,
        redeemedAt: payload.redeemed_at ? String(payload.redeemed_at) : undefined,
      };
    },
  );

export const getMyRewardRedemptions = createServerFn({ method: "GET" })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }): Promise<RewardRedemptionSummary[]> => {
    const userId = await requireAuthenticatedUserId(data.userId);

    const sql = await getSql();
    if (!sql) return [];
    await ensureRewardRedemptionsSchema(sql);

    const rows = await sql`
      SELECT
        rr.id,
        rr.reward_id,
        rr.venue_id,
        rr.event_id,
        rr.code,
        rr.status,
        rr.created_at,
        rr.redeemed_at,
        vr.title AS reward_title,
        v.name AS venue_name
      FROM public.reward_redemptions rr
      JOIN public.venue_rewards vr ON vr.id = rr.reward_id
      JOIN public.venues v ON v.id = rr.venue_id
      WHERE rr.user_id = ${userId}
        AND rr.status IN ('pending', 'redeemed')
      ORDER BY (rr.status = 'pending') DESC, rr.created_at DESC
      LIMIT 20
    `;

    return rows
      .map((row) => mapRedemption(row, ""))
      .filter((item): item is RewardRedemptionSummary => item != null);
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
    const venueId = String(venue.id);
    const eventId = data.eventId?.trim() || null;

    if (eventId) {
      const events = await sql`
        SELECT 1
        FROM public.events
        WHERE id = ${eventId}
          AND venue_id = ${venueId}
          AND status = 'published'
        LIMIT 1
      `;
      if (!events[0]) throw new Error("Escolha um evento publicado desse estabelecimento.");
    }

    await sql`
      UPDATE public.venue_rewards
      SET status = 'inactive', updated_at = now()
      WHERE venue_id = ${venueId}
    `;

    const rows = await sql`
      INSERT INTO public.venue_rewards (
        venue_id,
        event_id,
        action,
        title,
        description,
        status,
        max_redemptions,
        valid_until
      )
      VALUES (
        ${venueId},
        ${eventId},
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
        event_id AS reward_event_id,
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
    const updateId = String(rows[0].id);
    const updateCreatedAt =
      rows[0].created_at instanceof Date
        ? rows[0].created_at.toISOString()
        : String(rows[0].created_at);

    await ensureNotificationsSchema(sql);
    await sql`
      INSERT INTO public.notifications (
        user_id,
        unique_key,
        type,
        title,
        body,
        target_type,
        target_id,
        route,
        image_url,
        created_at
      )
      SELECT
        vf.user_id,
        ${`venue_update:${updateId}`},
        'venue_update',
        ${data.title.trim()},
        ${data.body.trim()},
        'venue',
        v.id::text,
        '/venues/' || v.id::text,
        v.cover_image_url,
        ${updateCreatedAt}::timestamptz
      FROM public.venue_followers vf
      JOIN public.venues v ON v.id = vf.venue_id
      WHERE vf.venue_id = ${String(venue.id)}
        AND vf.user_id <> ${userId}
      ON CONFLICT (user_id, unique_key) DO NOTHING
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
      WHERE vu.id = ${updateId}
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

export const getNotifications = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<NotificationSummary[]> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return [];

    const sql = await getSql();
    if (!sql) return [];
    await ensureNotificationsSchema(sql);
    await materializeDueEventReminderNotifications(sql, userId);

    const rows = await sql`
      SELECT
        id,
        type,
        title,
        body,
        target_type,
        target_id,
        route,
        image_url,
        read_at,
        archived_at,
        created_at
      FROM public.notifications
      WHERE user_id = ${userId}
        AND archived_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return rows.map(mapNotification);
  });

export const getUnreadNotificationCount = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<number> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return 0;

    const sql = await getSql();
    if (!sql) return 0;
    await ensureNotificationsSchema(sql);
    await materializeDueEventReminderNotifications(sql, userId);

    const rows = await sql`
      SELECT COUNT(*)::int AS unread_count
      FROM public.notifications
      WHERE user_id = ${userId}
        AND read_at IS NULL
        AND archived_at IS NULL
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
    await ensureNotificationsSchema(sql);

    await sql`
      INSERT INTO public.user_notification_reads (user_id, last_seen_at, updated_at)
      VALUES (${userId}, now(), now())
      ON CONFLICT (user_id) DO UPDATE SET
        last_seen_at = EXCLUDED.last_seen_at,
        updated_at = EXCLUDED.updated_at
    `;

    await sql`
      UPDATE public.notifications
      SET read_at = COALESCE(read_at, now())
      WHERE user_id = ${userId}
        AND read_at IS NULL
    `;
  });

export const archiveNotification = createServerFn({ method: "POST" })
  .inputValidator((data: { userId?: string; notificationId?: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    const notificationId = data.notificationId?.trim();
    if (!userId || !notificationId) return;

    const sql = await getSql();
    if (!sql) return;
    await ensureNotificationsSchema(sql);

    await sql`
      UPDATE public.notifications
      SET archived_at = COALESCE(archived_at, now())
      WHERE id = ${notificationId}::uuid
        AND user_id = ${userId}
    `;
  });

export const archiveReadNotifications = createServerFn({ method: "POST" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return;

    const sql = await getSql();
    if (!sql) return;
    await ensureNotificationsSchema(sql);

    await sql`
      UPDATE public.notifications
      SET archived_at = COALESCE(archived_at, now())
      WHERE user_id = ${userId}
        AND read_at IS NOT NULL
        AND archived_at IS NULL
    `;
  });

export const registerPushToken = createServerFn({ method: "POST" })
  .inputValidator((data: { userId?: string; token?: string; platform?: PushPlatform }) => data)
  .handler(async ({ data }): Promise<void> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    const token = data.token?.trim();
    const platform = data.platform;
    if (!userId || !token || !platform) return;

    const sql = await getSql();
    if (!sql) return;
    await ensureNotificationsSchema(sql);

    await sql`
      INSERT INTO public.push_tokens (user_id, token, platform, last_seen_at)
      VALUES (${userId}, ${token}, ${platform}, now())
      ON CONFLICT (token) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        last_seen_at = EXCLUDED.last_seen_at
    `;

    await sql`
      DELETE FROM public.push_tokens
      WHERE user_id = ${userId}
        AND platform = ${platform}
        AND token <> ${token}
    `;
  });

export const createEventForOwner = createServerFn({ method: "POST" })
  .inputValidator((data: CreateEventInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);
    if (!data.title.trim() || !data.category.trim() || !data.startsAt || !data.imageUrl) {
      throw new Error("Preencha título, categoria, data e imagem.");
    }
    const imageUrl = assertAllowedPublicMediaUrl(data.imageUrl.trim());

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensureEventsRecurrenceSchema(sql);

    const recurrence = normalizeRecurrence(data.recurrenceType, data.startsAt);

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
        recurrence_type,
        recurrence_weekday,
        recurrence_time,
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
        ${imageUrl},
        ${recurrence.recurrenceType},
        ${recurrence.recurrenceWeekday},
        ${recurrence.recurrenceTime},
        'published'
      )
      RETURNING id
    `;

    const eventId = String(rows[0].id);

    // Notifica os seguidores do estabelecimento sobre o novo evento, espelhando
    // o fluxo de createVenueUpdate. O dispatch (pg_cron) empurra o push a partir daqui.
    await ensureNotificationsSchema(sql);
    await sql`
      INSERT INTO public.notifications (
        user_id,
        unique_key,
        type,
        title,
        body,
        target_type,
        target_id,
        route,
        image_url,
        created_at
      )
      SELECT
        vf.user_id,
        ${`new_event:${eventId}`},
        'new_event',
        ${data.title.trim()},
        'Novo evento em ' || v.name,
        'event',
        ${eventId},
        ${`/events/${eventId}`},
        ${imageUrl},
        now()
      FROM public.venue_followers vf
      JOIN public.venues v ON v.id = vf.venue_id
      WHERE vf.venue_id = ${String(venue.id)}
        AND vf.user_id <> ${userId}
      ON CONFLICT (user_id, unique_key) DO NOTHING
    `;

    // Retorno leve de propósito: o cliente que cria o evento ignora o payload,
    // então evitamos a agregação cara de getEventById no caminho crítico.
    return { id: eventId };
  });

export const updateEventForOwner = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateEventInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);
    if (!data.eventId) throw new Error("Evento não encontrado.");
    if (!data.title.trim() || !data.category.trim() || !data.startsAt) {
      throw new Error("Preencha título, categoria e data do evento.");
    }
    const imageUrl = data.imageUrl?.trim()
      ? assertAllowedPublicMediaUrl(data.imageUrl.trim())
      : undefined;

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensureEventsRecurrenceSchema(sql);

    const recurrence = normalizeRecurrence(data.recurrenceType, data.startsAt);

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
        image_url = COALESCE(${imageUrl ?? null}, image_url),
        recurrence_type = ${recurrence.recurrenceType},
        recurrence_weekday = ${recurrence.recurrenceWeekday},
        recurrence_time = ${recurrence.recurrenceTime},
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
      crm: EMPTY_OWNER_CRM,
      rewardRedemptions: { redeemed: 0, pending: 0, recent: [] },
    };

    const userId = await requireAuthenticatedUserId(data.userId);

    const sql = await getSql();
    if (!sql) return empty;
    await ensureEventsRecurrenceSchema(sql);
    await ensureRewardsSchema(sql);
    await ensureVenueUpdatesSchema(sql);
    await ensureEventReviewsSchema(sql);
    await ensureRewardRedemptionsSchema(sql);

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
            AND venue_occurrence.starts_at <= now()
            AND venue_occurrence.starts_at >= now() - ${eventActiveWindowInterval}::interval
        ) AS live_events,
        COUNT(DISTINCT c.user_id) AS checkins,
        COUNT(DISTINCT fv.user_id) AS favorite_count,
        COUNT(DISTINCT vf.user_id) AS follower_count
      FROM public.venues v
      LEFT JOIN public.events e ON e.venue_id = v.id
      LEFT JOIN LATERAL (
        SELECT CASE
          WHEN e.recurrence_type = 'weekly' THEN
            CASE
              WHEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
              THEN date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
              ELSE date_trunc('day', now())
                + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                + e.recurrence_time
                + interval '7 days'
            END
          ELSE e.starts_at
        END AS starts_at
      ) venue_occurrence ON true
      LEFT JOIN public.checkins c ON c.venue_id = v.id
        AND c.event_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.events ce
          WHERE ce.id = c.event_id
            AND ce.status <> 'cancelled'
        )
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
      crmRows,
      redemptionStatsRows,
      redemptionRecentRows,
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
              AND c.event_id IS NOT NULL
              AND ce.status <> 'cancelled'
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
          occurrence.starts_at AS starts_at,
          e.recurrence_type,
          e.recurrence_weekday,
          e.recurrence_time,
          e.price_cents,
          e.confirmed_count,
          (
            SELECT COUNT(DISTINCT c.user_id)::int
            FROM public.checkins c
            WHERE c.event_id = e.id
              AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
          ) AS attendee_count,
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
                AND (e.recurrence_type <> 'weekly' OR c.occurrence_starts_at = occurrence.starts_at)
              ORDER BY c.created_at DESC
              LIMIT 3
            ) attendee
          ), '[]'::jsonb) AS attendees,
          e.image_url,
          (occurrence.starts_at <= now() AND occurrence.starts_at >= now() - ${eventActiveWindowInterval}::interval) AS is_live,
          v.name AS venue_name,
          v.neighborhood,
          v.address,
          v.category AS venue_category,
          v.latitude,
          v.longitude
        FROM public.events e
        CROSS JOIN LATERAL (
          SELECT CASE
            WHEN e.recurrence_type = 'weekly' THEN
              CASE
                WHEN date_trunc('day', now())
                  + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                  + e.recurrence_time > now() - ${eventActiveWindowInterval}::interval
                THEN date_trunc('day', now())
                  + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                  + e.recurrence_time
                ELSE date_trunc('day', now())
                  + ((e.recurrence_weekday - EXTRACT(DOW FROM now())::int) * interval '1 day')
                  + e.recurrence_time
                  + interval '7 days'
              END
            ELSE e.starts_at
          END AS starts_at
        ) occurrence
        JOIN public.venues v ON v.id = e.venue_id
        WHERE e.venue_id = ${venue.id}
          AND e.status = 'published'
        ORDER BY occurrence.starts_at ASC
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
          event_id AS reward_event_id,
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
      sql`
        WITH crm_users AS (
          SELECT c.user_id
          FROM public.checkins c
          LEFT JOIN public.events e ON e.id = c.event_id
          WHERE c.venue_id = ${venue.id}
            AND c.event_id IS NOT NULL
            AND e.status <> 'cancelled'

          UNION

          SELECT vf.user_id
          FROM public.venue_followers vf
          WHERE vf.venue_id = ${venue.id}

          UNION

          SELECT fv.user_id
          FROM public.favorite_venues fv
          WHERE fv.venue_id = ${venue.id}

          UNION

          SELECT se.user_id
          FROM public.saved_events se
          JOIN public.events e ON e.id = se.event_id
          WHERE e.venue_id = ${venue.id}
            AND e.status <> 'cancelled'

          UNION

          SELECT er.user_id
          FROM public.event_reviews er
          JOIN public.events e ON e.id = er.event_id
          WHERE e.venue_id = ${venue.id}
            AND e.status <> 'cancelled'
        )
        SELECT
          cu.user_id,
          COALESCE(up.display_name, up.username, 'Cliente ChegaAi') AS name,
          up.avatar_url,
          (
            SELECT COUNT(c.id)::int
            FROM public.checkins c
            LEFT JOIN public.events ce ON ce.id = c.event_id
            WHERE c.venue_id = ${venue.id}
              AND c.user_id = cu.user_id
              AND c.event_id IS NOT NULL
              AND ce.status <> 'cancelled'
          ) AS checkins,
          (
            SELECT MAX(c.created_at)
            FROM public.checkins c
            LEFT JOIN public.events ce ON ce.id = c.event_id
            WHERE c.venue_id = ${venue.id}
              AND c.user_id = cu.user_id
              AND c.event_id IS NOT NULL
              AND ce.status <> 'cancelled'
          ) AS last_checkin,
          (
            SELECT COUNT(DISTINCT se.event_id)::int
            FROM public.saved_events se
            JOIN public.events e ON e.id = se.event_id
            WHERE e.venue_id = ${venue.id}
              AND e.status <> 'cancelled'
              AND se.user_id = cu.user_id
          ) AS saved_events,
          EXISTS (
            SELECT 1
            FROM public.venue_followers vf
            WHERE vf.venue_id = ${venue.id}
              AND vf.user_id = cu.user_id
          ) AS followed,
          EXISTS (
            SELECT 1
            FROM public.favorite_venues fv
            WHERE fv.venue_id = ${venue.id}
              AND fv.user_id = cu.user_id
          ) AS favorited,
          (
            SELECT COUNT(er.id)::int
            FROM public.event_reviews er
            JOIN public.events e ON e.id = er.event_id
            WHERE e.venue_id = ${venue.id}
              AND e.status <> 'cancelled'
              AND er.user_id = cu.user_id
          ) AS reviews,
          (
            SELECT AVG((er.atmosphere + er.music + er.price + er.movement) / 4.0)
            FROM public.event_reviews er
            JOIN public.events e ON e.id = er.event_id
            WHERE e.venue_id = ${venue.id}
              AND e.status <> 'cancelled'
              AND er.user_id = cu.user_id
          ) AS average_rating,
          GREATEST(
            COALESCE((
              SELECT MAX(c.created_at)
              FROM public.checkins c
              LEFT JOIN public.events ce ON ce.id = c.event_id
              WHERE c.venue_id = ${venue.id}
                AND c.user_id = cu.user_id
                AND c.event_id IS NOT NULL
                AND ce.status <> 'cancelled'
            ), 'epoch'::timestamp with time zone),
            COALESCE((
              SELECT MAX(se.created_at)
              FROM public.saved_events se
              JOIN public.events e ON e.id = se.event_id
              WHERE e.venue_id = ${venue.id}
                AND e.status <> 'cancelled'
                AND se.user_id = cu.user_id
            ), 'epoch'::timestamp with time zone),
            COALESCE((
              SELECT MAX(vf.created_at)
              FROM public.venue_followers vf
              WHERE vf.venue_id = ${venue.id}
                AND vf.user_id = cu.user_id
            ), 'epoch'::timestamp with time zone),
            COALESCE((
              SELECT MAX(fv.created_at)
              FROM public.favorite_venues fv
              WHERE fv.venue_id = ${venue.id}
                AND fv.user_id = cu.user_id
            ), 'epoch'::timestamp with time zone),
            COALESCE((
              SELECT MAX(er.updated_at)
              FROM public.event_reviews er
              JOIN public.events e ON e.id = er.event_id
              WHERE e.venue_id = ${venue.id}
                AND e.status <> 'cancelled'
                AND er.user_id = cu.user_id
            ), 'epoch'::timestamp with time zone)
          ) AS last_interaction
        FROM crm_users cu
        LEFT JOIN public.user_profiles up ON up.user_id = cu.user_id
        ORDER BY last_interaction DESC
        LIMIT 24
      `,
      sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'redeemed')::int AS redeemed,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
        FROM public.reward_redemptions
        WHERE venue_id = ${venue.id}
      `,
      sql`
        SELECT
          rr.id,
          rr.code,
          rr.redeemed_at,
          vr.title AS reward_title,
          COALESCE(up.display_name, 'Cliente ChegaAi') AS customer_name
        FROM public.reward_redemptions rr
        JOIN public.venue_rewards vr ON vr.id = rr.reward_id
        LEFT JOIN public.user_profiles up ON up.user_id = rr.user_id
        WHERE rr.venue_id = ${venue.id}
          AND rr.status = 'redeemed'
        ORDER BY rr.redeemed_at DESC
        LIMIT 5
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
      crm: mapOwnerCrm(crmRows),
      reward,
      rewardRedemptions: {
        redeemed: Number(redemptionStatsRows[0]?.redeemed ?? 0),
        pending: Number(redemptionStatsRows[0]?.pending ?? 0),
        recent: redemptionRecentRows.map((row) => ({
          id: String(row.id),
          code: String(row.code),
          customerName: String(row.customer_name),
          rewardTitle: String(row.reward_title),
          redeemedAt: String(row.redeemed_at),
        })),
      },
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

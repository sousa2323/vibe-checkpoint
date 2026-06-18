import { createServerFn } from "@tanstack/react-start";
import { getSql, uniqueSlug } from "./db";
import { assertAllowedPublicMediaUrl } from "./media";
import { getOptionalAuthenticatedUserId, requireAuthenticatedUserId } from "./server-auth";
import { fetchWithTimeout, timeoutMessage } from "./timeout";

export type AccountType = "explorer" | "owner";

export type ExplorerPriceRange = "any" | "free" | "budget" | "premium";

export type ExplorerPreferenceMood = "calm" | "live" | "crowded" | "date" | "group";

export type ExplorerPreferences = {
  neighborhoods: string[];
  categories: string[];
  maxDistanceKm: number;
  priceRange: ExplorerPriceRange;
  moods: ExplorerPreferenceMood[];
};

export type ExplorerPreferenceOptions = {
  neighborhoods: string[];
  categories: string[];
};

export const DEFAULT_EXPLORER_PREFERENCES: ExplorerPreferences = {
  neighborhoods: [],
  categories: [],
  maxDistanceKm: 5,
  priceRange: "any",
  moods: [],
};

export const EMPTY_EXPLORER_PREFERENCE_OPTIONS: ExplorerPreferenceOptions = {
  neighborhoods: [],
  categories: [],
};

export function summarizeExplorerPreferences(preferences?: ExplorerPreferences) {
  const value = preferences ?? DEFAULT_EXPLORER_PREFERENCES;
  const parts = [
    value.neighborhoods[0],
    value.categories[0],
    value.moods.length ? `${value.moods.length} climas` : null,
    `${value.maxDistanceKm} km`,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "Bairros, estilos, clima e distância.";
}

type SaveUserProfileInput = {
  userId: string;
  accountType: AccountType;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  onboardingCompleted?: boolean;
};

type UpdateExplorerProfileInput = {
  userId: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
};

export type UserProfileSummary = {
  userId: string;
  accountType: AccountType;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  onboardingCompleted: boolean;
  explorerPreferences: ExplorerPreferences;
  venueName?: string;
  businessRole?: string;
  neighborhood?: string;
  venueApprovalStatus?: VenueApprovalStatus;
};

export type VenueApprovalStatus = "none" | "pending" | "approved" | "rejected";

type SaveVenueClaimInput = SaveUserProfileInput & {
  venueName: string;
  businessRole: string;
  phone?: string;
  neighborhood?: string;
  address?: string;
  category?: string;
  city?: string;
  state?: string;
  instagram?: string;
  whatsapp?: string;
  capacity?: number;
  description?: string;
  latitude?: number;
  longitude?: number;
};

type CreateOrUpdateVenueInput = SaveVenueClaimInput & {
  coverImageUrl: string;
};

export type OwnerVenueOnboarding = {
  venueName: string;
  businessRole?: string;
  neighborhood?: string;
  address?: string;
  category?: string;
  city?: string;
  state?: string;
  instagram?: string;
  whatsapp?: string;
  capacity?: number;
  description?: string;
  latitude?: number;
  longitude?: number;
  coverImageUrl?: string;
  approvalStatus: VenueApprovalStatus;
  reviewNote?: string;
};

export type UsernameAvailability = {
  username: string;
  available: boolean;
  message: string;
};

export const checkUsernameAvailability = createServerFn({ method: "GET" })
  .inputValidator((data: { username: string; userId?: string }) => data)
  .handler(async ({ data }): Promise<UsernameAvailability> => {
    const username = normalizeUsername(data.username);
    validateUsername(username);

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensureUserProfileSchema(sql);

    const rows = await sql`
      SELECT user_id
      FROM public.user_profiles
      WHERE lower(username) = lower(${username})
      LIMIT 1
    `;
    const ownerUserId = rows[0]?.user_id ? String(rows[0].user_id) : null;
    const available = !ownerUserId || ownerUserId === data.userId;

    return {
      username,
      available,
      message: available ? "Nome de usuário disponível." : "Esse nome de usuário já está em uso.",
    };
  });

export const saveUserProfile = createServerFn({ method: "POST" })
  .inputValidator((data: SaveUserProfileInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);
    const username =
      data.accountType === "explorer" ? normalizeUsername(data.username) || undefined : undefined;
    if (username) await ensureUsernameAvailable(username, userId);

    const sql = await getSql();
    if (!sql) return { persisted: false };
    await ensureUserProfileSchema(sql);

    await sql`
      INSERT INTO public.user_profiles (
        user_id,
        account_type,
        display_name,
        username,
        avatar_url,
        onboarding_completed
      )
      VALUES (
        ${userId},
        ${data.accountType},
        ${data.displayName ?? null},
        ${username ?? null},
        ${data.avatarUrl ?? null},
        ${data.onboardingCompleted ?? false}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        account_type = EXCLUDED.account_type,
        display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
        username = COALESCE(EXCLUDED.username, public.user_profiles.username),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
        onboarding_completed = EXCLUDED.onboarding_completed,
        updated_at = now()
    `;

    return { persisted: true };
  });

export const getUserProfile = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<UserProfileSummary | null> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return null;

    try {
      const sql = await getSql();
      if (!sql) return null;
      await ensureUserProfileSchema(sql);

      const rows = await sql`
        SELECT
          up.user_id,
          up.account_type,
          up.display_name,
          up.username,
          up.avatar_url,
          up.onboarding_completed,
          ep.preferences AS private_explorer_preferences,
          up.explorer_preferences AS legacy_explorer_preferences,
          COALESCE(v.name, vcr.venue_name) AS venue_name,
          vcr.business_role,
          COALESCE(v.neighborhood, vcr.neighborhood) AS neighborhood,
          CASE
            WHEN v.id IS NOT NULL THEN 'approved'
            WHEN vcr.status IS NOT NULL THEN vcr.status
            ELSE 'none'
          END AS venue_approval_status
        FROM public.user_profiles up
        LEFT JOIN public.explorer_preferences ep ON ep.user_id = up.user_id
        LEFT JOIN LATERAL (
          SELECT name, neighborhood
          FROM public.venues
          WHERE owner_user_id = up.user_id
          ORDER BY created_at ASC
          LIMIT 1
        ) v ON true
        LEFT JOIN LATERAL (
          SELECT venue_name, business_role, neighborhood, status
          FROM public.venue_claim_requests
          WHERE user_id = up.user_id
          ORDER BY created_at DESC
          LIMIT 1
        ) vcr ON true
        WHERE up.user_id = ${userId}
        LIMIT 1
      `;

      const row = rows[0];
      if (!row) return null;

      return {
        userId: String(row.user_id),
        accountType: String(row.account_type) === "owner" ? "owner" : "explorer",
        displayName: row.display_name ? String(row.display_name) : undefined,
        username: row.username ? String(row.username) : undefined,
        avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
        onboardingCompleted: Boolean(row.onboarding_completed),
        explorerPreferences: normalizeExplorerPreferences(
          row.private_explorer_preferences ?? row.legacy_explorer_preferences,
        ),
        venueName: row.venue_name ? String(row.venue_name) : undefined,
        businessRole: row.business_role ? String(row.business_role) : undefined,
        neighborhood: row.neighborhood ? String(row.neighborhood) : undefined,
        venueApprovalStatus: normalizeVenueApprovalStatus(row.venue_approval_status),
      };
    } catch {
      return null;
    }
  });

export const updateExplorerProfile = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateExplorerProfileInput) => data)
  .handler(async ({ data }): Promise<UserProfileSummary> => {
    const userId = await requireAuthenticatedUserId(data.userId);

    const displayName = data.displayName.trim();
    if (displayName.length < 2) throw new Error("Informe um nome com pelo menos 2 caracteres.");
    const username = normalizeUsername(data.username);
    validateUsername(username);
    await ensureUsernameAvailable(username, userId);
    const avatarUrl = data.avatarUrl?.trim()
      ? assertAllowedPublicMediaUrl(data.avatarUrl.trim())
      : undefined;

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensureUserProfileSchema(sql);

    const rows = await sql`
      INSERT INTO public.user_profiles (
        user_id,
        account_type,
        display_name,
        username,
        avatar_url,
        onboarding_completed
      )
      VALUES (
        ${userId},
        'explorer',
        ${displayName},
        ${username},
        ${avatarUrl ?? null},
        true
      )
      ON CONFLICT (user_id) DO UPDATE SET
        account_type = public.user_profiles.account_type,
        display_name = EXCLUDED.display_name,
        username = EXCLUDED.username,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
        onboarding_completed = public.user_profiles.onboarding_completed,
        updated_at = now()
      RETURNING user_id, account_type, display_name, username, avatar_url, onboarding_completed
    `;

    const row = rows[0];
    const accountType = String(row.account_type) === "owner" ? "owner" : "explorer";
    return {
      userId: String(row.user_id),
      accountType,
      displayName: String(row.display_name),
      username: row.username ? String(row.username) : undefined,
      avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
      onboardingCompleted: Boolean(row.onboarding_completed),
      explorerPreferences: DEFAULT_EXPLORER_PREFERENCES,
    };
  });

export const getExplorerPreferences = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<ExplorerPreferences> => {
    const userId = await getOptionalAuthenticatedUserId(data.userId);
    if (!userId) return DEFAULT_EXPLORER_PREFERENCES;

    const sql = await getSql();
    if (!sql) return DEFAULT_EXPLORER_PREFERENCES;
    await ensureUserProfileSchema(sql);

    const rows = await sql`
      SELECT
        ep.preferences AS private_explorer_preferences,
        up.explorer_preferences AS legacy_explorer_preferences
      FROM public.user_profiles up
      LEFT JOIN public.explorer_preferences ep ON ep.user_id = up.user_id
      WHERE up.user_id = ${userId}
      LIMIT 1
    `;

    return normalizeExplorerPreferences(
      rows[0]?.private_explorer_preferences ?? rows[0]?.legacy_explorer_preferences,
    );
  });

export const getExplorerPreferenceOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<ExplorerPreferenceOptions> => {
    const sql = await getSql();
    if (!sql) return EMPTY_EXPLORER_PREFERENCE_OPTIONS;

    const rows = await sql`
      SELECT
        COALESCE((
          SELECT jsonb_agg(neighborhood ORDER BY neighborhood)
          FROM (
            SELECT DISTINCT NULLIF(trim(neighborhood), '') AS neighborhood
            FROM public.venues
            WHERE NULLIF(trim(neighborhood), '') IS NOT NULL
            LIMIT 40
          ) neighborhoods
        ), '[]'::jsonb) AS neighborhoods,
        COALESCE((
          SELECT jsonb_agg(category ORDER BY category)
          FROM (
            SELECT DISTINCT NULLIF(trim(category), '') AS category
            FROM public.venues
            WHERE NULLIF(trim(category), '') IS NOT NULL
            LIMIT 40
          ) categories
        ), '[]'::jsonb) AS categories
    `;

    return normalizePreferenceOptions(rows[0]);
  },
);

export const updateExplorerPreferences = createServerFn({ method: "POST" })
  .inputValidator((data: { userId?: string; preferences: ExplorerPreferences }) => data)
  .handler(async ({ data }): Promise<ExplorerPreferences> => {
    const userId = await requireAuthenticatedUserId(data.userId);
    const preferences = normalizeExplorerPreferences(data.preferences);

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensureUserProfileSchema(sql);

    await sql`
      INSERT INTO public.user_profiles (
        user_id,
        account_type,
        onboarding_completed
      )
      VALUES (
        ${userId},
        'explorer',
        true
      )
      ON CONFLICT (user_id) DO UPDATE SET
        onboarding_completed = true,
        updated_at = now()
    `;

    const rows = await sql`
      INSERT INTO public.explorer_preferences (
        user_id,
        preferences
      )
      VALUES (
        ${userId},
        ${JSON.stringify(preferences)}::jsonb
      )
      ON CONFLICT (user_id) DO UPDATE SET
        preferences = EXCLUDED.preferences,
        updated_at = now()
      RETURNING preferences
    `;

    return normalizeExplorerPreferences(rows[0]?.preferences);
  });

export const saveVenueClaimRequest = createServerFn({ method: "POST" })
  .inputValidator((data: SaveVenueClaimInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);
    const sql = await getSql();
    if (!sql) return { persisted: false };
    await ensureUserProfileSchema(sql);

    await sql`
      INSERT INTO public.user_profiles (
        user_id,
        account_type,
        display_name,
        onboarding_completed
      )
      VALUES (
        ${userId},
        ${data.accountType},
        ${data.displayName ?? null},
        true
      )
      ON CONFLICT (user_id) DO UPDATE SET
        account_type = EXCLUDED.account_type,
        display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
        onboarding_completed = true,
        updated_at = now()
    `;

    await sql`
      INSERT INTO public.venue_claim_requests (
        user_id,
        venue_name,
        business_role,
        phone,
        neighborhood,
        address
      )
      VALUES (
        ${userId},
        ${data.venueName},
        ${data.businessRole},
        ${data.phone ?? null},
        ${data.neighborhood ?? null},
        ${data.address ?? null}
      )
    `;

    return { persisted: true };
  });

export const getOwnerVenueForOnboarding = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string }) => data)
  .handler(async ({ data }): Promise<OwnerVenueOnboarding | null> => {
    const userId = await requireAuthenticatedUserId(data.userId);

    const sql = await getSql();
    if (!sql) return null;
    await ensureVenueProfileSchema(sql);

    const rows = await sql`
      SELECT
        v.name,
        v.neighborhood,
        v.city,
        v.state,
        v.address,
        v.description,
        v.category,
        v.instagram,
        v.whatsapp,
        v.capacity,
        v.latitude,
        v.longitude,
        v.cover_image_url,
        COALESCE(v.business_role, vcr.business_role) AS business_role
      FROM public.venues v
      LEFT JOIN LATERAL (
        SELECT business_role
        FROM public.venue_claim_requests
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 1
      ) vcr ON true
      WHERE v.owner_user_id = ${userId}
      ORDER BY v.created_at ASC
      LIMIT 1
    `;
    let row = rows[0];
    if (!row) {
      const claimRows = await sql`
        SELECT
          venue_name AS name,
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
          cover_image_url,
          business_role,
          status,
          review_note
        FROM public.venue_claim_requests
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
        LIMIT 1
      `;
      row = claimRows[0];
    }
    if (!row) return null;

    return {
      venueName: String(row.name),
      businessRole: row.business_role ? String(row.business_role) : undefined,
      neighborhood: row.neighborhood ? String(row.neighborhood) : undefined,
      address: row.address ? String(row.address) : undefined,
      category: row.category ? String(row.category) : undefined,
      city: row.city ? String(row.city) : undefined,
      state: row.state ? String(row.state) : undefined,
      instagram: row.instagram ? String(row.instagram) : undefined,
      whatsapp: row.whatsapp ? String(row.whatsapp) : undefined,
      capacity: row.capacity == null ? undefined : Number(row.capacity),
      description: row.description ? String(row.description) : undefined,
      latitude: row.latitude == null ? undefined : Number(row.latitude),
      longitude: row.longitude == null ? undefined : Number(row.longitude),
      coverImageUrl: row.cover_image_url ? String(row.cover_image_url) : undefined,
      approvalStatus: normalizeVenueApprovalStatus(row.status ?? "approved"),
      reviewNote: row.review_note ? String(row.review_note) : undefined,
    };
  });

export const createOrUpdateVenueForOwner = createServerFn({ method: "POST" })
  .inputValidator((data: CreateOrUpdateVenueInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);
    if (!data.venueName.trim() || !data.businessRole.trim() || !data.coverImageUrl) {
      throw new Error("Informe nome, função e imagem do estabelecimento.");
    }
    const coverImageUrl = assertAllowedPublicMediaUrl(data.coverImageUrl.trim());

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");

    await ensureVenueProfileSchema(sql);

    const coordinates =
      data.latitude != null && data.longitude != null
        ? { latitude: data.latitude, longitude: data.longitude }
        : await geocodeVenueAddress(data);

    const existing = await sql`
      SELECT id, slug
      FROM public.venues
      WHERE owner_user_id = ${userId}
      ORDER BY created_at ASC
      LIMIT 1
    `;

    if (!existing[0]) {
      await sql`
        INSERT INTO public.user_profiles (
          user_id,
          account_type,
          display_name,
          onboarding_completed
        )
        VALUES (
          ${userId},
          'explorer',
          ${data.displayName ?? null},
          true
        )
        ON CONFLICT (user_id) DO UPDATE SET
          display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
          onboarding_completed = true,
          updated_at = now()
      `;

      const latestClaim = await sql`
        SELECT id
        FROM public.venue_claim_requests
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
        LIMIT 1
      `;

      if (latestClaim[0]) {
        await sql`
          UPDATE public.venue_claim_requests
          SET
            venue_name = ${data.venueName.trim()},
            business_role = ${data.businessRole.trim()},
            phone = ${data.whatsapp?.trim() || null},
            neighborhood = ${data.neighborhood?.trim() || "São Paulo"},
            address = ${data.address?.trim() || null},
            category = ${data.category?.trim() || null},
            city = ${data.city?.trim() || "São Paulo"},
            state = ${normalizeState(data.state)},
            instagram = ${data.instagram?.trim() || null},
            whatsapp = ${data.whatsapp?.trim() || null},
            capacity = ${data.capacity || null},
            description = ${data.description?.trim() || null},
            latitude = ${coordinates?.latitude ?? null},
            longitude = ${coordinates?.longitude ?? null},
            cover_image_url = ${coverImageUrl},
            status = 'pending',
            review_note = NULL,
            reviewed_by = NULL,
            reviewed_at = NULL,
            updated_at = now()
          WHERE id = ${String(latestClaim[0].id)}
        `;
      } else {
        await sql`
          INSERT INTO public.venue_claim_requests (
          user_id,
          venue_name,
          business_role,
          phone,
          neighborhood,
          address,
          category,
          city,
          state,
          instagram,
          whatsapp,
          capacity,
          description,
          latitude,
          longitude,
          cover_image_url,
          status,
          updated_at
        )
        VALUES (
          ${userId},
          ${data.venueName.trim()},
          ${data.businessRole.trim()},
          ${data.whatsapp?.trim() || null},
          ${data.neighborhood?.trim() || "São Paulo"},
          ${data.address?.trim() || null},
          ${data.category?.trim() || null},
          ${data.city?.trim() || "São Paulo"},
          ${normalizeState(data.state)},
          ${data.instagram?.trim() || null},
          ${data.whatsapp?.trim() || null},
          ${data.capacity || null},
          ${data.description?.trim() || null},
          ${coordinates?.latitude ?? null},
          ${coordinates?.longitude ?? null},
          ${coverImageUrl},
          'pending',
          now()
        )
        `;
      }

      return { pendingApproval: true };
    }

    await sql`
      INSERT INTO public.user_profiles (
        user_id,
        account_type,
        display_name,
        onboarding_completed
      )
      VALUES (
        ${userId},
        'owner',
        ${data.displayName ?? null},
        true
      )
      ON CONFLICT (user_id) DO UPDATE SET
        account_type = 'owner',
        display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
        onboarding_completed = true,
        updated_at = now()
    `;

    if (existing[0]) {
      const rows = await sql`
        UPDATE public.venues
        SET
          name = ${data.venueName.trim()},
          business_role = ${data.businessRole.trim()},
          neighborhood = ${data.neighborhood?.trim() || "São Paulo"},
          city = ${data.city?.trim() || "São Paulo"},
          state = ${normalizeState(data.state)},
          address = ${data.address?.trim() || null},
          description = ${data.description?.trim() || null},
          category = ${data.category?.trim() || null},
          instagram = ${data.instagram?.trim() || null},
          whatsapp = ${data.whatsapp?.trim() || null},
          capacity = ${data.capacity || null},
          latitude = COALESCE(${coordinates?.latitude ?? null}, latitude),
          longitude = COALESCE(${coordinates?.longitude ?? null}, longitude),
          cover_image_url = ${coverImageUrl},
          updated_at = now()
        WHERE id = ${String(existing[0].id)}
        RETURNING id, name, neighborhood, city, state, address, description, cover_image_url
      `;

      return {
        id: String(rows[0].id),
        name: String(rows[0].name),
        neighborhood: String(rows[0].neighborhood),
        city: rows[0].city ? String(rows[0].city) : undefined,
        state: rows[0].state ? String(rows[0].state) : undefined,
        address: rows[0].address ? String(rows[0].address) : undefined,
        description: rows[0].description ? String(rows[0].description) : undefined,
        image: String(rows[0].cover_image_url),
        liveEvents: 0,
      };
    }

    const slug = await uniqueSlug(sql, "venues", data.venueName);
    const rows = await sql`
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
        ${userId},
        ${data.venueName.trim()},
        ${slug},
        ${data.businessRole.trim()},
        ${data.neighborhood?.trim() || "São Paulo"},
        ${data.city?.trim() || "São Paulo"},
        ${normalizeState(data.state)},
        ${data.address?.trim() || null},
        ${data.description?.trim() || null},
        ${data.category?.trim() || null},
        ${data.instagram?.trim() || null},
        ${data.whatsapp?.trim() || null},
        ${data.capacity || null},
        ${coordinates?.latitude ?? null},
        ${coordinates?.longitude ?? null},
        ${coverImageUrl}
      )
      RETURNING id, name, neighborhood, city, state, address, description, cover_image_url
    `;

    return {
      id: String(rows[0].id),
      name: String(rows[0].name),
      neighborhood: String(rows[0].neighborhood),
      city: rows[0].city ? String(rows[0].city) : undefined,
      state: rows[0].state ? String(rows[0].state) : undefined,
      address: rows[0].address ? String(rows[0].address) : undefined,
      description: rows[0].description ? String(rows[0].description) : undefined,
      image: String(rows[0].cover_image_url),
      liveEvents: 0,
    };
  });

async function ensureVenueProfileSchema(_sql: Awaited<ReturnType<typeof getSql>>) {
  if (!_sql) return;
  await ensureVenueApprovalSchema(_sql);
}

async function ensureVenueApprovalSchema(sql: NonNullable<Awaited<ReturnType<typeof getSql>>>) {
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

function normalizeVenueApprovalStatus(value: unknown): VenueApprovalStatus {
  return value === "pending" || value === "approved" || value === "rejected" ? value : "none";
}

async function ensureUserProfileSchema(sql: Awaited<ReturnType<typeof getSql>>) {
  if (!sql) return;
  await sql`
    ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS explorer_preferences jsonb NOT NULL DEFAULT '{}'::jsonb
  `;

  await ensureExplorerPreferencesSchema(sql);
}

async function ensureExplorerPreferencesSchema(
  sql: NonNullable<Awaited<ReturnType<typeof getSql>>>,
) {
  await sql`
    CREATE TABLE IF NOT EXISTS public.explorer_preferences (
      user_id text PRIMARY KEY,
      preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    INSERT INTO public.explorer_preferences (user_id, preferences, created_at, updated_at)
    SELECT user_id, explorer_preferences, now(), now()
    FROM public.user_profiles
    WHERE explorer_preferences IS NOT NULL
      AND explorer_preferences <> '{}'::jsonb
    ON CONFLICT (user_id) DO NOTHING
  `;

  await sql`
    UPDATE public.user_profiles
    SET explorer_preferences = '{}'::jsonb,
        updated_at = now()
    WHERE explorer_preferences IS NOT NULL
      AND explorer_preferences <> '{}'::jsonb
  `;

  await sql`
    ALTER TABLE public.explorer_preferences ENABLE ROW LEVEL SECURITY
  `;

  await sql`
    REVOKE ALL ON public.explorer_preferences FROM anon
  `;

  await sql`
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.explorer_preferences TO authenticated
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'explorer_preferences'
          AND policyname = 'Users can read own explorer preferences'
      ) THEN
        CREATE POLICY "Users can read own explorer preferences"
          ON public.explorer_preferences FOR SELECT
          TO authenticated
          USING (user_id = auth.uid()::text);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'explorer_preferences'
          AND policyname = 'Users can insert own explorer preferences'
      ) THEN
        CREATE POLICY "Users can insert own explorer preferences"
          ON public.explorer_preferences FOR INSERT
          TO authenticated
          WITH CHECK (user_id = auth.uid()::text);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'explorer_preferences'
          AND policyname = 'Users can update own explorer preferences'
      ) THEN
        CREATE POLICY "Users can update own explorer preferences"
          ON public.explorer_preferences FOR UPDATE
          TO authenticated
          USING (user_id = auth.uid()::text)
          WITH CHECK (user_id = auth.uid()::text);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'explorer_preferences'
          AND policyname = 'Users can delete own explorer preferences'
      ) THEN
        CREATE POLICY "Users can delete own explorer preferences"
          ON public.explorer_preferences FOR DELETE
          TO authenticated
          USING (user_id = auth.uid()::text);
      END IF;
    END $$
  `;
}

function normalizeExplorerPreferences(value: unknown): ExplorerPreferences {
  const source =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const priceRange = String(source.priceRange ?? DEFAULT_EXPLORER_PREFERENCES.priceRange);

  return {
    neighborhoods: normalizeStringArray(source.neighborhoods, 6),
    categories: normalizeStringArray(source.categories, 6),
    maxDistanceKm: normalizePreferenceDistance(source.maxDistanceKm),
    priceRange: isExplorerPriceRange(priceRange) ? priceRange : "any",
    moods: normalizeStringArray(source.moods, 5).filter(isExplorerPreferenceMood),
  };
}

function normalizePreferenceOptions(value: unknown): ExplorerPreferenceOptions {
  const source =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

  return {
    neighborhoods: normalizeStringArray(source.neighborhoods, 40),
    categories: normalizeStringArray(source.categories, 40),
  };
}

function normalizeStringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, limit);
}

function normalizePreferenceDistance(value: unknown) {
  const distance = Number(value ?? DEFAULT_EXPLORER_PREFERENCES.maxDistanceKm);
  if (!Number.isFinite(distance)) return DEFAULT_EXPLORER_PREFERENCES.maxDistanceKm;
  return Math.min(25, Math.max(1, Math.round(distance)));
}

function isExplorerPriceRange(value: string): value is ExplorerPriceRange {
  return ["any", "free", "budget", "premium"].includes(value);
}

function isExplorerPreferenceMood(value: string): value is ExplorerPreferenceMood {
  return ["calm", "live", "crowded", "date", "group"].includes(value);
}

function normalizeUsername(value?: string) {
  return (value ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 30);
}

function validateUsername(username: string) {
  if (username.length < 3)
    throw new Error("Informe um nome de usuário com pelo menos 3 caracteres.");
  if (!/^[a-z0-9._]{3,30}$/.test(username)) {
    throw new Error("Use apenas letras, números, ponto ou underline.");
  }
}

async function ensureUsernameAvailable(username: string, userId: string) {
  validateUsername(username);

  const sql = await getSql();
  if (!sql) throw new Error("DATABASE_URL não configurada.");
  await ensureUserProfileSchema(sql);

  const rows = await sql`
    SELECT user_id
    FROM public.user_profiles
    WHERE lower(username) = lower(${username})
    LIMIT 1
  `;
  const ownerUserId = rows[0]?.user_id ? String(rows[0].user_id) : null;
  if (ownerUserId && ownerUserId !== userId) {
    throw new Error("Esse nome de usuário já está em uso.");
  }
}

async function geocodeVenueAddress(data: SaveVenueClaimInput) {
  const parts = [data.address, data.neighborhood, data.city, normalizeState(data.state), "Brasil"]
    .map((part) => part?.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("q", parts.join(", "));

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

    const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const first = results[0];
    if (!first?.lat || !first.lon) return null;

    return { latitude: Number(first.lat), longitude: Number(first.lon) };
  } catch {
    return null;
  }
}

function normalizeState(value?: string) {
  const state = value?.trim().toUpperCase();
  return state && state.length <= 2 ? state : "SP";
}

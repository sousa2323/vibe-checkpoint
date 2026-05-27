import { createServerFn } from "@tanstack/react-start";
import { getSql, uniqueSlug } from "./db";
import { getOptionalAuthenticatedUserId, requireAuthenticatedUserId } from "./server-auth";

export type AccountType = "explorer" | "owner";

type SaveUserProfileInput = {
  userId: string;
  accountType: AccountType;
  displayName?: string;
  avatarUrl?: string;
  onboardingCompleted?: boolean;
};

type UpdateExplorerProfileInput = {
  userId: string;
  displayName: string;
  avatarUrl?: string;
};

export type UserProfileSummary = {
  userId: string;
  accountType: AccountType;
  displayName?: string;
  avatarUrl?: string;
  onboardingCompleted: boolean;
  venueName?: string;
  businessRole?: string;
  neighborhood?: string;
};

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
  coverImageUrl?: string;
};

export const saveUserProfile = createServerFn({ method: "POST" })
  .inputValidator((data: SaveUserProfileInput) => data)
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
        avatar_url,
        onboarding_completed
      )
      VALUES (
        ${userId},
        ${data.accountType},
        ${data.displayName ?? null},
        ${data.avatarUrl ?? null},
        ${data.onboardingCompleted ?? false}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        account_type = EXCLUDED.account_type,
        display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
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
          up.avatar_url,
          up.onboarding_completed,
          COALESCE(v.name, vcr.venue_name) AS venue_name,
          vcr.business_role,
          COALESCE(v.neighborhood, vcr.neighborhood) AS neighborhood
        FROM public.user_profiles up
        LEFT JOIN LATERAL (
          SELECT name, neighborhood
          FROM public.venues
          WHERE owner_user_id = up.user_id
          ORDER BY created_at ASC
          LIMIT 1
        ) v ON true
        LEFT JOIN LATERAL (
          SELECT venue_name, business_role, neighborhood
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
        avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
        onboardingCompleted: Boolean(row.onboarding_completed),
        venueName: row.venue_name ? String(row.venue_name) : undefined,
        businessRole: row.business_role ? String(row.business_role) : undefined,
        neighborhood: row.neighborhood ? String(row.neighborhood) : undefined,
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

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");
    await ensureUserProfileSchema(sql);

    const rows = await sql`
      INSERT INTO public.user_profiles (
        user_id,
        account_type,
        display_name,
        avatar_url,
        onboarding_completed
      )
      VALUES (
        ${userId},
        'explorer',
        ${displayName},
        ${data.avatarUrl ?? null},
        true
      )
      ON CONFLICT (user_id) DO UPDATE SET
        account_type = public.user_profiles.account_type,
        display_name = EXCLUDED.display_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
        onboarding_completed = public.user_profiles.onboarding_completed,
        updated_at = now()
      RETURNING user_id, account_type, display_name, avatar_url, onboarding_completed
    `;

    const row = rows[0];
    const accountType = String(row.account_type) === "owner" ? "owner" : "explorer";
    return {
      userId: String(row.user_id),
      accountType,
      displayName: String(row.display_name),
      avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
      onboardingCompleted: Boolean(row.onboarding_completed),
    };
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
        v.phone,
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
    const row = rows[0];
    if (!row) return null;

    return {
      venueName: String(row.name),
      businessRole: row.business_role ? String(row.business_role) : undefined,
      phone: row.phone ? String(row.phone) : undefined,
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
    };
  });

export const createOrUpdateVenueForOwner = createServerFn({ method: "POST" })
  .inputValidator((data: CreateOrUpdateVenueInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireAuthenticatedUserId(data.userId);
    if (!data.venueName.trim() || !data.businessRole.trim() || !data.coverImageUrl) {
      throw new Error("Informe nome, função e imagem do estabelecimento.");
    }

    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada.");

    await ensureVenueProfileSchema(sql);

    const coordinates =
      data.latitude != null && data.longitude != null
        ? { latitude: data.latitude, longitude: data.longitude }
        : await geocodeVenueAddress(data);

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

    const existing = await sql`
      SELECT id, slug
      FROM public.venues
      WHERE owner_user_id = ${userId}
      ORDER BY created_at ASC
      LIMIT 1
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
          phone = ${data.phone?.trim() || null},
          category = ${data.category?.trim() || null},
          instagram = ${data.instagram?.trim() || null},
          whatsapp = ${data.whatsapp?.trim() || null},
          capacity = ${data.capacity || null},
          latitude = COALESCE(${coordinates?.latitude ?? null}, latitude),
          longitude = COALESCE(${coordinates?.longitude ?? null}, longitude),
          cover_image_url = ${data.coverImageUrl},
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
        phone,
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
        ${data.phone?.trim() || null},
        ${data.category?.trim() || null},
        ${data.instagram?.trim() || null},
        ${data.whatsapp?.trim() || null},
        ${data.capacity || null},
        ${coordinates?.latitude ?? null},
        ${coordinates?.longitude ?? null},
        ${data.coverImageUrl}
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
  return;
}

async function ensureUserProfileSchema(_sql: Awaited<ReturnType<typeof getSql>>) {
  return;
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
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ChegaAi/1.0 geolocation contact: admin@chegaai.local",
        Accept: "application/json",
      },
    });
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

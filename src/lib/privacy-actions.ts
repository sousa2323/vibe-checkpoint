import { createServerFn } from "@tanstack/react-start";

export type ExportUserDataInput = {
  userId: string;
  email?: string;
  name?: string;
  accountType?: string;
};

type RequestAccountDeletionInput = {
  userId: string;
  email?: string;
  reason?: string;
};

export type CountSummary = {
  checkins: number;
  savedEvents: number;
  eventReviews: number;
  venueFollowers: number;
  feedPosts: number;
  postComments: number;
  groupPlans: number;
  ownedVenues: number;
  ownedEvents: number;
};

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonRow = { [key: string]: JsonValue };

export type UserDataExport = {
  exportedAt: string;
  subject: {
    userId: string;
    email?: string;
    name?: string;
    accountType?: string;
  };
  profile: JsonRow | null;
  venueClaims: JsonRow[];
  ownedVenues: JsonRow[];
  checkins: JsonRow[];
  savedEvents: JsonRow[];
  eventReviews: JsonRow[];
  venueFollowers: JsonRow[];
  feedPosts: JsonRow[];
  postComments: JsonRow[];
  groupPlans: JsonRow[];
  counts: CountSummary;
  note: string;
};

export const exportUserData = createServerFn({ method: "GET" })
  .inputValidator((data: ExportUserDataInput) => data)
  .handler(async ({ data }): Promise<UserDataExport> => {
    const { buildUserDataExport } = await import("./privacy-export.server");
    return buildUserDataExport(data);
  });

export const requestAccountDeletion = createServerFn({ method: "POST" })
  .inputValidator((data: RequestAccountDeletionInput) => data)
  .handler(async ({ data }) => {
    const [{ getSql }, { requireAuthenticatedUserId }] = await Promise.all([
      import("./db"),
      import("./server-auth"),
    ]);
    const userId = await requireAuthenticatedUserId(data.userId);
    const sql = await getSql();
    if (!sql) throw new Error("DATABASE_URL não configurada para registrar a solicitação.");

    await sql`
      CREATE TABLE IF NOT EXISTS public.privacy_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        request_type text NOT NULL,
        email text,
        reason text,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        resolved_at timestamptz
      )
    `;

    const rows = await sql`
      INSERT INTO public.privacy_requests (user_id, request_type, email, reason, status)
      VALUES (${userId}, 'account_deletion', ${data.email ?? null}, ${data.reason?.trim() || null}, 'pending')
      RETURNING id, created_at
    `;

    return {
      id: String(rows[0].id),
      createdAt: String(rows[0].created_at),
    };
  });

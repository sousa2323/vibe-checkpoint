export function getDatabaseUrl() {
  if (typeof process === "undefined") return undefined;
  return process.env.DATABASE_URL;
}

export async function getSql() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  const { neon } = await import("@neondatabase/serverless");
  return neon(databaseUrl);
}

export type SqlClient = NonNullable<Awaited<ReturnType<typeof getSql>>>;

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function uniqueSlug(sql: SqlClient, table: "events" | "venues", value: string) {
  const base = slugify(value) || "item";
  let candidate = base;
  let suffix = 1;

  while (true) {
    const rows =
      table === "events"
        ? await sql`SELECT 1 FROM public.events WHERE slug = ${candidate} LIMIT 1`
        : await sql`SELECT 1 FROM public.venues WHERE slug = ${candidate} LIMIT 1`;

    if (rows.length === 0) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

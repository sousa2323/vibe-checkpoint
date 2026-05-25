export function getDatabaseUrl() {
  if (typeof process === "undefined") return undefined;
  return process.env.DATABASE_URL;
}

type QueryValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | Uint8Array
  | string[]
  | number[];

type TaggedSql = (
  strings: TemplateStringsArray,
  ...values: QueryValue[]
) => Promise<Record<string, unknown>[]>;

let cachedSql: TaggedSql | null = null;

export async function getSql() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;
  if (cachedSql) return cachedSql;

  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5,
    ssl: databaseUrl.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
  });

  cachedSql = async (strings, ...values) => {
    const text = strings.reduce((query, part, index) => {
      const placeholder = index < values.length ? `$${index + 1}` : "";
      return `${query}${part}${placeholder}`;
    }, "");

    const result = await pool.query(text, values);
    return result.rows;
  };

  return cachedSql;
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

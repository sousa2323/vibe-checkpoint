import type { Pool, PoolClient } from "pg";

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
let cachedPool: Pool | null = null;

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function getPool() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;
  if (cachedPool) return cachedPool;

  const { Pool } = await import("pg");
  cachedPool = new Pool({
    connectionString: databaseUrl,
    max: 5,
    connectionTimeoutMillis: readPositiveInteger(process.env.DATABASE_CONNECTION_TIMEOUT_MS, 10000),
    query_timeout: readPositiveInteger(process.env.DATABASE_QUERY_TIMEOUT_MS, 15000),
    statement_timeout: readPositiveInteger(process.env.DATABASE_STATEMENT_TIMEOUT_MS, 15000),
    ssl: databaseUrl.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
  });

  return cachedPool;
}

function createTaggedSql(executor: Pick<Pool | PoolClient, "query">): TaggedSql {
  return async (strings, ...values) => {
    const text = strings.reduce((query, part, index) => {
      const placeholder = index < values.length ? `$${index + 1}` : "";
      return `${query}${part}${placeholder}`;
    }, "");

    const result = await executor.query(text, values);
    return result.rows;
  };
}

export async function getSql() {
  const pool = await getPool();
  if (!pool) return null;
  if (!cachedSql) cachedSql = createTaggedSql(pool);

  return cachedSql;
}

export type SqlClient = NonNullable<Awaited<ReturnType<typeof getSql>>>;

export async function withSqlTransaction<T>(callback: (sql: SqlClient) => Promise<T>) {
  const pool = await getPool();
  if (!pool) throw new Error("DATABASE_URL não configurada.");

  const client = await pool.connect();
  const sql = createTaggedSql(client);
  try {
    await client.query("BEGIN");
    const result = await callback(sql);
    await client.query("COMMIT");
    return result;
  } catch (cause) {
    await client.query("ROLLBACK");
    throw cause;
  } finally {
    client.release();
  }
}

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

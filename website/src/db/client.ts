import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Real Drizzle instance (not a Proxy): `@auth/drizzle-adapter` uses `drizzle-orm`'s `is(db, PgDatabase)`,
 * which fails on a Proxy.
 *
 * When `DATABASE_URL` is unset (e.g. `next build` without `.env`), use a placeholder DSN so the client
 * is still a valid `PgDatabase`. `postgres` connects lazily on first query; static pages that skip DB
 * still build. Set `DATABASE_URL` for any route that runs SQL.
 */
const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://127.0.0.1:5432/workflow_verifier_build_placeholder";

const client = postgres(connectionString, { max: 10 });
export const db: PostgresJsDatabase<typeof schema> = drizzle(client, { schema });

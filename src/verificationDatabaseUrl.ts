import path from "node:path";
import type { RelationalSqlDialect } from "./sqlDialect.js";
import type { VerificationDatabase } from "./types.js";

const POSTGRES_URL_RE = /^postgres(ql)?:\/\//i;
const MYSQL_URL_RE = /^mysql(2)?:\/\//i;
const BIGQUERY_URL_RE = /^bigquery:\/\//i;
const SQLSERVER_URL_RE = /^(sqlserver|mssql):\/\//i;

/**
 * Map CLI `--db` / decision gate `databaseUrl` to a verification database descriptor.
 * Relative paths resolve under `projectRoot` (SQLite file mode).
 */
export function parseVerificationDatabaseUrl(databaseUrl: string, projectRoot: string): VerificationDatabase {
  const trimmed = databaseUrl.trim();
  if (POSTGRES_URL_RE.test(trimmed)) {
    return { kind: "postgres", connectionString: trimmed };
  }
  if (MYSQL_URL_RE.test(trimmed)) {
    return { kind: "mysql", connectionString: trimmed };
  }
  if (BIGQUERY_URL_RE.test(trimmed)) {
    return { kind: "bigquery", connectionString: trimmed };
  }
  if (SQLSERVER_URL_RE.test(trimmed)) {
    return { kind: "sqlserver", connectionString: trimmed };
  }
  return { kind: "sqlite", path: path.resolve(projectRoot, trimmed) };
}

export function relationalSqlDialectForDatabase(db: VerificationDatabase): RelationalSqlDialect {
  if (db.kind === "sqlite") return "sqlite";
  if (db.kind === "postgres") return "postgresql";
  if (db.kind === "mysql") return "mysql";
  if (db.kind === "sqlserver") return "mssql";
  return "postgresql";
}

/** BigQuery does not support `sql_relational` in v1 (row-level verification only). */
export function isBigQueryDatabase(db: VerificationDatabase): boolean {
  return db.kind === "bigquery";
}

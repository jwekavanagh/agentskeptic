import { describe, expect, it } from "vitest";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  isBigQueryDatabase,
  parseVerificationDatabaseUrl,
  relationalSqlDialectForDatabase,
} from "./verificationDatabaseUrl.js";

describe("parseVerificationDatabaseUrl", () => {
  const root = tmpdir();

  it("maps postgres and postgresql URLs", () => {
    expect(parseVerificationDatabaseUrl("postgres://h/db", root)).toEqual({
      kind: "postgres",
      connectionString: "postgres://h/db",
    });
    expect(parseVerificationDatabaseUrl("postgresql://h/db", root)).toEqual({
      kind: "postgres",
      connectionString: "postgresql://h/db",
    });
  });

  it("maps mysql and mysql2 URLs", () => {
    expect(parseVerificationDatabaseUrl("mysql://u@h/db", root)).toEqual({
      kind: "mysql",
      connectionString: "mysql://u@h/db",
    });
    expect(parseVerificationDatabaseUrl("mysql2://u@h/db", root)).toEqual({
      kind: "mysql",
      connectionString: "mysql2://u@h/db",
    });
  });

  it("maps bigquery:// URLs", () => {
    expect(parseVerificationDatabaseUrl("bigquery://project/x", root)).toEqual({
      kind: "bigquery",
      connectionString: "bigquery://project/x",
    });
  });

  it("maps sqlserver and mssql URLs", () => {
    expect(parseVerificationDatabaseUrl("sqlserver://s;Database=db", root)).toEqual({
      kind: "sqlserver",
      connectionString: "sqlserver://s;Database=db",
    });
    expect(parseVerificationDatabaseUrl("mssql://s;Database=db", root)).toEqual({
      kind: "sqlserver",
      connectionString: "mssql://s;Database=db",
    });
  });

  it("resolves relative paths as sqlite under projectRoot", () => {
    const rel = "data/demo.sqlite";
    expect(parseVerificationDatabaseUrl(rel, root)).toEqual({
      kind: "sqlite",
      path: path.resolve(root, rel),
    });
  });
});

describe("relationalSqlDialectForDatabase", () => {
  it("returns dialect per engine", () => {
    expect(relationalSqlDialectForDatabase({ kind: "sqlite", path: "/x" })).toBe("sqlite");
    expect(relationalSqlDialectForDatabase({ kind: "postgres", connectionString: "postgresql://x" })).toBe("postgresql");
    expect(relationalSqlDialectForDatabase({ kind: "mysql", connectionString: "mysql://x" })).toBe("mysql");
    expect(relationalSqlDialectForDatabase({ kind: "sqlserver", connectionString: "mssql://x" })).toBe("mssql");
    expect(relationalSqlDialectForDatabase({ kind: "bigquery", connectionString: "bigquery://p" })).toBe("postgresql");
  });
});

describe("isBigQueryDatabase", () => {
  it("is true only for bigquery kind", () => {
    expect(isBigQueryDatabase({ kind: "bigquery", connectionString: "bigquery://p" })).toBe(true);
    expect(isBigQueryDatabase({ kind: "mysql", connectionString: "mysql://x" })).toBe(false);
  });
});

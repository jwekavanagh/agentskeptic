import { BigQuery } from "@google-cloud/bigquery";
import mysql from "mysql2/promise";
import mssql from "mssql";
import { ConnectorError } from "./sqlConnector.js";
import { connectPostgresVerificationClient, createPostgresSqlReadBackend } from "./sqlReadBackend.js";
import { executeRowAbsentRemote } from "./reconciler.js";
import type { ReconcileOutput } from "./reconciler.js";
import {
  reconcileRelationalMysql2,
  reconcileRelationalMssql,
  reconcileRelationalPostgres,
} from "./relationalInvariant.js";
import type { ResolvedRelationalCheck, RowAbsentVerificationRequest, VerificationDatabase, VerificationRequest } from "./types.js";
import type { SqlReadBackend } from "./sqlReadBackend.js";
import { nextPlaceholderSqlRow, quoteBigQueryTableId, quoteIdent, type SqlRowDialect } from "./sqlDialect.js";
import { SQL_VERIFICATION_OUTCOME_CODE } from "./wireReasonCodes.js";

export type VerificationSqlTarget = {
  sqlRead: SqlReadBackend;
  reconcileRelationalCheck: (check: ResolvedRelationalCheck) => Promise<ReconcileOutput>;
  close: () => Promise<void>;
};

function lowerRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v])));
}

function buildSelectByIdentitySqlMysql(req: VerificationRequest): { text: string; values: string[] } {
  const dialect: SqlRowDialect = "mysql";
  const table = quoteIdent(dialect, req.table);
  const conds: string[] = [];
  const values: string[] = [];
  let p = 1;
  for (const pair of req.identityEq) {
    conds.push(`${table}.${quoteIdent(dialect, pair.column)} = ${nextPlaceholderSqlRow(dialect, p++)}`);
    values.push(String(pair.value));
  }
  return {
    text: `SELECT * FROM ${table} WHERE ${conds.join(" AND ")} LIMIT 2`,
    values,
  };
}

function buildSelectByIdentitySqlMssql(req: VerificationRequest): { text: string; values: string[] } {
  const dialect: SqlRowDialect = "mssql";
  const table = quoteIdent(dialect, req.table);
  const conds: string[] = [];
  const values: string[] = [];
  let p = 1;
  for (const pair of req.identityEq) {
    conds.push(`${table}.${quoteIdent(dialect, pair.column)} = ${nextPlaceholderSqlRow(dialect, p++)}`);
    values.push(String(pair.value));
  }
  return {
    text: `SELECT TOP 2 * FROM ${table} WHERE ${conds.join(" AND ")}`,
    values,
  };
}

function buildSelectByIdentitySqlBigQuery(req: VerificationRequest): { text: string; params: Record<string, string> } {
  const table = quoteBigQueryTableId(req.table);
  const conds: string[] = [];
  const params: Record<string, string> = {};
  let i = 1;
  for (const pair of req.identityEq) {
    const name = `p${i}`;
    conds.push(`${table}.${quoteIdent("bigquery", pair.column)} = @${name}`);
    params[name] = String(pair.value);
    i++;
  }
  return {
    text: `SELECT * FROM ${table} WHERE ${conds.join(" AND ")} LIMIT 2`,
    params,
  };
}

function parseBigQueryConnectionString(cs: string): { projectId: string } {
  const u = cs.replace(/^bigquery:\/\//i, "");
  const projectId = u.split("/")[0]?.trim() ?? "";
  if (!projectId) {
    throw new Error("bigquery:// URL must start with bigquery://projectId/...");
  }
  return { projectId };
}

export async function openVerificationSqlTarget(database: VerificationDatabase): Promise<VerificationSqlTarget> {
  if (database.kind === "postgres") {
    const client = await connectPostgresVerificationClient(database.connectionString);
    const sqlRead = createPostgresSqlReadBackend(client);
    return {
      sqlRead,
      reconcileRelationalCheck: (check) => reconcileRelationalPostgres(client, check),
      close: async () => {
        try {
          await client.end();
        } catch {
          /* ignore */
        }
      },
    };
  }

  if (database.kind === "mysql") {
    const pool = await mysql.createPool(database.connectionString);
    const sqlRead: SqlReadBackend = {
      async fetchRows(req: VerificationRequest): Promise<Record<string, unknown>[]> {
        const { text, values } = buildSelectByIdentitySqlMysql(req);
        try {
          const [rows] = await pool.query(text, values);
          return lowerRows(rows as Record<string, unknown>[]);
        } catch (e) {
          throw new ConnectorError(e instanceof Error ? e.message : String(e), { cause: e });
        }
      },
      async reconcileRowAbsent(req: RowAbsentVerificationRequest): Promise<ReconcileOutput> {
        return executeRowAbsentRemote("mysql", async (t, v) => {
          const [rows] = await pool.query(t, v);
          return { rows: rows as Record<string, unknown>[] };
        }, req);
      },
    };
    return {
      sqlRead,
      reconcileRelationalCheck: (check) => reconcileRelationalMysql2(pool, check),
      close: async () => {
        await pool.end();
      },
    };
  }

  if (database.kind === "sqlserver") {
    const pool = await mssql.connect(database.connectionString);
    const sqlRead: SqlReadBackend = {
      async fetchRows(req: VerificationRequest): Promise<Record<string, unknown>[]> {
        const { text, values } = buildSelectByIdentitySqlMssql(req);
        try {
          const rq = pool.request();
          for (let i = 0; i < values.length; i++) {
            rq.input(`p${i + 1}`, mssql.NVarChar(mssql.MAX), values[i]!);
          }
          const res = await rq.query(text);
          return lowerRows(res.recordset as Record<string, unknown>[]);
        } catch (e) {
          throw new ConnectorError(e instanceof Error ? e.message : String(e), { cause: e });
        }
      },
      async reconcileRowAbsent(req: RowAbsentVerificationRequest): Promise<ReconcileOutput> {
        return executeRowAbsentRemote("mssql", async (t, v) => {
          const rq = pool.request();
          for (let i = 0; i < v.length; i++) {
            rq.input(`p${i + 1}`, mssql.NVarChar(mssql.MAX), v[i]!);
          }
          const res = await rq.query(t);
          return { rows: res.recordset as Record<string, unknown>[] };
        }, req);
      },
    };
    return {
      sqlRead,
      reconcileRelationalCheck: (check) => reconcileRelationalMssql(pool, check),
      close: async () => {
        await pool.close();
      },
    };
  }

  if (database.kind === "bigquery") {
    const { projectId } = parseBigQueryConnectionString(database.connectionString);
    const bq = new BigQuery({ projectId });
    const sqlRead: SqlReadBackend = {
      async fetchRows(req: VerificationRequest): Promise<Record<string, unknown>[]> {
        const { text, params } = buildSelectByIdentitySqlBigQuery(req);
        try {
          const [rows] = await bq.query({ query: text, params, useLegacySql: false });
          return lowerRows(rows as Record<string, unknown>[]);
        } catch (e) {
          throw new ConnectorError(e instanceof Error ? e.message : String(e), { cause: e });
        }
      },
      async reconcileRowAbsent(req: RowAbsentVerificationRequest): Promise<ReconcileOutput> {
        return executeRowAbsentRemote("bigquery", async (t, v) => {
          const params: Record<string, string> = {};
          for (let i = 0; i < v.length; i++) {
            params[`p${i + 1}`] = v[i]!;
          }
          const [rows] = await bq.query({ query: t, params, useLegacySql: false });
          return { rows: rows as Record<string, unknown>[] };
        }, req);
      },
    };
    return {
      sqlRead,
      reconcileRelationalCheck: () =>
        Promise.resolve({
          status: "incomplete_verification" as const,
          reasons: [
            {
              code: SQL_VERIFICATION_OUTCOME_CODE.RELATIONAL_UNSUPPORTED_DIALECT,
              message: "sql_relational is not supported for BigQuery verification targets",
            },
          ],
          evidenceSummary: {},
        }),
      close: async () => {},
    };
  }

  throw new Error(`openVerificationSqlTarget: unsupported database kind ${(database as VerificationDatabase).kind}`);
}

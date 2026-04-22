import { getPointer } from "./jsonPointer.js";
import type {
  HttpWitnessResolvedAssertion,
  HttpWitnessVerificationRequest,
  HttpWitnessVerificationSpec,
  IdentityEqPair,
  MongoDocumentVerificationRequest,
  MongoDocumentVerificationSpec,
  ObjectStorageVerificationRequest,
  ObjectStorageVerificationSpec,
  RelationalExpectSpec,
  RegistryNumberOrPointerSpec,
  ResolvedEffect,
  ResolvedRelationalCheck,
  RowAbsentVerificationRequest,
  SqlRelationalCheckSpec,
  SqlRowAbsentVerificationSpec,
  SqlRowVerificationSpec,
  ToolRegistryEntry,
  VectorDocumentVerificationRequest,
  VectorDocumentVerificationSpec,
  VerificationDatabase,
  VerificationRequest,
  VerificationScalar,
} from "./types.js";
import { CLI_OPERATIONAL_CODES } from "./failureCatalog.js";
import { TruthLayerError } from "./truthLayerError.js";
import { REGISTRY_RESOLVER_CODE } from "./wireReasonCodes.js";

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** UTF-16 code unit lexicographic order (same as `canonicalJsonForParams` object key sort). */
export function compareUtf16Id(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export type ResolveResult =
  | { ok: true; verificationKind: "sql_row"; request: VerificationRequest }
  | { ok: true; verificationKind: "sql_row_absent"; request: RowAbsentVerificationRequest }
  | { ok: true; verificationKind: "sql_effects"; effects: ResolvedEffect[] }
  | { ok: true; verificationKind: "sql_relational"; checks: ResolvedRelationalCheck[] }
  | { ok: true; verificationKind: "vector_document"; request: VectorDocumentVerificationRequest }
  | { ok: true; verificationKind: "object_storage_object"; request: ObjectStorageVerificationRequest }
  | { ok: true; verificationKind: "http_witness"; request: HttpWitnessVerificationRequest }
  | { ok: true; verificationKind: "mongo_document"; request: MongoDocumentVerificationRequest }
  | { ok: false; code: string; message: string };

function resolveStringSpec(
  spec: { const: string } | { pointer: string },
  params: Record<string, unknown>,
  label: string,
): { ok: true; value: string } | { ok: false; code: string; message: string } {
  if ("const" in spec) {
    const v = spec.const;
    if (typeof v !== "string" || v.length === 0) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.CONST_STRING_EMPTY,
        message: `${label}: const must be non-empty string`,
      };
    }
    return { ok: true, value: v };
  }
  const got = getPointer(params, spec.pointer);
  if (got === undefined || got === null) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.STRING_SPEC_POINTER_MISSING,
      message: `${label}: missing at ${spec.pointer}`,
    };
  }
  if (typeof got !== "string") {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.STRING_SPEC_TYPE,
      message: `${label}: expected string at ${spec.pointer}`,
    };
  }
  if (got.length === 0) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.STRING_SPEC_EMPTY,
      message: `${label}: empty string at ${spec.pointer}`,
    };
  }
  return { ok: true, value: got };
}

function resolveKeyValue(
  spec: { const: string | number | boolean | null } | { pointer: string },
  params: Record<string, unknown>,
): { ok: true; value: string } | { ok: false; code: string; message: string } {
  if ("const" in spec && !("pointer" in spec)) {
    return { ok: true, value: String(spec.const) };
  }
  if ("pointer" in spec) {
    const ptr = (spec as { pointer: string }).pointer;
    const got = getPointer(params, ptr);
    if (got === undefined || got === null) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.KEY_VALUE_POINTER_MISSING,
        message: `key.value missing at ${ptr}`,
      };
    }
    if (typeof got === "object") {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.KEY_VALUE_NOT_SCALAR,
        message: `key.value must be scalar at ${ptr}`,
      };
    }
    return { ok: true, value: String(got) };
  }
  return { ok: false, code: REGISTRY_RESOLVER_CODE.KEY_VALUE_SPEC_INVALID, message: "value: invalid spec" };
}

function normalizeSortedIdentityEq(
  pairs: Array<{ column: string; value: string }>,
  labelPrefix: string,
): { ok: true; identityEq: IdentityEqPair[] } | { ok: false; code: string; message: string } {
  const sorted = [...pairs].sort((a, b) => compareUtf16Id(a.column, b.column));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.column === sorted[i - 1]!.column) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.EQUALITY_DUPLICATE_COLUMN,
        message: `${labelPrefix}duplicate equality column: ${sorted[i]!.column}`,
      };
    }
  }
  return { ok: true, identityEq: sorted };
}

function resolveRegistryEqualityList(
  specs: SqlRowVerificationSpec["identityEq"],
  params: Record<string, unknown>,
  labelPrefix: string,
): { ok: true; identityEq: IdentityEqPair[] } | { ok: false; code: string; message: string } {
  const raw: Array<{ column: string; value: string }> = [];
  for (let i = 0; i < specs.length; i++) {
    const p = specs[i]!;
    const colRes = resolveStringSpec(p.column, params, `${labelPrefix}identityEq[${i}].column`);
    if (!colRes.ok) return colRes;
    if (!IDENT.test(colRes.value)) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
        message: `${labelPrefix}identityEq[${i}].column: ${colRes.value}`,
      };
    }
    const valRes = resolveKeyValue(p.value, params);
    if (!valRes.ok) {
      return { ok: false, code: valRes.code, message: `${labelPrefix}identityEq[${i}]. ${valRes.message}` };
    }
    raw.push({ column: colRes.value, value: valRes.value });
  }
  return normalizeSortedIdentityEq(raw, labelPrefix);
}

function resolveSqlRowSpec(
  params: Record<string, unknown>,
  spec: SqlRowVerificationSpec,
  labelPrefix: string,
): { ok: true; request: VerificationRequest } | { ok: false; code: string; message: string } {
  const tableRes =
    "const" in spec.table && !("pointer" in spec.table)
      ? { ok: true as const, value: spec.table.const }
      : "pointer" in spec.table
        ? (() => {
            const tptr = (spec.table as { pointer: string }).pointer;
            const got = getPointer(params, tptr);
            if (got === undefined || got === null || typeof got !== "string" || got.length === 0) {
              return {
                ok: false as const,
                code: REGISTRY_RESOLVER_CODE.TABLE_POINTER_INVALID,
                message: `${labelPrefix}table: expected non-empty string at ${tptr}`,
              };
            }
            return { ok: true as const, value: got };
          })()
        : {
            ok: false as const,
            code: REGISTRY_RESOLVER_CODE.TABLE_SPEC_INVALID,
            message: `${labelPrefix}table: invalid spec`,
          };

  if (!tableRes.ok) return tableRes;

  if (!IDENT.test(tableRes.value)) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
      message: `${labelPrefix}table: ${tableRes.value}`,
    };
  }

  const idRes = resolveRegistryEqualityList(spec.identityEq, params, labelPrefix);
  if (!idRes.ok) return idRes;

  const fieldsRaw = getPointer(params, spec.requiredFields.pointer);
  if (fieldsRaw === undefined || fieldsRaw === null) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_POINTER_MISSING,
      message: `${labelPrefix}requiredFields missing at ${spec.requiredFields.pointer}`,
    };
  }
  if (typeof fieldsRaw !== "object" || Array.isArray(fieldsRaw)) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_NOT_OBJECT,
      message: `${labelPrefix}requiredFields must be object at ${spec.requiredFields.pointer}`,
    };
  }

  const requiredFields: Record<string, VerificationScalar> = {};
  for (const k of Object.keys(fieldsRaw as Record<string, unknown>)) {
    if (!IDENT.test(k)) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
        message: `${labelPrefix}requiredFields key: ${k}`,
      };
    }
    const val = (fieldsRaw as Record<string, unknown>)[k];
    if (val === undefined) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_VALUE_UNDEFINED,
        message: `${labelPrefix}requiredFields.${k} must not be undefined`,
      };
    }
    if (typeof val === "object" && val !== null) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_VALUE_NOT_SCALAR,
        message: `${labelPrefix}requiredFields.${k} must be string, number, boolean, or null`,
      };
    }
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean" || val === null) {
      requiredFields[k] = val;
    } else {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_VALUE_NOT_SCALAR,
        message: `${labelPrefix}requiredFields.${k} must be string, number, boolean, or null`,
      };
    }
  }

  return {
    ok: true,
    request: {
      kind: "sql_row",
      table: tableRes.value,
      identityEq: idRes.identityEq,
      requiredFields,
    },
  };
}

function resolveSqlRowAbsentSpec(
  params: Record<string, unknown>,
  spec: SqlRowAbsentVerificationSpec,
  labelPrefix: string,
): { ok: true; request: RowAbsentVerificationRequest } | { ok: false; code: string; message: string } {
  const tableRes =
    "const" in spec.table && !("pointer" in spec.table)
      ? { ok: true as const, value: spec.table.const }
      : "pointer" in spec.table
        ? (() => {
            const tptr = (spec.table as { pointer: string }).pointer;
            const got = getPointer(params, tptr);
            if (got === undefined || got === null || typeof got !== "string" || got.length === 0) {
              return {
                ok: false as const,
                code: REGISTRY_RESOLVER_CODE.TABLE_POINTER_INVALID,
                message: `${labelPrefix}table: expected non-empty string at ${tptr}`,
              };
            }
            return { ok: true as const, value: got };
          })()
        : {
            ok: false as const,
            code: REGISTRY_RESOLVER_CODE.TABLE_SPEC_INVALID,
            message: `${labelPrefix}table: invalid spec`,
          };

  if (!tableRes.ok) return tableRes;
  if (!IDENT.test(tableRes.value)) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
      message: `${labelPrefix}table: ${tableRes.value}`,
    };
  }

  const idRes = resolveRegistryEqualityList(spec.identityEq, params, labelPrefix);
  if (!idRes.ok) return idRes;

  const identityCols = new Set(idRes.identityEq.map((p) => p.column));
  const filterSpecs = spec.filterEq ?? [];
  const filterRaw: Array<{ column: string; value: string }> = [];
  for (let i = 0; i < filterSpecs.length; i++) {
    const p = filterSpecs[i]!;
    const colRes = resolveStringSpec(p.column, params, `${labelPrefix}filterEq[${i}].column`);
    if (!colRes.ok) return colRes;
    if (!IDENT.test(colRes.value)) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
        message: `${labelPrefix}filterEq[${i}].column: ${colRes.value}`,
      };
    }
    if (identityCols.has(colRes.value)) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.FILTER_EQ_OVERLAPS_IDENTITY,
        message: `${labelPrefix}filterEq column ${colRes.value} duplicates identityEq`,
      };
    }
    const valRes = resolveKeyValue(p.value, params);
    if (!valRes.ok) {
      return { ok: false, code: valRes.code, message: `${labelPrefix}filterEq[${i}]. ${valRes.message}` };
    }
    filterRaw.push({ column: colRes.value, value: valRes.value });
  }

  const filterNorm = normalizeSortedIdentityEq(filterRaw, `${labelPrefix}filterEq: `);
  if (!filterNorm.ok) return filterNorm;

  return {
    ok: true,
    request: {
      kind: "sql_row_absent",
      table: tableRes.value,
      identityEq: idRes.identityEq,
      filterEq: filterNorm.identityEq,
    },
  };
}

function resolveTableIdent(
  spec: { const: string } | { pointer: string },
  params: Record<string, unknown>,
  label: string,
): { ok: true; value: string } | { ok: false; code: string; message: string } {
  const tableRes =
    "const" in spec && !("pointer" in spec)
      ? { ok: true as const, value: spec.const }
      : "pointer" in spec
        ? (() => {
            const tptr = (spec as { pointer: string }).pointer;
            const got = getPointer(params, tptr);
            if (got === undefined || got === null || typeof got !== "string" || got.length === 0) {
              return {
                ok: false as const,
                code: REGISTRY_RESOLVER_CODE.TABLE_POINTER_INVALID,
                message: `${label}: expected non-empty string at ${tptr}`,
              };
            }
            return { ok: true as const, value: got };
          })()
        : {
            ok: false as const,
            code: REGISTRY_RESOLVER_CODE.TABLE_SPEC_INVALID,
            message: `${label}: invalid spec`,
          };
  if (!tableRes.ok) return tableRes;
  if (!IDENT.test(tableRes.value)) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
      message: `${label}: ${tableRes.value}`,
    };
  }
  return { ok: true, value: tableRes.value };
}

function resolveExpectNumber(
  spec: RelationalExpectSpec["value"],
  params: Record<string, unknown>,
  label: string,
): { ok: true; value: number } | { ok: false; code: string; message: string } {
  if ("const" in spec && !("pointer" in spec)) {
    const n = spec.const;
    if (typeof n !== "number" || !Number.isFinite(n)) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.RELATIONAL_EXPECT_VALUE_INVALID,
        message: `${label}: const must be a finite number`,
      };
    }
    return { ok: true, value: n };
  }
  const ptr = (spec as { pointer: string }).pointer;
  const got = getPointer(params, ptr);
  if (got === undefined || got === null) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.RELATIONAL_EXPECT_VALUE_INVALID,
      message: `${label}: missing number at ${ptr}`,
    };
  }
  if (typeof got !== "number" || !Number.isFinite(got)) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.RELATIONAL_EXPECT_VALUE_INVALID,
      message: `${label}: expected finite number at ${ptr}`,
    };
  }
  return { ok: true, value: got };
}

function resolveSqlRelationalCheck(
  params: Record<string, unknown>,
  spec: SqlRelationalCheckSpec,
  labelPrefix: string,
): { ok: true; check: ResolvedRelationalCheck } | { ok: false; code: string; message: string } {
  if (spec.checkKind === "anti_join") {
    const anchor = resolveTableIdent(spec.anchorTable, params, `${labelPrefix}anchorTable`);
    if (!anchor.ok) return anchor;
    const lookup = resolveTableIdent(spec.lookupTable, params, `${labelPrefix}lookupTable`);
    if (!lookup.ok) return lookup;
    const ac = resolveStringSpec(spec.anchorColumn, params, `${labelPrefix}anchorColumn`);
    if (!ac.ok) return ac;
    if (!IDENT.test(ac.value)) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
        message: `${labelPrefix}anchorColumn: ${ac.value}`,
      };
    }
    const lc = resolveStringSpec(spec.lookupColumn, params, `${labelPrefix}lookupColumn`);
    if (!lc.ok) return lc;
    if (!IDENT.test(lc.value)) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
        message: `${labelPrefix}lookupColumn: ${lc.value}`,
      };
    }
    const pc = resolveStringSpec(spec.lookupPresenceColumn, params, `${labelPrefix}lookupPresenceColumn`);
    if (!pc.ok) return pc;
    if (!IDENT.test(pc.value)) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
        message: `${labelPrefix}lookupPresenceColumn: ${pc.value}`,
      };
    }

    const fa = spec.filterEqAnchor ?? [];
    const anchorFilters: Array<{ column: string; value: string }> = [];
    for (let i = 0; i < fa.length; i++) {
      const w = fa[i]!;
      const col = resolveStringSpec(w.column, params, `${labelPrefix}filterEqAnchor[${i}].column`);
      if (!col.ok) return col;
      if (!IDENT.test(col.value)) {
        return {
          ok: false,
          code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
          message: `${labelPrefix}filterEqAnchor[${i}].column: ${col.value}`,
        };
      }
      const val = resolveKeyValue(w.value, params);
      if (!val.ok) {
        return { ok: false, code: val.code, message: `${labelPrefix}filterEqAnchor[${i}]. ${val.message}` };
      }
      anchorFilters.push({ column: col.value, value: val.value });
    }
    const fl = spec.filterEqLookup ?? [];
    const lookupFilters: Array<{ column: string; value: string }> = [];
    for (let i = 0; i < fl.length; i++) {
      const w = fl[i]!;
      const col = resolveStringSpec(w.column, params, `${labelPrefix}filterEqLookup[${i}].column`);
      if (!col.ok) return col;
      if (!IDENT.test(col.value)) {
        return {
          ok: false,
          code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
          message: `${labelPrefix}filterEqLookup[${i}].column: ${col.value}`,
        };
      }
      const val = resolveKeyValue(w.value, params);
      if (!val.ok) {
        return { ok: false, code: val.code, message: `${labelPrefix}filterEqLookup[${i}]. ${val.message}` };
      }
      lookupFilters.push({ column: col.value, value: val.value });
    }

    const anchorNorm = normalizeSortedIdentityEq(anchorFilters, `${labelPrefix}filterEqAnchor: `);
    if (!anchorNorm.ok) return anchorNorm;
    const lookupNorm = normalizeSortedIdentityEq(lookupFilters, `${labelPrefix}filterEqLookup: `);
    if (!lookupNorm.ok) return lookupNorm;

    return {
      ok: true,
      check: {
        checkKind: "anti_join",
        id: spec.id,
        anchorTable: anchor.value,
        lookupTable: lookup.value,
        anchorColumn: ac.value,
        lookupColumn: lc.value,
        lookupPresenceColumn: pc.value,
        filterEqAnchor: anchorNorm.identityEq,
        filterEqLookup: lookupNorm.identityEq,
      },
    };
  }

  if (spec.checkKind === "related_exists") {
    const child = resolveTableIdent(spec.childTable, params, `${labelPrefix}childTable`);
    if (!child.ok) return child;
    const matchRes = resolveRegistryEqualityList(spec.matchEq, params, labelPrefix);
    if (!matchRes.ok) return matchRes;
    return {
      ok: true,
      check: {
        checkKind: "related_exists",
        id: spec.id,
        childTable: child.value,
        matchEq: matchRes.identityEq,
      },
    };
  }

  if (spec.checkKind === "aggregate") {
    const tbl = resolveTableIdent(spec.table, params, `${labelPrefix}table`);
    if (!tbl.ok) return tbl;
    let sumColumn: string | undefined;
    if (spec.fn === "SUM") {
      if (!spec.sumColumn) {
        return {
          ok: false,
          code: REGISTRY_RESOLVER_CODE.RELATIONAL_SUM_COLUMN_REQUIRED,
          message: `${labelPrefix}sumColumn required when fn is SUM`,
        };
      }
      const sc = resolveStringSpec(spec.sumColumn, params, `${labelPrefix}sumColumn`);
      if (!sc.ok) return sc;
      if (!IDENT.test(sc.value)) {
        return {
          ok: false,
          code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
          message: `${labelPrefix}sumColumn: ${sc.value}`,
        };
      }
      sumColumn = sc.value;
    }
    const whereEq: Array<{ column: string; value: string }> = [];
    for (let i = 0; i < (spec.whereEq?.length ?? 0); i++) {
      const w = spec.whereEq![i]!;
      const col = resolveStringSpec(w.column, params, `${labelPrefix}whereEq[${i}].column`);
      if (!col.ok) return col;
      if (!IDENT.test(col.value)) {
        return {
          ok: false,
          code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
          message: `${labelPrefix}whereEq[${i}].column: ${col.value}`,
        };
      }
      const val = resolveKeyValue(w.value, params);
      if (!val.ok) {
        return { ok: false, code: val.code, message: `${labelPrefix}whereEq[${i}]. ${val.message}` };
      }
      whereEq.push({ column: col.value, value: val.value });
    }
    const exp = resolveExpectNumber(spec.expect.value, params, `${labelPrefix}expect.value`);
    if (!exp.ok) return exp;
    return {
      ok: true,
      check: {
        checkKind: "aggregate",
        id: spec.id,
        table: tbl.value,
        fn: spec.fn,
        sumColumn,
        whereEq,
        expectOp: spec.expect.op,
        expectValue: exp.value,
      },
    };
  }

  const left = resolveTableIdent(spec.leftTable, params, `${labelPrefix}leftTable`);
  if (!left.ok) return left;
  const right = resolveTableIdent(spec.rightTable, params, `${labelPrefix}rightTable`);
  if (!right.ok) return right;
  const lj = resolveStringSpec(spec.join.leftColumn, params, `${labelPrefix}join.leftColumn`);
  if (!lj.ok) return lj;
  if (!IDENT.test(lj.value)) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
      message: `${labelPrefix}join.leftColumn: ${lj.value}`,
    };
  }
  const rj = resolveStringSpec(spec.join.rightColumn, params, `${labelPrefix}join.rightColumn`);
  if (!rj.ok) return rj;
  if (!IDENT.test(rj.value)) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
      message: `${labelPrefix}join.rightColumn: ${rj.value}`,
    };
  }
  const whereEq: Array<{ side: "left" | "right"; column: string; value: string }> = [];
  for (let i = 0; i < (spec.whereEq?.length ?? 0); i++) {
    const w = spec.whereEq![i]!;
    const col = resolveStringSpec(w.column, params, `${labelPrefix}whereEq[${i}].column`);
    if (!col.ok) return col;
    if (!IDENT.test(col.value)) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.INVALID_IDENTIFIER,
        message: `${labelPrefix}whereEq[${i}].column: ${col.value}`,
      };
    }
    const val = resolveKeyValue(w.value, params);
    if (!val.ok) {
      return { ok: false, code: val.code, message: `${labelPrefix}whereEq[${i}]. ${val.message}` };
    }
    whereEq.push({ side: w.tableSide, column: col.value, value: val.value });
  }
  const exp = resolveExpectNumber(spec.expect.value, params, `${labelPrefix}expect.value`);
  if (!exp.ok) return exp;
  return {
    ok: true,
    check: {
      checkKind: "join_count",
      id: spec.id,
      leftTable: left.value,
      rightTable: right.value,
      leftJoinColumn: lj.value,
      rightJoinColumn: rj.value,
      whereEq,
      expectOp: spec.expect.op,
      expectValue: exp.value,
    },
  };
}

export function renderIntendedEffect(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{(\/[^{}]+)\}/g, (_, ptr: string) => {
    const v = getPointer(params, ptr);
    if (v === undefined) return "MISSING";
    return JSON.stringify(v);
  });
}

function resolveNumberOrPointer(
  spec: RegistryNumberOrPointerSpec | undefined,
  params: Record<string, unknown>,
  label: string,
  fallback: number | undefined,
): { ok: true; value: number } | { ok: false; code: string; message: string } {
  if (spec === undefined) {
    if (fallback === undefined) {
      return { ok: false, code: REGISTRY_RESOLVER_CODE.KEY_VALUE_SPEC_INVALID, message: `${label}: missing` };
    }
    return { ok: true, value: fallback };
  }
  if ("const" in spec && !("pointer" in spec)) {
    if (typeof spec.const !== "number" || !Number.isFinite(spec.const)) {
      return { ok: false, code: REGISTRY_RESOLVER_CODE.KEY_VALUE_SPEC_INVALID, message: `${label}: const must be finite number` };
    }
    return { ok: true, value: spec.const };
  }
  const ptr = (spec as { pointer: string }).pointer;
  const got = getPointer(params, ptr);
  if (got === undefined || got === null) {
    return { ok: false, code: REGISTRY_RESOLVER_CODE.KEY_VALUE_POINTER_MISSING, message: `${label}: missing at ${ptr}` };
  }
  if (typeof got !== "number" || !Number.isFinite(got)) {
    return { ok: false, code: REGISTRY_RESOLVER_CODE.KEY_VALUE_NOT_SCALAR, message: `${label}: expected number at ${ptr}` };
  }
  return { ok: true, value: got };
}

function resolveScalarOrPointerForAssertion(
  spec: { const: string | number | boolean | null } | { pointer: string },
  params: Record<string, unknown>,
  label: string,
): { ok: true; value: VerificationScalar } | { ok: false; code: string; message: string } {
  if ("const" in spec && !("pointer" in spec)) {
    const c = spec.const;
    if (typeof c === "object" && c !== null) {
      return { ok: false, code: REGISTRY_RESOLVER_CODE.KEY_VALUE_NOT_SCALAR, message: `${label}: const must be scalar` };
    }
    return { ok: true, value: c as VerificationScalar };
  }
  const ptr = (spec as { pointer: string }).pointer;
  const got = getPointer(params, ptr);
  if (got === undefined) {
    return { ok: false, code: REGISTRY_RESOLVER_CODE.KEY_VALUE_POINTER_MISSING, message: `${label}: missing at ${ptr}` };
  }
  if (typeof got === "object" && got !== null) {
    return { ok: false, code: REGISTRY_RESOLVER_CODE.KEY_VALUE_NOT_SCALAR, message: `${label}: must be scalar at ${ptr}` };
  }
  if (typeof got === "string" || typeof got === "number" || typeof got === "boolean" || got === null) {
    return { ok: true, value: got };
  }
  return { ok: false, code: REGISTRY_RESOLVER_CODE.KEY_VALUE_NOT_SCALAR, message: `${label}: unsupported scalar at ${ptr}` };
}

function resolveMetadataSubsetAtPointer(
  params: Record<string, unknown>,
  pointer: string,
  labelPrefix: string,
): { ok: true; metadata: Record<string, VerificationScalar> } | { ok: false; code: string; message: string } {
  const fieldsRaw = getPointer(params, pointer);
  if (fieldsRaw === undefined || fieldsRaw === null) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_POINTER_MISSING,
      message: `${labelPrefix}metadataEq missing at ${pointer}`,
    };
  }
  if (typeof fieldsRaw !== "object" || Array.isArray(fieldsRaw)) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_NOT_OBJECT,
      message: `${labelPrefix}metadataEq must be object at ${pointer}`,
    };
  }
  const metadata: Record<string, VerificationScalar> = {};
  for (const k of Object.keys(fieldsRaw as Record<string, unknown>)) {
    const val = (fieldsRaw as Record<string, unknown>)[k];
    if (val === undefined) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_VALUE_UNDEFINED,
        message: `${labelPrefix}metadataEq.${k} must not be undefined`,
      };
    }
    if (typeof val === "object" && val !== null) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_VALUE_NOT_SCALAR,
        message: `${labelPrefix}metadataEq.${k} must be scalar`,
      };
    }
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean" || val === null) {
      metadata[k] = val;
    } else {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_VALUE_NOT_SCALAR,
        message: `${labelPrefix}metadataEq.${k} must be scalar`,
      };
    }
  }
  return { ok: true, metadata };
}

function resolveVectorDocumentSpec(
  params: Record<string, unknown>,
  spec: VectorDocumentVerificationSpec,
  labelPrefix: string,
): { ok: true; request: VectorDocumentVerificationRequest } | { ok: false; code: string; message: string } {
  const docId = resolveStringSpec(spec.documentId, params, `${labelPrefix}documentId`);
  if (!docId.ok) return docId;
  const indexName = resolveStringSpec(spec.indexName, params, `${labelPrefix}indexName`);
  if (!indexName.ok) return indexName;
  let namespace: string | undefined;
  if (spec.namespace !== undefined) {
    const ns = resolveStringSpec(spec.namespace, params, `${labelPrefix}namespace`);
    if (!ns.ok) return ns;
    namespace = ns.value;
  }
  let host: string | undefined;
  if (spec.host !== undefined) {
    const h = resolveStringSpec(spec.host, params, `${labelPrefix}host`);
    if (!h.ok) return h;
    host = h.value;
  }
  let metadataSubset: Record<string, VerificationScalar> | undefined;
  if (spec.metadataEq !== undefined) {
    const m = resolveMetadataSubsetAtPointer(params, spec.metadataEq.pointer, labelPrefix);
    if (!m.ok) return m;
    metadataSubset = m.metadata;
  }
  let expectPayloadSha256: string | undefined;
  if (spec.expectPayloadSha256 !== undefined) {
    const sh = resolveStringSpec(spec.expectPayloadSha256, params, `${labelPrefix}expectPayloadSha256`);
    if (!sh.ok) return sh;
    expectPayloadSha256 = sh.value;
  }
  return {
    ok: true,
    request: {
      kind: "vector_document",
      provider: spec.provider,
      documentId: docId.value,
      indexName: indexName.value,
      ...(namespace !== undefined ? { namespace } : {}),
      ...(host !== undefined ? { host } : {}),
      ...(metadataSubset !== undefined ? { metadataSubset } : {}),
      ...(expectPayloadSha256 !== undefined ? { expectPayloadSha256 } : {}),
    },
  };
}

function resolveObjectStorageSpec(
  params: Record<string, unknown>,
  spec: ObjectStorageVerificationSpec,
  labelPrefix: string,
): { ok: true; request: ObjectStorageVerificationRequest } | { ok: false; code: string; message: string } {
  const bucket = resolveStringSpec(spec.bucket, params, `${labelPrefix}bucket`);
  if (!bucket.ok) return bucket;
  const key = resolveStringSpec(spec.key, params, `${labelPrefix}key`);
  if (!key.ok) return key;
  let endpoint: string | undefined;
  if (spec.endpoint !== undefined) {
    const ep = resolveStringSpec(spec.endpoint, params, `${labelPrefix}endpoint`);
    if (!ep.ok) return ep;
    endpoint = ep.value;
  }
  let expectSizeBytes: number | undefined;
  if (spec.expectSizeBytes !== undefined) {
    const sz = resolveNumberOrPointer(spec.expectSizeBytes, params, `${labelPrefix}expectSizeBytes`, undefined);
    if (!sz.ok) return sz;
    if (!Number.isInteger(sz.value) || sz.value < 0) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.KEY_VALUE_SPEC_INVALID,
        message: `${labelPrefix}expectSizeBytes must be non-negative integer`,
      };
    }
    expectSizeBytes = sz.value;
  }
  let expectSha256: string | undefined;
  if (spec.expectSha256 !== undefined) {
    const h = resolveStringSpec(spec.expectSha256, params, `${labelPrefix}expectSha256`);
    if (!h.ok) return h;
    expectSha256 = h.value;
  }
  let expectEtag: string | undefined;
  if (spec.expectEtag !== undefined) {
    const e = resolveStringSpec(spec.expectEtag, params, `${labelPrefix}expectEtag`);
    if (!e.ok) return e;
    expectEtag = e.value;
  }
  return {
    ok: true,
    request: {
      kind: "object_storage_object",
      bucket: bucket.value,
      key: key.value,
      ...(endpoint !== undefined ? { endpoint } : {}),
      ...(expectSizeBytes !== undefined ? { expectSizeBytes } : {}),
      ...(expectSha256 !== undefined ? { expectSha256 } : {}),
      ...(expectEtag !== undefined ? { expectEtag } : {}),
    },
  };
}

function resolveHttpWitnessSpec(
  params: Record<string, unknown>,
  spec: HttpWitnessVerificationSpec,
  labelPrefix: string,
): { ok: true; request: HttpWitnessVerificationRequest } | { ok: false; code: string; message: string } {
  const url = resolveStringSpec(spec.url, params, `${labelPrefix}url`);
  if (!url.ok) return url;
  const method = spec.method ?? "GET";
  const st = spec.expectedStatus !== undefined ? resolveNumberOrPointer(spec.expectedStatus, params, `${labelPrefix}expectedStatus`, undefined) : { ok: true as const, value: 200 };
  if (!st.ok) return st;
  if (!Number.isInteger(st.value) || st.value < 100 || st.value > 599) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.KEY_VALUE_SPEC_INVALID,
      message: `${labelPrefix}expectedStatus must be HTTP status 100–599`,
    };
  }
  const assertions: HttpWitnessResolvedAssertion[] = [];
  for (let i = 0; i < (spec.assertions?.length ?? 0); i++) {
    const a = spec.assertions![i]!;
    const val = resolveScalarOrPointerForAssertion(a.value, params, `${labelPrefix}assertions[${i}].value`);
    if (!val.ok) return val;
    assertions.push({ jsonPointer: a.jsonPointer, value: val.value });
  }
  return {
    ok: true,
    request: {
      kind: "http_witness",
      method,
      url: url.value,
      expectedStatus: st.value,
      ...(assertions.length > 0 ? { assertions } : {}),
    },
  };
}

function resolveMongoDocumentSpec(
  params: Record<string, unknown>,
  spec: MongoDocumentVerificationSpec,
  labelPrefix: string,
): { ok: true; request: MongoDocumentVerificationRequest } | { ok: false; code: string; message: string } {
  const coll = resolveStringSpec(spec.collection, params, `${labelPrefix}collection`);
  if (!coll.ok) return coll;
  const filterRaw = getPointer(params, spec.filterPointer.pointer);
  if (filterRaw === undefined || filterRaw === null) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_POINTER_MISSING,
      message: `${labelPrefix}filter missing at ${spec.filterPointer.pointer}`,
    };
  }
  if (typeof filterRaw !== "object" || Array.isArray(filterRaw)) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_NOT_OBJECT,
      message: `${labelPrefix}filter must be object at ${spec.filterPointer.pointer}`,
    };
  }
  const fieldsRaw = getPointer(params, spec.requiredFields.pointer);
  if (fieldsRaw === undefined || fieldsRaw === null) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_POINTER_MISSING,
      message: `${labelPrefix}requiredFields missing at ${spec.requiredFields.pointer}`,
    };
  }
  if (typeof fieldsRaw !== "object" || Array.isArray(fieldsRaw)) {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_NOT_OBJECT,
      message: `${labelPrefix}requiredFields must be object at ${spec.requiredFields.pointer}`,
    };
  }
  const requiredFields: Record<string, VerificationScalar> = {};
  for (const k of Object.keys(fieldsRaw as Record<string, unknown>)) {
    const val = (fieldsRaw as Record<string, unknown>)[k];
    if (val === undefined) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_VALUE_UNDEFINED,
        message: `${labelPrefix}requiredFields.${k} must not be undefined`,
      };
    }
    if (typeof val === "object" && val !== null) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_VALUE_NOT_SCALAR,
        message: `${labelPrefix}requiredFields.${k} must be scalar`,
      };
    }
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean" || val === null) {
      requiredFields[k] = val;
    } else {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.REQUIRED_FIELDS_VALUE_NOT_SCALAR,
        message: `${labelPrefix}requiredFields.${k} must be scalar`,
      };
    }
  }
  return {
    ok: true,
    request: {
      kind: "mongo_document",
      collection: coll.value,
      filter: filterRaw as Record<string, unknown>,
      requiredFields,
    },
  };
}

export function resolveVerificationRequest(
  entry: ToolRegistryEntry,
  params: Record<string, unknown>,
  verificationTarget?: VerificationDatabase,
): ResolveResult {
  const v = entry.verification;
  if (v.kind === "sql_row") {
    const row = resolveSqlRowSpec(params, v, "");
    if (!row.ok) return row;
    return { ok: true, verificationKind: "sql_row", request: row.request };
  }
  if (v.kind === "sql_row_absent") {
    const absent = resolveSqlRowAbsentSpec(params, v, "");
    if (!absent.ok) return absent;
    return { ok: true, verificationKind: "sql_row_absent", request: absent.request };
  }
  if (v.kind === "vector_document") {
    const vec = resolveVectorDocumentSpec(params, v, "");
    if (!vec.ok) return vec;
    return { ok: true, verificationKind: "vector_document", request: vec.request };
  }
  if (v.kind === "object_storage_object") {
    const os = resolveObjectStorageSpec(params, v, "");
    if (!os.ok) return os;
    return { ok: true, verificationKind: "object_storage_object", request: os.request };
  }
  if (v.kind === "http_witness") {
    const hw = resolveHttpWitnessSpec(params, v, "");
    if (!hw.ok) return hw;
    return { ok: true, verificationKind: "http_witness", request: hw.request };
  }
  if (v.kind === "mongo_document") {
    const md = resolveMongoDocumentSpec(params, v, "");
    if (!md.ok) return md;
    return { ok: true, verificationKind: "mongo_document", request: md.request };
  }
  if (v.kind === "sql_relational") {
    if (verificationTarget?.kind === "bigquery") {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.RELATIONAL_UNSUPPORTED_DIALECT,
        message: "sql_relational is not supported for BigQuery verification targets (row checks only in v1)",
      };
    }
    const seen = new Set<string>();
    const checks: ResolvedRelationalCheck[] = [];
    for (const item of v.checks) {
      if (seen.has(item.id)) {
        return {
          ok: false,
          code: REGISTRY_RESOLVER_CODE.DUPLICATE_EFFECT_ID,
          message: `Duplicate effect id in registry: ${item.id}`,
        };
      }
      seen.add(item.id);
      const r = resolveSqlRelationalCheck(params, item, `checks[${item.id}].`);
      if (!r.ok) return r;
      checks.push(r.check);
    }
    checks.sort((a, b) => compareUtf16Id(a.id, b.id));
    return { ok: true, verificationKind: "sql_relational", checks };
  }
  if (v.kind !== "sql_effects") {
    return {
      ok: false,
      code: REGISTRY_RESOLVER_CODE.UNSUPPORTED_VERIFICATION_KIND,
      message: "unsupported verification kind",
    };
  }

  const seen = new Set<string>();
  const effects: ResolvedEffect[] = [];
  for (const item of v.effects) {
    if (seen.has(item.id)) {
      return {
        ok: false,
        code: REGISTRY_RESOLVER_CODE.DUPLICATE_EFFECT_ID,
        message: `Duplicate effect id in registry: ${item.id}`,
      };
    }
    seen.add(item.id);
    const { id, ...spec } = item;
    const row = resolveSqlRowSpec(params, spec as SqlRowVerificationSpec, `effects[${id}].`);
    if (!row.ok) return row;
    effects.push({ id, request: row.request });
  }

  effects.sort((a, b) => compareUtf16Id(a.id, b.id));
  return { ok: true, verificationKind: "sql_effects", effects };
}

export function buildRegistryMap(entries: ToolRegistryEntry[]): Map<string, ToolRegistryEntry> {
  const m = new Map<string, ToolRegistryEntry>();
  for (const e of entries) {
    if (m.has(e.toolId)) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.REGISTRY_DUPLICATE_TOOL_ID,
        `Duplicate toolId in registry: ${e.toolId}`,
      );
    }
    m.set(e.toolId, e);
  }
  return m;
}

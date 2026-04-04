/**
 * Every `code` returned on `{ ok: false }` from resolveVerificationRequest / resolveSqlRowSpec
 * in resolveExpectation.ts. Kept in a leaf module so failureOriginCatalog avoids importing verificationDiagnostics.
 */
export const RESOLVE_FAILURE_CODES: ReadonlySet<string> = new Set([
  "CONST_STRING_EMPTY",
  "STRING_SPEC_POINTER_MISSING",
  "STRING_SPEC_TYPE",
  "STRING_SPEC_EMPTY",
  "KEY_VALUE_POINTER_MISSING",
  "KEY_VALUE_NOT_SCALAR",
  "KEY_VALUE_SPEC_INVALID",
  "TABLE_POINTER_INVALID",
  "TABLE_SPEC_INVALID",
  "INVALID_IDENTIFIER",
  "REQUIRED_FIELDS_POINTER_MISSING",
  "REQUIRED_FIELDS_NOT_OBJECT",
  "REQUIRED_FIELDS_VALUE_UNDEFINED",
  "REQUIRED_FIELDS_VALUE_NOT_SCALAR",
  "UNSUPPORTED_VERIFICATION_KIND",
  "DUPLICATE_EFFECT_ID",
]);

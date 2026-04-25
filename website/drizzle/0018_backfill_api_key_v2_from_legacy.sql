INSERT INTO "api_key_v2" (
	"id",
	"user_id",
	"label",
	"scopes",
	"key_lookup_sha256",
	"key_hash",
	"status",
	"created_at",
	"expires_at",
	"revoked_at",
	"disabled_at",
	"last_used_at",
	"rotated_from_key_id",
	"rotated_to_key_id",
	"migrated_from_legacy_id"
)
SELECT
	ak."id",
	ak."user_id",
	'Legacy key ' || to_char(ak."created_at", 'YYYY-MM-DD HH24:MI'),
	ARRAY['read','meter','report','admin']::"api_key_v2_scope"[],
	ak."key_lookup_sha256",
	ak."key_hash",
	CASE WHEN ak."revoked_at" IS NULL THEN 'active'::"api_key_v2_status" ELSE 'revoked'::"api_key_v2_status" END,
	ak."created_at",
	NULL,
	ak."revoked_at",
	NULL,
	NULL,
	NULL,
	NULL,
	ak."id"
FROM "api_key" ak
ON CONFLICT ("migrated_from_legacy_id") DO NOTHING;

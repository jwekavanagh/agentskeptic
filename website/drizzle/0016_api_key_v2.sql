CREATE TYPE "public"."api_key_v2_status" AS ENUM('active', 'revoked', 'disabled');
--> statement-breakpoint
CREATE TYPE "public"."api_key_v2_scope" AS ENUM('read', 'meter', 'report', 'admin');
--> statement-breakpoint
CREATE TABLE "api_key_v2" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" varchar(64) NOT NULL,
	"scopes" "api_key_v2_scope"[] NOT NULL,
	"key_lookup_sha256" text NOT NULL,
	"key_hash" text NOT NULL,
	"status" "api_key_v2_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"disabled_at" timestamp,
	"last_used_at" timestamp,
	"rotated_from_key_id" text,
	"rotated_to_key_id" text,
	"migrated_from_legacy_id" text,
	CONSTRAINT "api_key_v2_key_lookup_sha256_unique" UNIQUE("key_lookup_sha256"),
	CONSTRAINT "api_key_v2_migrated_from_legacy_id_unique" UNIQUE("migrated_from_legacy_id"),
	CONSTRAINT "api_key_v2_label_trimmed_nonempty" CHECK (char_length(btrim("label")) between 1 and 64),
	CONSTRAINT "api_key_v2_scopes_nonempty" CHECK (coalesce(array_length("scopes", 1), 0) >= 1),
	CONSTRAINT "api_key_v2_scopes_len_max4" CHECK (coalesce(array_length("scopes", 1), 0) <= 4)
);
--> statement-breakpoint
ALTER TABLE "api_key_v2" ADD CONSTRAINT "api_key_v2_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "api_key_v2_user_status_idx" ON "api_key_v2" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX "api_key_v2_last_used_idx" ON "api_key_v2" USING btree ("last_used_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_v2_active_label_ci_uq" ON "api_key_v2" USING btree ("user_id", lower("label")) WHERE "status" = 'active';

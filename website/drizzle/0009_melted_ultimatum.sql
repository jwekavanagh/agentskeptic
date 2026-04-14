ALTER TABLE "funnel_event" ADD COLUMN "install_id" text;
--> statement-breakpoint
CREATE INDEX "funnel_event_install_id_idx" ON "funnel_event" ("install_id") WHERE "install_id" IS NOT NULL;

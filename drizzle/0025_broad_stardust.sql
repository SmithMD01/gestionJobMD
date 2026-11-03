CREATE TABLE "calendar_sync_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"api_requests" integer DEFAULT 0 NOT NULL,
	"fetched_events" integer DEFAULT 0 NOT NULL,
	"removed_events" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "all_day" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "external_calendar_id" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "external_event_id" text;--> statement-breakpoint
ALTER TABLE "calendar_sync_run" ADD CONSTRAINT "calendar_sync_run_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_run" ADD CONSTRAINT "calendar_sync_run_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_run" ADD CONSTRAINT "calendar_sync_run_account_id_calendar_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."calendar_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_sync_run_user_started_idx" ON "calendar_sync_run" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "calendar_sync_run_account_started_idx" ON "calendar_sync_run" USING btree ("account_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_event_external_source_uidx" ON "calendar_event" USING btree ("source_account_id","external_calendar_id","external_event_id");
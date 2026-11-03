CREATE TABLE "calendar_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'manual' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_destination" (
	"user_id" text PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'America/Lima' NOT NULL,
	"source_account_id" uuid,
	"destination_account_id" uuid,
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_calendar_binding" (
	"company_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"show_centralized" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_calendar_binding_company_id_user_id_pk" PRIMARY KEY("company_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "calendar_account" ADD CONSTRAINT "calendar_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_destination" ADD CONSTRAINT "calendar_destination_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_destination" ADD CONSTRAINT "calendar_destination_account_id_calendar_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."calendar_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_source_account_id_calendar_account_id_fk" FOREIGN KEY ("source_account_id") REFERENCES "public"."calendar_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_destination_account_id_calendar_account_id_fk" FOREIGN KEY ("destination_account_id") REFERENCES "public"."calendar_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_calendar_binding" ADD CONSTRAINT "company_calendar_binding_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_calendar_binding" ADD CONSTRAINT "company_calendar_binding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_calendar_binding" ADD CONSTRAINT "company_calendar_binding_account_id_calendar_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."calendar_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_account_user_idx" ON "calendar_account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_account_user_email_uidx" ON "calendar_account" USING btree ("user_id","email");--> statement-breakpoint
CREATE INDEX "calendar_event_user_company_start_idx" ON "calendar_event" USING btree ("user_id","company_id","starts_at");--> statement-breakpoint
CREATE INDEX "calendar_event_user_start_idx" ON "calendar_event" USING btree ("user_id","starts_at");--> statement-breakpoint
CREATE INDEX "company_calendar_binding_user_idx" ON "company_calendar_binding" USING btree ("user_id");
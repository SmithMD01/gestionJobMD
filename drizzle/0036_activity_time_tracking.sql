CREATE TABLE "activity_time_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"minutes" integer NOT NULL,
	"logged_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ALTER COLUMN "hours" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "activity_time_entry" ADD CONSTRAINT "activity_time_entry_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_time_entry" ADD CONSTRAINT "activity_time_entry_logged_by_user_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
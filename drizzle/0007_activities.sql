CREATE TYPE "public"."activity_origin" AS ENUM('manual', 'voice', 'email', 'meeting', 'automation');--> statement-breakpoint
CREATE TYPE "public"."activity_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."activity_status" AS ENUM('to_validate', 'pending', 'in_progress', 'blocked', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "activity_status" DEFAULT 'pending' NOT NULL,
	"priority" "activity_priority" DEFAULT 'medium' NOT NULL,
	"activity_date" date,
	"due_date" date,
	"hours" integer,
	"observations" text DEFAULT '' NOT NULL,
	"origin" "activity_origin" DEFAULT 'manual' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
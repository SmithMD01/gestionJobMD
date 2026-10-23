CREATE TYPE "public"."activity_type" AS ENUM('task', 'meeting', 'coordination', 'follow_up', 'development', 'other');--> statement-breakpoint
ALTER TABLE "activity" ALTER COLUMN "priority" SET DATA TYPE integer USING CASE "priority"::text WHEN 'low' THEN 1 WHEN 'medium' THEN 3 WHEN 'high' THEN 4 WHEN 'urgent' THEN 5 ELSE 3 END;--> statement-breakpoint
ALTER TABLE "activity" ALTER COLUMN "priority" SET DEFAULT 3;--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "type" "activity_type" DEFAULT 'task' NOT NULL;--> statement-breakpoint
DROP TYPE "public"."activity_priority";

CREATE TABLE "calendar_instance_config" (
	"id" integer PRIMARY KEY NOT NULL,
	"sync_mode" text DEFAULT 'origin' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_instance_config" ADD CONSTRAINT "calendar_instance_config_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "calendar_instance_config" ("id", "sync_mode") VALUES (1, 'origin');
--> statement-breakpoint
INSERT INTO "role_module_permission" ("role_id", "module_key", "can_access", "updated_by")
SELECT "id", 'settings.calendar-integration', true, "created_by" FROM "app_role" WHERE "key" = 'admin'
ON CONFLICT ("role_id", "module_key") DO NOTHING;

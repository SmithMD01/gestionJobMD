CREATE TYPE "public"."project_dependency_category" AS ENUM('document', 'workflow', 'business_rule', 'data', 'other');--> statement-breakpoint
CREATE TYPE "public"."project_dependency_status" AS ENUM('pending', 'answered', 'awaiting_confirmation', 'resolved');--> statement-breakpoint
CREATE TABLE "project_dependency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"external_code" text,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" "project_dependency_category" DEFAULT 'other' NOT NULL,
	"status" "project_dependency_status" DEFAULT 'pending' NOT NULL,
	"response" text DEFAULT '' NOT NULL,
	"due_date" date,
	"answered_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_dependency_relation" (
	"dependency_id" uuid NOT NULL,
	"related_dependency_id" uuid NOT NULL,
	CONSTRAINT "project_dependency_relation_dependency_id_related_dependency_id_pk" PRIMARY KEY("dependency_id","related_dependency_id")
);
--> statement-breakpoint
ALTER TABLE "project_dependency" ADD CONSTRAINT "project_dependency_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_dependency" ADD CONSTRAINT "project_dependency_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_dependency_relation" ADD CONSTRAINT "project_dependency_relation_dependency_id_project_dependency_id_fk" FOREIGN KEY ("dependency_id") REFERENCES "public"."project_dependency"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_dependency_relation" ADD CONSTRAINT "project_dependency_relation_related_dependency_id_project_dependency_id_fk" FOREIGN KEY ("related_dependency_id") REFERENCES "public"."project_dependency"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_dependency_code_uidx" ON "project_dependency" USING btree ("project_id","external_code") WHERE "project_dependency"."external_code" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "project_dependency_relation" ADD CONSTRAINT "project_dependency_relation_no_self_fk_check" CHECK ("dependency_id" <> "related_dependency_id");
--> statement-breakpoint
INSERT INTO "role_module_permission" ("role_id", "module_key", "can_access", "updated_by")
SELECT "id", 'projects.dependencies', true, "created_by" FROM "app_role" WHERE "key" = 'admin'
ON CONFLICT ("role_id", "module_key") DO NOTHING;

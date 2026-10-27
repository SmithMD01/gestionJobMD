CREATE TABLE "project_module" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "module_id" uuid;--> statement-breakpoint
ALTER TABLE "project_module" ADD CONSTRAINT "project_module_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_module" ADD CONSTRAINT "project_module_parent_id_project_module_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."project_module"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_module_id_project_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."project_module"("id") ON DELETE no action ON UPDATE no action;
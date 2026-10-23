CREATE TABLE "activity_responsible" (
	"activity_id" uuid NOT NULL,
	"team_member_id" uuid NOT NULL,
	CONSTRAINT "activity_responsible_activity_id_team_member_id_pk" PRIMARY KEY("activity_id","team_member_id")
);
--> statement-breakpoint
CREATE TABLE "development_stage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'neutral' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "development_stage_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "company_team_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "development_stage_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_responsible" ADD CONSTRAINT "activity_responsible_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_responsible" ADD CONSTRAINT "activity_responsible_team_member_id_company_team_member_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."company_team_member"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_team_member" ADD CONSTRAINT "company_team_member_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_development_stage_id_development_stage_id_fk" FOREIGN KEY ("development_stage_id") REFERENCES "public"."development_stage"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "development_stage" ("name", "color", "sort_order") VALUES
  ('Inicio', 'blue', 1),
  ('Desarrollo', 'violet', 2),
  ('Pruebas QA', 'amber', 3),
  ('Finalizado', 'green', 4)
ON CONFLICT ("name") DO NOTHING;

CREATE TABLE "app_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_user_role" (
	"company_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_user_role_company_id_user_id_pk" PRIMARY KEY("company_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "role_module_permission" (
	"role_id" uuid NOT NULL,
	"module_key" text NOT NULL,
	"can_access" boolean DEFAULT false NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_module_permission_role_id_module_key_pk" PRIMARY KEY("role_id","module_key")
);
--> statement-breakpoint
ALTER TABLE "app_role" ADD CONSTRAINT "app_role_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_role" ADD CONSTRAINT "app_role_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_user_role" ADD CONSTRAINT "company_user_role_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_user_role" ADD CONSTRAINT "company_user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_user_role" ADD CONSTRAINT "company_user_role_role_id_app_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."app_role"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_user_role" ADD CONSTRAINT "company_user_role_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_module_permission" ADD CONSTRAINT "role_module_permission_role_id_app_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."app_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_module_permission" ADD CONSTRAINT "role_module_permission_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_role_company_key_uidx" ON "app_role" USING btree ("company_id","key");--> statement-breakpoint
CREATE INDEX "app_role_company_idx" ON "app_role" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_user_role_role_idx" ON "company_user_role" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_module_permission_module_idx" ON "role_module_permission" USING btree ("module_key");
--> statement-breakpoint
INSERT INTO "app_role" ("company_id", "key", "name", "description", "is_system", "is_active", "created_by")
SELECT "id", 'admin', 'Administrador', 'Acceso completo a los módulos de la empresa.', true, true, "created_by"
FROM "company"
ON CONFLICT ("company_id", "key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_module_permission" ("role_id", "module_key", "can_access", "updated_by")
SELECT roles."id", modules."module_key", true, roles."created_by"
FROM "app_role" roles
CROSS JOIN (VALUES
  ('home'), ('projects'), ('projects.information'), ('projects.activities'),
  ('projects.development'), ('projects.configuration'), ('projects.documentation'),
  ('projects.qa'), ('projects.schedule'), ('projects.benchwork'), ('activities'),
  ('companies'), ('users'), ('roles'), ('settings'), ('audit'), ('calendar'),
  ('calendar.centralized')
) AS modules("module_key")
WHERE roles."key" = 'admin'
ON CONFLICT ("role_id", "module_key") DO NOTHING;

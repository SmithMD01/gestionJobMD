ALTER TABLE "development_stage" DROP CONSTRAINT IF EXISTS "development_stage_name_unique";--> statement-breakpoint
ALTER TABLE "development_stage" DROP CONSTRAINT IF EXISTS "development_stage_name_key";--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "development_stage" ADD COLUMN IF NOT EXISTS "company_id" uuid;--> statement-breakpoint
ALTER TABLE "development_stage" ADD COLUMN IF NOT EXISTS "is_terminal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "development_stage" ADD COLUMN IF NOT EXISTS "is_cancelled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'development_stage_company_id_company_id_fk') THEN
    ALTER TABLE "development_stage" ADD CONSTRAINT "development_stage_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "company"("id");
  END IF;
END $$;--> statement-breakpoint
CREATE TEMP TABLE "development_stage_company_map" ("source_id" uuid NOT NULL, "company_id" uuid NOT NULL, "target_id" uuid NOT NULL, PRIMARY KEY ("source_id", "company_id"));--> statement-breakpoint
INSERT INTO "development_stage_company_map" ("source_id", "company_id", "target_id")
SELECT stage."id", company."id", gen_random_uuid()
FROM "development_stage" AS stage CROSS JOIN "company" AS company
WHERE stage."company_id" IS NULL;--> statement-breakpoint
INSERT INTO "development_stage" ("id", "company_id", "name", "color", "sort_order", "is_active", "is_terminal", "is_cancelled", "created_at", "updated_at")
SELECT map."target_id", map."company_id", source."name", source."color", source."sort_order", source."is_active",
  COALESCE(source."id" = (SELECT candidate."id" FROM "development_stage" AS candidate WHERE candidate."company_id" IS NULL AND lower(candidate."name") IN ('finalizado', 'finalizada', 'completado', 'completada', 'terminado', 'terminada') ORDER BY candidate."sort_order" DESC, candidate."id" LIMIT 1), false),
  COALESCE(source."id" = (SELECT candidate."id" FROM "development_stage" AS candidate WHERE candidate."company_id" IS NULL AND (lower(candidate."name") LIKE '%cancel%' OR lower(candidate."name") LIKE '%descart%') ORDER BY candidate."sort_order" DESC, candidate."id" LIMIT 1), false),
  source."created_at", now()
FROM "development_stage_company_map" AS map INNER JOIN "development_stage" AS source ON source."id" = map."source_id";--> statement-breakpoint
UPDATE "activity" AS activity SET "development_stage_id" = map."target_id",
  "status" = CASE WHEN target."is_cancelled" THEN 'cancelled'::"activity_status" WHEN target."is_terminal" THEN 'completed'::"activity_status" ELSE activity."status" END,
  "completed_at" = CASE WHEN target."is_terminal" THEN activity."updated_at" ELSE NULL END
FROM "project" AS project, "development_stage_company_map" AS map, "development_stage" AS target
WHERE activity."project_id" = project."id" AND activity."type" = 'development'::"activity_type"
  AND activity."development_stage_id" = map."source_id" AND project."company_id" = map."company_id" AND map."target_id" = target."id";--> statement-breakpoint
INSERT INTO "development_stage" ("company_id", "name", "color", "sort_order", "is_active", "is_terminal", "is_cancelled")
SELECT company."id", 'Canceladas', 'neutral', COALESCE(MAX(stage."sort_order"), 0) + 1, true, false, true
FROM "company" AS company LEFT JOIN "development_stage" AS stage ON stage."company_id" = company."id"
GROUP BY company."id"
HAVING NOT EXISTS (SELECT 1 FROM "development_stage" AS current WHERE current."company_id" = company."id" AND current."is_cancelled" = true);--> statement-breakpoint
DROP TABLE "development_stage_company_map";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "development_stage_company_name_uidx" ON "development_stage" USING btree ("company_id", "name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "development_stage_company_terminal_uidx" ON "development_stage" USING btree ("company_id") WHERE "is_terminal" = true;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "development_stage_company_cancelled_uidx" ON "development_stage" USING btree ("company_id") WHERE "is_cancelled" = true;--> statement-breakpoint
INSERT INTO "role_module_permission" ("role_id", "module_key", "can_access", "updated_by")
SELECT "id", 'settings.pipeline', true, "created_by" FROM "app_role" WHERE "key" = 'admin'
ON CONFLICT ("role_id", "module_key") DO NOTHING;

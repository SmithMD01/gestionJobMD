ALTER TABLE "company_member" ADD COLUMN "visible_in_activity_assignments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "company_team_member" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "company_team_member" ADD CONSTRAINT "company_team_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_team_member_company_user_uidx" ON "company_team_member" USING btree ("company_id","user_id");
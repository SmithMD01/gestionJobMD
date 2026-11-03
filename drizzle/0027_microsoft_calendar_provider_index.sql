DROP INDEX "calendar_account_user_email_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_account_user_provider_email_uidx" ON "calendar_account" USING btree ("user_id","provider","email");
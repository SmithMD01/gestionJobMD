ALTER TABLE "project_document" ADD COLUMN "upload_key" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "project_document_version_uidx" ON "project_document" USING btree ("project_id","group_id","type_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "project_document_upload_key_uidx" ON "project_document" USING btree ("project_id","upload_key");
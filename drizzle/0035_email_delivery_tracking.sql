CREATE TABLE "email_delivery_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" text,
	"recipient_email" text NOT NULL,
	"email_type" text NOT NULL,
	"provider" text NOT NULL,
	"status" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_delivery_log" ADD CONSTRAINT "email_delivery_log_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_delivery_log_recipient_created_idx" ON "email_delivery_log" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "email_delivery_log_status_created_idx" ON "email_delivery_log" USING btree ("status","created_at");
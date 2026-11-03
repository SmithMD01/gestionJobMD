ALTER TABLE "calendar_account" ADD COLUMN "refresh_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "calendar_account" ADD COLUMN "token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar_account" ADD COLUMN "granted_scopes" text;--> statement-breakpoint
ALTER TABLE "calendar_account" ADD COLUMN "connected_at" timestamp with time zone;
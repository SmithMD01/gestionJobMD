CREATE TABLE "security_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"subject_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

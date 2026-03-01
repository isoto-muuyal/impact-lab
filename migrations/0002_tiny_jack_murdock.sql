CREATE TYPE "public"."activity_type" AS ENUM('page_view', 'button_click');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"activity_type" "activity_type" NOT NULL,
	"path" varchar NOT NULL,
	"button_id" varchar,
	"button_label" varchar,
	"ip_address" varchar,
	"country" varchar,
	"region" varchar,
	"city" varchar,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
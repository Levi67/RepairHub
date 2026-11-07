CREATE TYPE "public"."request_timeframe" AS ENUM('flexible', 'within_week', 'urgent');--> statement-breakpoint
CREATE TABLE "request_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "request_image_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
ALTER TABLE "repair_request" ADD COLUMN "timeframe" "request_timeframe";--> statement-breakpoint
ALTER TABLE "request_image" ADD CONSTRAINT "request_image_request_id_repair_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."repair_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "request_image_request_idx" ON "request_image" USING btree ("request_id","sort_order");
CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"customer_id" text NOT NULL,
	"repairer_id" text NOT NULL,
	"customer_last_read_at" timestamp with time zone,
	"repairer_last_read_at" timestamp with time zone,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"body" text NOT NULL,
	"flagged_contact_info" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_request_id_repair_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."repair_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_customer_id_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_repairer_id_user_id_fk" FOREIGN KEY ("repairer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_request_repairer_idx" ON "conversation" USING btree ("request_id","repairer_id");--> statement-breakpoint
CREATE INDEX "conversation_customer_idx" ON "conversation" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "conversation_repairer_idx" ON "conversation" USING btree ("repairer_id");--> statement-breakpoint
CREATE INDEX "message_conversation_idx" ON "message" USING btree ("conversation_id","created_at");--> statement-breakpoint
-- Backfill: every existing quote gets the conversation it would have started.
INSERT INTO "conversation" ("request_id", "customer_id", "repairer_id")
SELECT DISTINCT q."request_id", r."customer_id", q."repairer_id"
FROM "quote" q
JOIN "repair_request" r ON r."id" = q."request_id"
ON CONFLICT DO NOTHING;

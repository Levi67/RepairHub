CREATE TYPE "public"."order_status" AS ENUM('awaiting_payment', 'paid', 'in_progress', 'repaired', 'completed', 'cancelled', 'disputed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('pending', 'accepted', 'rejected', 'withdrawn', 'expired');--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"customer_id" text NOT NULL,
	"repairer_id" text NOT NULL,
	"price_cents" integer NOT NULL,
	"commission_rate_bp" integer NOT NULL,
	"commission_cents" integer NOT NULL,
	"payout_cents" integer NOT NULL,
	"handover_mode" "handover_mode" NOT NULL,
	"status" "order_status" NOT NULL,
	"outbound_tracking" text,
	"return_tracking" text,
	"paid_at" timestamp with time zone,
	"repaired_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"auto_confirm_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_quote_id_unique" UNIQUE("quote_id"),
	CONSTRAINT "order_price_positive" CHECK ("order"."price_cents" > 0),
	CONSTRAINT "order_money_adds_up" CHECK ("order"."commission_cents" + "order"."payout_cents" = "order"."price_cents")
);
--> statement-breakpoint
CREATE TABLE "order_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"actor_id" text,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"repairer_id" text NOT NULL,
	"price_cents" integer NOT NULL,
	"estimated_days" integer NOT NULL,
	"handover_mode" "handover_mode" NOT NULL,
	"includes_return_shipping" boolean DEFAULT false NOT NULL,
	"message" text NOT NULL,
	"parts_note" text,
	"status" "quote_status" DEFAULT 'pending' NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_price_positive" CHECK ("quote"."price_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_request_id_repair_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."repair_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_customer_id_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_repairer_id_user_id_fk" FOREIGN KEY ("repairer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_request_id_repair_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."repair_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_repairer_id_user_id_fk" FOREIGN KEY ("repairer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_customer_idx" ON "order" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "order_repairer_idx" ON "order" USING btree ("repairer_id");--> statement-breakpoint
CREATE INDEX "order_event_order_idx" ON "order_event" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_one_pending_idx" ON "quote" USING btree ("request_id","repairer_id") WHERE "quote"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "quote_repairer_idx" ON "quote" USING btree ("repairer_id");
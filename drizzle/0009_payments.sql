ALTER TABLE "order" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "stripe_transfer_id" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "stripe_refund_id" text;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id");
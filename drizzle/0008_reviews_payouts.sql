CREATE TYPE "public"."review_direction" AS ENUM('customer_to_repairer', 'repairer_to_customer');--> statement-breakpoint
CREATE TYPE "public"."stripe_account_status" AS ENUM('none', 'pending', 'active', 'restricted');--> statement-breakpoint
CREATE TABLE "repairer_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"stripe_account_id" text,
	"stripe_status" "stripe_account_status" DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repairer_profile_stripe_account_id_unique" UNIQUE("stripe_account_id")
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"direction" "review_direction" NOT NULL,
	"rating" integer NOT NULL,
	"text" text,
	"published_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_rating_range" CHECK ("review"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "stripe_event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repairer_profile" ADD CONSTRAINT "repairer_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_subject_id_user_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "review_order_direction_idx" ON "review" USING btree ("order_id","direction");--> statement-breakpoint
CREATE INDEX "review_subject_idx" ON "review" USING btree ("subject_id","direction");
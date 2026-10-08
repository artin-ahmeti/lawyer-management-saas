CREATE TABLE "matter_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "matter_access_role" CHECK ("matter_access"."role" in ('reader','manager')),
	CONSTRAINT "matter_access_revision" CHECK ("matter_access"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "matters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"title" text NOT NULL,
	"reference" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "matters_title" CHECK (length(btrim("matters"."title")) between 1 and 200 and "matters"."title" = btrim("matters"."title")),
	CONSTRAINT "matters_reference" CHECK ("matters"."reference" is null or (length("matters"."reference") between 1 and 80 and "matters"."reference"=btrim("matters"."reference"))),
	CONSTRAINT "matters_revision" CHECK ("matters"."revision" >= 1)
);
--> statement-breakpoint
-- Create the referenced composite key before adding the matter-access foreign key.
CREATE UNIQUE INDEX "matters_firm_id_uq" ON "matters" USING btree ("firm_id","id");--> statement-breakpoint
ALTER TABLE "matter_access" ADD CONSTRAINT "matter_access_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_access" ADD CONSTRAINT "matter_access_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_access" ADD CONSTRAINT "matter_access_matter_fk" FOREIGN KEY ("firm_id","matter_id") REFERENCES "public"."matters"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_access" ADD CONSTRAINT "matter_access_member_fk" FOREIGN KEY ("firm_id","user_id") REFERENCES "public"."firm_members"("firm_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "matter_access_grant_uq" ON "matter_access" USING btree ("firm_id","matter_id","user_id");--> statement-breakpoint
CREATE INDEX "matter_access_user_cursor_idx" ON "matter_access" USING btree ("firm_id","user_id","matter_id") WHERE "matter_access"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "matters_firm_cursor_idx" ON "matters" USING btree ("firm_id","id");

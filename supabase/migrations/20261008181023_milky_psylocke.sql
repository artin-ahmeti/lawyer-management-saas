CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"phone" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "contacts_kind" CHECK ("contacts"."kind" in ('person','organization')),
	CONSTRAINT "contacts_display_name" CHECK (length("contacts"."display_name") between 1 and 200 and "contacts"."display_name" = btrim("contacts"."display_name")),
	CONSTRAINT "contacts_email" CHECK ("contacts"."email" is null or (length("contacts"."email") between 3 and 320 and "contacts"."email" = btrim("contacts"."email"))),
	CONSTRAINT "contacts_phone" CHECK ("contacts"."phone" is null or (length("contacts"."phone") between 3 and 40 and "contacts"."phone" = btrim("contacts"."phone"))),
	CONSTRAINT "contacts_revision" CHECK ("contacts"."revision" >= 1)
);
--> statement-breakpoint
-- Create the referenced composite key before adding the matter-party foreign key.
CREATE UNIQUE INDEX "contacts_firm_id_uq" ON "contacts" USING btree ("firm_id","id");--> statement-breakpoint
CREATE TABLE "matter_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"role" text NOT NULL,
	"label" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "matter_parties_role" CHECK ("matter_parties"."role" in ('client','adverse_party','other')),
	CONSTRAINT "matter_parties_label" CHECK (("matter_parties"."label" is null and "matter_parties"."role" <> 'other') or ("matter_parties"."label" is not null and length("matter_parties"."label") between 1 and 80 and "matter_parties"."label" = btrim("matter_parties"."label")))
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_parties" ADD CONSTRAINT "matter_parties_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_parties" ADD CONSTRAINT "matter_parties_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_parties" ADD CONSTRAINT "matter_parties_matter_fk" FOREIGN KEY ("firm_id","matter_id") REFERENCES "public"."matters"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_parties" ADD CONSTRAINT "matter_parties_contact_fk" FOREIGN KEY ("firm_id","contact_id") REFERENCES "public"."contacts"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_directory_idx" ON "contacts" USING btree ("firm_id",lower("display_name"),"id") WHERE "contacts"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "matter_parties_current_uq" ON "matter_parties" USING btree ("firm_id","matter_id","contact_id") WHERE "matter_parties"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "matter_parties_matter_idx" ON "matter_parties" USING btree ("firm_id","matter_id","id");--> statement-breakpoint
CREATE INDEX "matter_parties_contact_idx" ON "matter_parties" USING btree ("firm_id","contact_id","id");
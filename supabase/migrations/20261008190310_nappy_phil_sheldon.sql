-- Fail fast rather than queue matter reads behind this upgrade's lock on a busy table.
set local lock_timeout = '5s';--> statement-breakpoint
CREATE TABLE "practice_profile_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"fields" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "practice_profile_versions_version" CHECK ("practice_profile_versions"."version" >= 1),
	CONSTRAINT "practice_profile_versions_fields" CHECK (jsonb_typeof("practice_profile_versions"."fields") = 'array' and jsonb_array_length("practice_profile_versions"."fields") <= 50
        and octet_length("practice_profile_versions"."fields"::text) <= 1000000),
	CONSTRAINT "practice_profile_versions_not_deleted" CHECK ("practice_profile_versions"."deleted_at" is null)
);
--> statement-breakpoint
CREATE TABLE "practice_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"based_on_key" text,
	"based_on_version" integer,
	"current_version" integer DEFAULT 1 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "practice_profiles_name" CHECK (length("practice_profiles"."name") between 1 and 80 and "practice_profiles"."name" = btrim("practice_profiles"."name")),
	CONSTRAINT "practice_profiles_description" CHECK ("practice_profiles"."description" is null or (length("practice_profiles"."description") between 1 and 300 and "practice_profiles"."description" = btrim("practice_profiles"."description"))),
	CONSTRAINT "practice_profiles_based_on" CHECK (("practice_profiles"."based_on_key" is null) = ("practice_profiles"."based_on_version" is null) and ("practice_profiles"."based_on_version" is null or "practice_profiles"."based_on_version" >= 1)),
	CONSTRAINT "practice_profiles_current_version" CHECK ("practice_profiles"."current_version" >= 1),
	CONSTRAINT "practice_profiles_revision" CHECK ("practice_profiles"."revision" >= 1),
	CONSTRAINT "practice_profiles_not_deleted" CHECK ("practice_profiles"."deleted_at" is null)
);
--> statement-breakpoint
-- Create the referenced composite key before adding the version foreign key.
CREATE UNIQUE INDEX "practice_profiles_firm_id_uq" ON "practice_profiles" USING btree ("firm_id","id");--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "profile_version_id" uuid;--> statement-breakpoint
ALTER TABLE "matters" ADD COLUMN "field_values" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_profile_versions" ADD CONSTRAINT "practice_profile_versions_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_profile_versions" ADD CONSTRAINT "practice_profile_versions_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_profile_versions" ADD CONSTRAINT "practice_profile_versions_profile_fk" FOREIGN KEY ("firm_id","profile_id") REFERENCES "public"."practice_profiles"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_profiles" ADD CONSTRAINT "practice_profiles_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_profiles" ADD CONSTRAINT "practice_profiles_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "practice_profile_versions_firm_id_uq" ON "practice_profile_versions" USING btree ("firm_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_profile_versions_number_uq" ON "practice_profile_versions" USING btree ("firm_id","profile_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_profiles_active_name_uq" ON "practice_profiles" USING btree ("firm_id",lower("name")) WHERE "practice_profiles"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "practice_profiles_list_idx" ON "practice_profiles" USING btree ("firm_id",lower("name"),"id");--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_profile_version_fk" FOREIGN KEY ("firm_id","profile_version_id") REFERENCES "public"."practice_profile_versions"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matters_profile_version_idx" ON "matters" USING btree ("firm_id","profile_version_id") WHERE "matters"."profile_version_id" is not null;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_field_values" CHECK ("matters"."profile_version_id" is not null or "matters"."field_values" = '{}'::jsonb);
-- Fail fast rather than queue firm, profile and matter writes behind the new foreign keys.
set local lock_timeout = '5s';--> statement-breakpoint
CREATE TABLE "forums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "forums_kind" CHECK ("forums"."kind" in ('court','agency','tribunal','other')),
	CONSTRAINT "forums_jurisdiction" CHECK ("forums"."jurisdiction" in ('AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','AS','GU','MP','PR','VI','US')),
	CONSTRAINT "forums_name" CHECK (length("forums"."name") between 1 and 200 and "forums"."name" = btrim("forums"."name")),
	CONSTRAINT "forums_revision" CHECK ("forums"."revision" >= 1),
	CONSTRAINT "forums_not_deleted" CHECK ("forums"."deleted_at" is null)
);
--> statement-breakpoint
-- Create the referenced composite key before adding the reference foreign key.
CREATE UNIQUE INDEX "forums_firm_id_jurisdiction_uq" ON "forums" USING btree ("firm_id","id","jurisdiction");--> statement-breakpoint
CREATE TABLE "matter_jurisdictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"matter_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"forum_id" uuid,
	"docket_number" text,
	"label" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "matter_jurisdictions_purpose" CHECK ("matter_jurisdictions"."purpose" in ('governing_law','venue','agency','other')),
	CONSTRAINT "matter_jurisdictions_jurisdiction" CHECK ("matter_jurisdictions"."jurisdiction" in ('AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','AS','GU','MP','PR','VI','US')),
	CONSTRAINT "matter_jurisdictions_governing_law" CHECK ("matter_jurisdictions"."purpose" <> 'governing_law' or ("matter_jurisdictions"."forum_id" is null and "matter_jurisdictions"."docket_number" is null)),
	CONSTRAINT "matter_jurisdictions_label" CHECK (("matter_jurisdictions"."purpose" = 'other') = ("matter_jurisdictions"."label" is not null) and ("matter_jurisdictions"."label" is null or (length("matter_jurisdictions"."label") between 1 and 80 and "matter_jurisdictions"."label" = btrim("matter_jurisdictions"."label")))),
	CONSTRAINT "matter_jurisdictions_docket" CHECK ("matter_jurisdictions"."docket_number" is null or (length("matter_jurisdictions"."docket_number") between 1 and 100 and "matter_jurisdictions"."docket_number" = btrim("matter_jurisdictions"."docket_number")))
);
--> statement-breakpoint
ALTER TABLE "forums" ADD CONSTRAINT "forums_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forums" ADD CONSTRAINT "forums_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_jurisdictions" ADD CONSTRAINT "matter_jurisdictions_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_jurisdictions" ADD CONSTRAINT "matter_jurisdictions_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_jurisdictions" ADD CONSTRAINT "matter_jurisdictions_matter_fk" FOREIGN KEY ("firm_id","matter_id") REFERENCES "public"."matters"("firm_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_jurisdictions" ADD CONSTRAINT "matter_jurisdictions_forum_fk" FOREIGN KEY ("firm_id","forum_id","jurisdiction") REFERENCES "public"."forums"("firm_id","id","jurisdiction") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "forums_active_name_uq" ON "forums" USING btree ("firm_id","jurisdiction",lower("name")) WHERE "forums"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "forums_list_idx" ON "forums" USING btree ("firm_id",lower("name"),"id");--> statement-breakpoint
CREATE UNIQUE INDEX "matter_jurisdictions_current_uq" ON "matter_jurisdictions" USING btree ("firm_id","matter_id","purpose","jurisdiction",coalesce("forum_id",'00000000-0000-0000-0000-000000000000'::uuid),coalesce("docket_number",''),coalesce("label",'')) WHERE "matter_jurisdictions"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "matter_jurisdictions_matter_idx" ON "matter_jurisdictions" USING btree ("firm_id","matter_id","created_at","id");
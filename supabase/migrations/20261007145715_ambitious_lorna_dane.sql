CREATE TABLE "staff_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "firm_role" NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by" uuid,
	"accepted_at" timestamp with time zone,
	"revoked_by" uuid,
	"revoked_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "staff_invitations_role" CHECK ("staff_invitations"."role" <> 'owner'),
	CONSTRAINT "staff_invitations_email" CHECK ("staff_invitations"."email" = lower(btrim("staff_invitations"."email")) and length("staff_invitations"."email") between 3 and 254),
	CONSTRAINT "staff_invitations_status" CHECK ("staff_invitations"."status" in ('pending','accepted','revoked')),
	CONSTRAINT "staff_invitations_revision" CHECK ("staff_invitations"."revision" >= 1),
	CONSTRAINT "staff_invitations_completion" CHECK (case when "staff_invitations"."status" = 'accepted' then "staff_invitations"."accepted_by" is not null and "staff_invitations"."accepted_at" is not null and "staff_invitations"."revoked_by" is null and "staff_invitations"."revoked_at" is null when "staff_invitations"."status" = 'revoked' then "staff_invitations"."revoked_by" is not null and "staff_invitations"."revoked_at" is not null and "staff_invitations"."accepted_by" is null and "staff_invitations"."accepted_at" is null else "staff_invitations"."accepted_by" is null and "staff_invitations"."accepted_at" is null and "staff_invitations"."revoked_by" is null and "staff_invitations"."revoked_at" is null end)
);
--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_revoked_by_profiles_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_accepted_member_fk" FOREIGN KEY ("firm_id","accepted_by") REFERENCES "public"."firm_members"("firm_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_invitations_pending_email_uq" ON "staff_invitations" USING btree ("firm_id","email") WHERE "staff_invitations"."status" = 'pending' and "staff_invitations"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "staff_invitations_firm_cursor_idx" ON "staff_invitations" USING btree ("firm_id","created_at","id");--> statement-breakpoint
CREATE INDEX "staff_invitations_received_idx" ON "staff_invitations" USING btree ("email","created_at","id") WHERE "staff_invitations"."status" = 'pending' and "staff_invitations"."deleted_at" is null;
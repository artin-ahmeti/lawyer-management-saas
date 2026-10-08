CREATE TABLE "staff_session_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"firm_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "staff_session_contexts_revision" CHECK ("staff_session_contexts"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "staff_session_contexts" ADD CONSTRAINT "staff_session_contexts_member_fk" FOREIGN KEY ("firm_id","created_by") REFERENCES "public"."firm_members"("firm_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_session_contexts_session_uq" ON "staff_session_contexts" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "command_receipts_context_select_intent_uq" ON "command_receipts" USING btree ("created_by","idempotency_key") WHERE "command_receipts"."command" = 'staff.context.select.v1';
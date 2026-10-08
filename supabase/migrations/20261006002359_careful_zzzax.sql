CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"action" text NOT NULL,
	"record_type" text NOT NULL,
	"record_id" uuid NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "command_receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"firm_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"command" text NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"input_hash" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"command_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "outbox_events_attempts_nonnegative" CHECK ("outbox_events"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "firms" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "command_receipts" ADD CONSTRAINT "command_receipts_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_firm_created_idx" ON "audit_logs" USING btree ("firm_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "command_receipts_intent_uq" ON "command_receipts" USING btree ("firm_id","created_by","command","idempotency_key");--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("available_at") WHERE "outbox_events"."dispatched_at" is null;
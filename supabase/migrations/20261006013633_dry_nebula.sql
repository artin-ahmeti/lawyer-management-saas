CREATE TABLE "job_executions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"outbox_event_id" uuid NOT NULL,
	"firm_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_error_code" text,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "job_executions_status" CHECK ("job_executions"."status" in ('pending', 'retry', 'running', 'succeeded', 'blocked', 'failed')),
	CONSTRAINT "job_executions_attempts" CHECK ("job_executions"."attempts" between 0 and 5),
	CONSTRAINT "job_executions_lease" CHECK (("job_executions"."status" = 'running') = ("job_executions"."lease_token" is not null and "job_executions"."lease_until" is not null))
);
--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "dispatch_lease_token" uuid;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "dispatch_lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "last_error_code" text;--> statement-breakpoint
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_outbox_event_id_outbox_events_id_fk" FOREIGN KEY ("outbox_event_id") REFERENCES "public"."outbox_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_executions_event_uq" ON "job_executions" USING btree ("outbox_event_id");--> statement-breakpoint
CREATE INDEX "job_executions_recovery_idx" ON "job_executions" USING btree ("available_at") WHERE "job_executions"."status" in ('pending', 'retry', 'running');
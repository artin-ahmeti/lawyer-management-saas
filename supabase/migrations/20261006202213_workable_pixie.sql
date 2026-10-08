CREATE TABLE "execution_recoveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"firm_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"source_job_id" uuid NOT NULL,
	"source_created_by" uuid NOT NULL,
	"replacement_event_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"reviewed_revision" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "execution_recoveries_revision" CHECK ("execution_recoveries"."reviewed_revision" >= 1),
	CONSTRAINT "execution_recoveries_reason" CHECK (length(btrim("execution_recoveries"."reason")) between 1 and 500)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_events_identity_uq" ON "outbox_events" USING btree ("id","firm_id","created_by");--> statement-breakpoint
ALTER TABLE "execution_recoveries" ADD CONSTRAINT "execution_recoveries_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_recoveries" ADD CONSTRAINT "execution_recoveries_source_fk" FOREIGN KEY ("source_job_id","firm_id","source_created_by") REFERENCES "public"."job_executions"("id","firm_id","created_by") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_recoveries" ADD CONSTRAINT "execution_recoveries_replacement_fk" FOREIGN KEY ("replacement_event_id","firm_id","created_by") REFERENCES "public"."outbox_events"("id","firm_id","created_by") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "execution_recoveries_source_uq" ON "execution_recoveries" USING btree ("source_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "execution_recoveries_replacement_uq" ON "execution_recoveries" USING btree ("replacement_event_id");--> statement-breakpoint


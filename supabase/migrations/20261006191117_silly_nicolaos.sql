-- Referenced identity index must precede the composite FK (Drizzle 0.31.10 emits it last).
CREATE TABLE "job_execution_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"firm_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"lease_token" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "job_execution_attempts_number" CHECK ("job_execution_attempts"."attempt_number" between 1 and 5),
	CONSTRAINT "job_execution_attempts_status" CHECK ("job_execution_attempts"."status" in ('running', 'retry', 'succeeded', 'blocked', 'failed', 'interrupted')),
	CONSTRAINT "job_execution_attempts_completion" CHECK (("job_execution_attempts"."status" = 'running') = ("job_execution_attempts"."finished_at" is null)),
	CONSTRAINT "job_execution_attempts_dates" CHECK ("job_execution_attempts"."lease_until" > "job_execution_attempts"."started_at" and ("job_execution_attempts"."finished_at" is null or "job_execution_attempts"."finished_at" >= "job_execution_attempts"."started_at")),
	CONSTRAINT "job_execution_attempts_error" CHECK (case
      when "job_execution_attempts"."status" in ('running', 'succeeded') then "job_execution_attempts"."error_code" is null
      when "job_execution_attempts"."status" = 'interrupted' then "job_execution_attempts"."error_code" is not null and "job_execution_attempts"."error_code" = 'LEASE_EXPIRED'
      when "job_execution_attempts"."status" in ('retry', 'failed') then "job_execution_attempts"."error_code" is not null and "job_execution_attempts"."error_code" = 'PROCESSING_FAILED'
      else "job_execution_attempts"."error_code" is not null and "job_execution_attempts"."error_code" in ('ACCESS_REVOKED', 'SOURCE_CHANGED', 'SOURCE_UNAVAILABLE', 'INVALID_EVENT', 'UNSUPPORTED_EVENT') end)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "job_executions_identity_uq" ON "job_executions" USING btree ("id","firm_id","created_by");
--> statement-breakpoint
ALTER TABLE "job_execution_attempts" ADD CONSTRAINT "job_execution_attempts_identity_fk" FOREIGN KEY ("job_id","firm_id","created_by") REFERENCES "public"."job_executions"("id","firm_id","created_by") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_execution_attempts_number_uq" ON "job_execution_attempts" USING btree ("job_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "job_execution_attempts_lease_uq" ON "job_execution_attempts" USING btree ("lease_token");--> statement-breakpoint

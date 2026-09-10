CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"domain_id" text NOT NULL,
	"local_part" text NOT NULL,
	"display_name" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addresses_domain_local_part_unique" UNIQUE("domain_id","local_part"),
	CONSTRAINT "addresses_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"blob_key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"disposition" text NOT NULL,
	"content_id" text,
	"sha256" text,
	"source_provider" text,
	"source_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_blob_key_unique" UNIQUE("blob_key"),
	CONSTRAINT "attachments_disposition_check" CHECK ("attachments"."disposition" IN ('attachment', 'inline'))
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "audit_logs_actor_check" CHECK ("audit_logs"."actor" IN ('user', 'system'))
);
--> statement-breakpoint
CREATE TABLE "domain_provider_bindings" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domain_provider_bindings_domain_provider_unique" UNIQUE("domain_id","provider"),
	CONSTRAINT "domain_provider_bindings_provider_external_id_unique" UNIQUE("provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domains_name_unique" UNIQUE("name"),
	CONSTRAINT "domains_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "domains_status_check" CHECK ("domains"."status" IN ('pending', 'verified', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "message_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"role" text NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"local_address_id" text,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_addresses_role_check" CHECK ("message_addresses"."role" IN ('to', 'cc', 'bcc', 'reply_to'))
);
--> statement-breakpoint
CREATE TABLE "message_provider_refs" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"provider" text NOT NULL,
	"direction" text NOT NULL,
	"external_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_provider_refs_provider_direction_external_id_unique" UNIQUE("provider","direction","external_id"),
	CONSTRAINT "message_provider_refs_direction_check" CHECK ("message_provider_refs"."direction" IN ('inbound', 'outbound'))
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"thread_id" text,
	"parent_message_id" text,
	"sending_address_id" text,
	"is_inbound" boolean DEFAULT false NOT NULL,
	"outbound_status" text,
	"from_name" text,
	"from_email" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"text_body" text,
	"html_raw" text,
	"html_sanitized" text,
	"snippet" text DEFAULT '' NOT NULL,
	"internet_message_id" text,
	"in_reply_to" text,
	"references" text[] DEFAULT '{}'::text[] NOT NULL,
	"raw_blob_key" text,
	"search_text" text DEFAULT '' NOT NULL,
	"read_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"trashed_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"last_send_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "messages_outbound_status_check" CHECK ("messages"."outbound_status" IS NULL OR "messages"."outbound_status" IN ('draft', 'sending', 'sent', 'failed')),
	CONSTRAINT "messages_inbound_or_outbound_status_check" CHECK ("messages"."is_inbound" OR "messages"."outbound_status" IS NOT NULL),
	CONSTRAINT "messages_inbound_received_at_check" CHECK (NOT "messages"."is_inbound" OR "messages"."received_at" IS NOT NULL),
	CONSTRAINT "messages_inbound_thread_check" CHECK (NOT "messages"."is_inbound" OR "messages"."thread_id" IS NOT NULL),
	CONSTRAINT "messages_sent_sent_at_check" CHECK ("messages"."outbound_status" IS DISTINCT FROM 'sent' OR "messages"."sent_at" IS NOT NULL),
	CONSTRAINT "messages_completed_thread_check" CHECK ("messages"."outbound_status" IS DISTINCT FROM 'sent' OR "messages"."thread_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"last_message_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "threads_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"external_message_id" text,
	"message_id" text,
	"status" text NOT NULL,
	"error" text,
	"event_created_at" timestamp with time zone,
	"received_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "webhook_events_provider_event_id_unique" UNIQUE("provider","event_id"),
	CONSTRAINT "webhook_events_status_check" CHECK ("webhook_events"."status" IN ('processing', 'processed', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_domain_user_id_domains_id_user_id_fk" FOREIGN KEY ("domain_id","user_id") REFERENCES "public"."domains"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_provider_bindings" ADD CONSTRAINT "domain_provider_bindings_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_addresses" ADD CONSTRAINT "message_addresses_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_addresses" ADD CONSTRAINT "message_addresses_local_address_id_addresses_id_fk" FOREIGN KEY ("local_address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_provider_refs" ADD CONSTRAINT "message_provider_refs_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_user_id_threads_id_user_id_fk" FOREIGN KEY ("thread_id","user_id") REFERENCES "public"."threads"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_user_id_messages_id_user_id_fk" FOREIGN KEY ("parent_message_id","user_id") REFERENCES "public"."messages"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sending_address_user_id_addresses_id_user_id_fk" FOREIGN KEY ("sending_address_id","user_id") REFERENCES "public"."addresses"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attachments_provider_source_unique" ON "attachments" USING btree ("source_provider","source_id") WHERE "attachments"."source_provider" IS NOT NULL AND "attachments"."source_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "domains_user_id_idx" ON "domains" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "message_addresses_message_role_position_idx" ON "message_addresses" USING btree ("message_id","role","position");--> statement-breakpoint
CREATE INDEX "messages_user_id_idx" ON "messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_thread_id_idx" ON "messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "messages_user_id_internet_message_id_idx" ON "messages" USING btree ("user_id","internet_message_id");--> statement-breakpoint
CREATE INDEX "messages_thread_id_created_at_idx" ON "messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_inbox_idx" ON "messages" USING btree ("user_id","received_at" DESC NULLS LAST) WHERE "messages"."is_inbound" AND "messages"."archived_at" IS NULL AND "messages"."trashed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "messages_sent_idx" ON "messages" USING btree ("user_id","sent_at" DESC NULLS LAST) WHERE "messages"."outbound_status" = 'sent' AND "messages"."trashed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "messages_drafts_idx" ON "messages" USING btree ("user_id","updated_at" DESC NULLS LAST) WHERE "messages"."outbound_status" IN ('draft', 'failed') AND "messages"."trashed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "messages_trash_idx" ON "messages" USING btree ("user_id","trashed_at" DESC NULLS LAST) WHERE "messages"."trashed_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "messages_search_text_idx" ON "messages" USING gin (to_tsvector('simple', "search_text"));--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "threads_user_id_last_message_at_idx" ON "threads" USING btree ("user_id","last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");
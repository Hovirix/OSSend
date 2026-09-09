CREATE TABLE "message_recipients" (
	"message_id" text NOT NULL,
	"type" text NOT NULL,
	"address" text NOT NULL,
	CONSTRAINT "message_recipients_message_id_type_address_pk" PRIMARY KEY("message_id","type","address")
);
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "to_address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes" ADD COLUMN "user_id" text;--> statement-breakpoint
UPDATE "mailboxes" AS mailbox SET "user_id" = member."user_id" FROM "workspace_members" AS member WHERE member."workspace_id" = mailbox."workspace_id" AND member."role" = 'owner';--> statement-breakpoint
ALTER TABLE "mailboxes" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "mailbox_id" text;--> statement-breakpoint
UPDATE "messages" AS message SET "mailbox_id" = thread."mailbox_id" FROM "threads" AS thread WHERE thread."id" = message."thread_id";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "mailbox_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "message_id" text;--> statement-breakpoint
UPDATE "messages" SET "message_id" = '<' || "id" || '@legacy.ossend.local>';--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "message_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "in_reply_to" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "references" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "provider_message_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_recipients_address_idx" ON "message_recipients" USING btree ("address");--> statement-breakpoint
ALTER TABLE "mailboxes" ADD CONSTRAINT "mailboxes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_mailbox_id_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mailboxes_user_id_idx" ON "mailboxes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_mailbox_sent_at_idx" ON "messages" USING btree ("mailbox_id","sent_at");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_message_id_unique" UNIQUE("message_id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_provider_message_id_unique" UNIQUE("provider_message_id");

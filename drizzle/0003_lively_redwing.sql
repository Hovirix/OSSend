DROP INDEX "mailboxes_workspace_address_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "mailboxes_address_unique" ON "mailboxes" USING btree ("address");
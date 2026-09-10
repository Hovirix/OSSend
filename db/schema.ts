import { relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	foreignKey,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
	AttachmentDisposition,
	AuditAction,
	AuditActor,
	DomainStatus,
	MailProvider,
	MessageAddressRole,
	OutboundStatus,
	ProviderMessageDirection,
	WebhookStatus,
} from "./states";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });
const timestamps = {
	createdAt: timestamptz("created_at").defaultNow().notNull(),
	updatedAt: timestamptz("updated_at").defaultNow().notNull(),
};

export const users = pgTable("users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	...timestamps,
});

export const sessions = pgTable(
	"sessions",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamptz("expires_at").notNull(),
		token: text("token").notNull().unique(),
		...timestamps,
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	},
	(table) => [index("sessions_user_id_idx").on(table.userId), index("sessions_expires_at_idx").on(table.expiresAt)],
);

export const accounts = pgTable(
	"accounts",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamptz("access_token_expires_at"),
		refreshTokenExpiresAt: timestamptz("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		...timestamps,
	},
	(table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const verifications = pgTable("verifications", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamptz("expires_at").notNull(),
	...timestamps,
}, (table) => [index("verifications_identifier_idx").on(table.identifier)]);

export const domains = pgTable("domains", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull().unique(),
	status: text("status").$type<DomainStatus>().notNull().default("pending"),
	verifiedAt: timestamptz("verified_at"),
	...timestamps,
}, (table) => [
	unique("domains_id_user_id_unique").on(table.id, table.userId),
	check("domains_status_check", sql`${table.status} IN ('pending', 'verified', 'failed')`),
	index("domains_user_id_idx").on(table.userId),
]);

export const domainProviderBindings = pgTable("domain_provider_bindings", {
	id: text("id").primaryKey(),
	domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
	provider: text("provider").$type<MailProvider>().notNull(),
	externalId: text("external_id").notNull(),
	metadata: jsonb("metadata").notNull().default({}),
	...timestamps,
}, (table) => [
	unique("domain_provider_bindings_domain_provider_unique").on(table.domainId, table.provider),
	unique("domain_provider_bindings_provider_external_id_unique").on(table.provider, table.externalId),
]);

export const addresses = pgTable("addresses", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	domainId: text("domain_id").notNull().references(() => domains.id),
	localPart: text("local_part").notNull(),
	displayName: text("display_name"),
	isEnabled: boolean("is_enabled").notNull().default(true),
	...timestamps,
}, (table) => [
	unique("addresses_domain_local_part_unique").on(table.domainId, table.localPart),
	unique("addresses_id_user_id_unique").on(table.id, table.userId),
	foreignKey({ columns: [table.domainId, table.userId], foreignColumns: [domains.id, domains.userId], name: "addresses_domain_user_id_domains_id_user_id_fk" }),
]);

export const threads = pgTable("threads", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	lastMessageAt: timestamptz("last_message_at").notNull(),
	...timestamps,
}, (table) => [
	unique("threads_id_user_id_unique").on(table.id, table.userId),
	index("threads_user_id_last_message_at_idx").on(table.userId, table.lastMessageAt.desc()),
]);

export const messages = pgTable("messages", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	threadId: text("thread_id"),
	parentMessageId: text("parent_message_id"),
	sendingAddressId: text("sending_address_id"),
	isInbound: boolean("is_inbound").notNull().default(false),
	outboundStatus: text("outbound_status").$type<OutboundStatus | null>(),
	fromName: text("from_name"),
	fromEmail: text("from_email").notNull(),
	subject: text("subject").notNull().default(""),
	textBody: text("text_body"),
	htmlRaw: text("html_raw"),
	htmlSanitized: text("html_sanitized"),
	snippet: text("snippet").notNull().default(""),
	internetMessageId: text("internet_message_id"),
	inReplyTo: text("in_reply_to"),
	references: text("references").array().notNull().default(sql`'{}'::text[]`),
	rawBlobKey: text("raw_blob_key"),
	searchText: text("search_text").notNull().default(""),
	readAt: timestamptz("read_at"),
	archivedAt: timestamptz("archived_at"),
	trashedAt: timestamptz("trashed_at"),
	receivedAt: timestamptz("received_at"),
	sentAt: timestamptz("sent_at"),
	lastSendError: text("last_send_error"),
	...timestamps,
}, (table) => [
	unique("messages_id_user_id_unique").on(table.id, table.userId),
	foreignKey({ columns: [table.threadId, table.userId], foreignColumns: [threads.id, threads.userId], name: "messages_thread_user_id_threads_id_user_id_fk" }),
	foreignKey({ columns: [table.parentMessageId, table.userId], foreignColumns: [table.id, table.userId], name: "messages_parent_user_id_messages_id_user_id_fk" }),
	foreignKey({ columns: [table.sendingAddressId, table.userId], foreignColumns: [addresses.id, addresses.userId], name: "messages_sending_address_user_id_addresses_id_user_id_fk" }),
	check("messages_outbound_status_check", sql`${table.outboundStatus} IS NULL OR ${table.outboundStatus} IN ('draft', 'sending', 'sent', 'failed')`),
	check("messages_inbound_or_outbound_status_check", sql`${table.isInbound} OR ${table.outboundStatus} IS NOT NULL`),
	check("messages_inbound_received_at_check", sql`NOT ${table.isInbound} OR ${table.receivedAt} IS NOT NULL`),
	check("messages_inbound_thread_check", sql`NOT ${table.isInbound} OR ${table.threadId} IS NOT NULL`),
	check("messages_sent_sent_at_check", sql`${table.outboundStatus} IS DISTINCT FROM 'sent' OR ${table.sentAt} IS NOT NULL`),
	check("messages_completed_thread_check", sql`${table.outboundStatus} IS DISTINCT FROM 'sent' OR ${table.threadId} IS NOT NULL`),
	index("messages_user_id_idx").on(table.userId),
	index("messages_thread_id_idx").on(table.threadId),
	index("messages_user_id_internet_message_id_idx").on(table.userId, table.internetMessageId),
	index("messages_thread_id_created_at_idx").on(table.threadId, table.createdAt),
	index("messages_inbox_idx").on(table.userId, table.receivedAt.desc()).where(sql`${table.isInbound} AND ${table.archivedAt} IS NULL AND ${table.trashedAt} IS NULL`),
	index("messages_sent_idx").on(table.userId, table.sentAt.desc()).where(sql`${table.outboundStatus} = 'sent' AND ${table.trashedAt} IS NULL`),
	index("messages_drafts_idx").on(table.userId, table.updatedAt.desc()).where(sql`${table.outboundStatus} IN ('draft', 'failed') AND ${table.trashedAt} IS NULL`),
	index("messages_trash_idx").on(table.userId, table.trashedAt.desc()).where(sql`${table.trashedAt} IS NOT NULL`),
	index("messages_search_text_idx").using("gin", sql`to_tsvector('simple', ${table.searchText})`),
]);

export const messageAddresses = pgTable("message_addresses", {
	id: text("id").primaryKey(),
	messageId: text("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
	role: text("role").$type<MessageAddressRole>().notNull(),
	name: text("name"),
	email: text("email").notNull(),
	localAddressId: text("local_address_id").references(() => addresses.id, { onDelete: "set null" }),
	position: integer("position").notNull(),
	createdAt: timestamptz("created_at").defaultNow().notNull(),
}, (table) => [
	check("message_addresses_role_check", sql`${table.role} IN ('to', 'cc', 'bcc', 'reply_to')`),
	index("message_addresses_message_role_position_idx").on(table.messageId, table.role, table.position),
]);

export const attachments = pgTable("attachments", {
	id: text("id").primaryKey(),
	messageId: text("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
	blobKey: text("blob_key").notNull().unique(),
	filename: text("filename").notNull(),
	contentType: text("content_type").notNull(),
	sizeBytes: integer("size_bytes").notNull(),
	disposition: text("disposition").$type<AttachmentDisposition>().notNull(),
	contentId: text("content_id"),
	sha256: text("sha256"),
	sourceProvider: text("source_provider"),
	sourceId: text("source_id"),
	createdAt: timestamptz("created_at").defaultNow().notNull(),
}, (table) => [
	check("attachments_disposition_check", sql`${table.disposition} IN ('attachment', 'inline')`),
	uniqueIndex("attachments_provider_source_unique").on(table.sourceProvider, table.sourceId).where(sql`${table.sourceProvider} IS NOT NULL AND ${table.sourceId} IS NOT NULL`),
]);

export const messageProviderRefs = pgTable("message_provider_refs", {
	id: text("id").primaryKey(),
	messageId: text("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
	provider: text("provider").$type<MailProvider>().notNull(),
	direction: text("direction").$type<ProviderMessageDirection>().notNull(),
	externalId: text("external_id").notNull(),
	metadata: jsonb("metadata").notNull().default({}),
	createdAt: timestamptz("created_at").defaultNow().notNull(),
}, (table) => [
	check("message_provider_refs_direction_check", sql`${table.direction} IN ('inbound', 'outbound')`),
	unique("message_provider_refs_provider_direction_external_id_unique").on(table.provider, table.direction, table.externalId),
]);

export const webhookEvents = pgTable("webhook_events", {
	id: text("id").primaryKey(),
	provider: text("provider").notNull(),
	eventId: text("event_id").notNull(),
	eventType: text("event_type").notNull(),
	externalMessageId: text("external_message_id"),
	messageId: text("message_id").references(() => messages.id),
	status: text("status").$type<WebhookStatus>().notNull(),
	error: text("error"),
	eventCreatedAt: timestamptz("event_created_at"),
	receivedAt: timestamptz("received_at").notNull(),
	processedAt: timestamptz("processed_at"),
}, (table) => [
	check("webhook_events_status_check", sql`${table.status} IN ('processing', 'processed', 'failed')`),
	unique("webhook_events_provider_event_id_unique").on(table.provider, table.eventId),
]);

export const auditLogs = pgTable("audit_logs", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	actor: text("actor").$type<AuditActor>().notNull(),
	action: text("action").$type<AuditAction>().notNull(),
	entityType: text("entity_type"),
	entityId: text("entity_id"),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	metadata: jsonb("metadata").notNull().default({}),
	createdAt: timestamptz("created_at").notNull(),
}, (table) => [
	check("audit_logs_actor_check", sql`${table.actor} IN ('user', 'system')`),
	index("audit_logs_user_id_created_at_idx").on(table.userId, table.createdAt.desc()),
]);

export const usersRelations = relations(users, ({ many }) => ({ sessions: many(sessions), accounts: many(accounts), domains: many(domains), addresses: many(addresses), threads: many(threads), messages: many(messages), auditLogs: many(auditLogs) }));
export const sessionsRelations = relations(sessions, ({ one }) => ({ user: one(users, { fields: [sessions.userId], references: [users.id] }) }));
export const accountsRelations = relations(accounts, ({ one }) => ({ user: one(users, { fields: [accounts.userId], references: [users.id] }) }));
export const domainsRelations = relations(domains, ({ one, many }) => ({ user: one(users, { fields: [domains.userId], references: [users.id] }), bindings: many(domainProviderBindings), addresses: many(addresses) }));
export const domainProviderBindingsRelations = relations(domainProviderBindings, ({ one }) => ({ domain: one(domains, { fields: [domainProviderBindings.domainId], references: [domains.id] }) }));
export const addressesRelations = relations(addresses, ({ one, many }) => ({ user: one(users, { fields: [addresses.userId], references: [users.id] }), domain: one(domains, { fields: [addresses.domainId], references: [domains.id] }), sendingMessages: many(messages), localRecipientMessages: many(messageAddresses) }));
export const threadsRelations = relations(threads, ({ one, many }) => ({ user: one(users, { fields: [threads.userId], references: [users.id] }), messages: many(messages) }));
export const messagesRelations = relations(messages, ({ one, many }) => ({ user: one(users, { fields: [messages.userId], references: [users.id] }), thread: one(threads, { fields: [messages.threadId], references: [threads.id] }), parentMessage: one(messages, { fields: [messages.parentMessageId], references: [messages.id], relationName: "message_parent" }), replies: many(messages, { relationName: "message_parent" }), sendingAddress: one(addresses, { fields: [messages.sendingAddressId], references: [addresses.id] }), addresses: many(messageAddresses), attachments: many(attachments), providerRefs: many(messageProviderRefs), webhookEvents: many(webhookEvents) }));
export const messageAddressesRelations = relations(messageAddresses, ({ one }) => ({ message: one(messages, { fields: [messageAddresses.messageId], references: [messages.id] }), localAddress: one(addresses, { fields: [messageAddresses.localAddressId], references: [addresses.id] }) }));
export const attachmentsRelations = relations(attachments, ({ one }) => ({ message: one(messages, { fields: [attachments.messageId], references: [messages.id] }) }));
export const messageProviderRefsRelations = relations(messageProviderRefs, ({ one }) => ({ message: one(messages, { fields: [messageProviderRefs.messageId], references: [messages.id] }) }));
export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({ message: one(messages, { fields: [webhookEvents.messageId], references: [messages.id] }) }));
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({ user: one(users, { fields: [auditLogs.userId], references: [users.id] }) }));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

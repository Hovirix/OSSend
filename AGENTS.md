# OSSend V1

## Goal

OSSend V1 is a simple, open-source, privacy-oriented webmail app.

Build only the V1 scope in this file. Prefer the smallest maintainable solution. Do not add architecture for hypothetical future needs.

## V1 Scope

Users can:

* register and log in
* configure a domain
* create an email address
* receive email through Resend
* safely read email
* view conversation threads
* compose, reply, reply-all, and forward
* send email through Resend
* receive attachments
* preserve raw email
* use inbox, sent, archive, and trash
* mark read/unread
* perform basic search
* view audit events

Anything not required for these capabilities is out of scope unless explicitly requested.

## Stack

Use only the existing V1 stack:

* Next.js App Router
* React + TypeScript
* Tailwind CSS + shadcn/ui
* PostgreSQL
* Supabase Postgres as managed infrastructure only
* Drizzle ORM
* Better Auth
* Resend SDK for inbound + outbound mail
* S3-compatible object storage and Filesystem
* Zod
* HTML sanitization + sandboxed email rendering
* Vitest
* Playwright
* pnpm
* GitHub Actions

Do not introduce another framework, backend language, database, ORM, auth system, mail transport, or package manager unless explicitly requested.

## Core Architecture

OSSend owns the mailbox model. Providers only transport or store infrastructure.

Dependencies should flow roughly as:

```text
UI / routes
  -> application + mailbox logic
    -> database / mail / storage adapters
```

Provider-specific types and payloads must not become application domain models.

### Database

PostgreSQL is the canonical source of truth.

Application database access must remain:

```text
Drizzle -> PostgreSQL
```

Do not couple application logic to Supabase-specific database APIs. Supabase is only the managed PostgreSQL provider.

`db/schema.ts` is the authoritative, machine-readable OSSend V1 schema. Inspect it before changing application data access; do not invent data models from UI terminology.

V1 has exactly these tables: `users`, `sessions`, `accounts`, `verifications`, `domains`, `domain_provider_bindings`, `addresses`, `threads`, `messages`, `message_addresses`, `attachments`, `message_provider_refs`, `webhook_events`, and `audit_logs`.

Agents may not create, delete, or rename tables without explicit instruction. Agents may not add, remove, or rename columns; modify relationships, ownership semantics, state values, or FK delete behavior without explicit instruction. PostgreSQL remains provider-neutral and application/domain code remains deployment-platform-neutral.

There is no mailbox table and no custom labels in V1. Drafts are `messages`. Inbox, sent, drafts, archive, trash, and unread views are derived from `messages` state exactly as defined by the schema and domain logic, never represented by a folder column or labels. Provider IDs stay in provider-reference tables outside canonical mailbox entities.

### Mail

Keep Resend behind transport boundaries.

```ts
interface OutboundTransport {
  send(message: OutgoingMessage): Promise<SendResult>;
}
```

Inbound code must normalize provider-specific payloads into OSSend's mail model before mailbox logic uses them.

V1 implementations:

* `ResendInboundTransport`
* `ResendOutboundTransport`

Never call Resend directly from pages or UI components.

### Storage

Use S3-compatible object storage for large/binary content:

* raw `.eml`
* attachments
* large inline assets when needed

Store metadata and object references in PostgreSQL.

Keep storage access behind the `BlobStorage` abstraction in `lib/storage/types.ts`; it is provider-neutral. Filesystem and S3-compatible implementations may be added later, but domain code must not require S3, store absolute paths, or store public URLs. Database blob keys are opaque and use `raw/{userId}/{messageId}.eml` and `attachments/{userId}/{messageId}/{attachmentId}`. `raw_blob_key` is populated only for an actual original RFC email, never a reconstructed provider payload.

### Threading

Conversation view is first-class V1 functionality.

Thread using standard mail headers where possible:

* `Message-ID`
* `In-Reply-To`
* `References`

Preserve the original raw email whenever possible.

Incoming threading is deterministic: parse `Message-ID`, `In-Reply-To`, and `References`; first use a same-user `In-Reply-To` match, then inspect `References` newest to oldest and use the first same-user match, otherwise create a thread. Never use subject-only threading. Outgoing replies use the known `thread_id`, set `In-Reply-To` to the parent RFC Message-ID, and append the parent RFC Message-ID to the parent's `References`. `parent_message_id` is the resolved internal relation; RFC headers are stored independently.

`html_raw` is hostile input and must never be rendered in a browser. Only `html_sanitized` may be rendered, inside a sandboxed email view.

The message row is the persistent outbound operation: `draft -> sending -> sent`, or `sending -> failed`. Outbound code finalizes the draft, changes it to `sending`, calls `OutboundTransport` with idempotency key `ossend-message/{messageId}`, then records `sent_at` and a provider reference on success or a safe error and `failed` state on failure. Retries reuse the same message ID and key.

Inbound processing is: verify webhook, claim webhook event, normalize payload, resolve hosted recipient, retrieve message, store available blobs, resolve thread, persist message, create provider reference, update thread, then mark the event processed. Mailbox database mutations should be transactional. Blob writes use deterministic retry-safe keys because PostgreSQL cannot transactionally control Filesystem/S3 writes.

## Next.js Rules

* Use App Router only.
* Prefer Server Components.
* Add `"use client"` only when browser interactivity requires it.
* Use Server Actions for internal UI mutations.
* Use Route Handlers for external HTTP boundaries such as Resend webhooks and attachment delivery.
* Do not build an internal REST API for the OSSend frontend.
* Keep business logic out of pages, layouts, and presentational components.
* Keep route handlers/actions thin: validate, authorize, call domain logic, return.

## Project Structure

Prefer existing structure. When new modules are needed, place them by responsibility:

```text
app/
components/
lib/
  auth/
  db/
  mail/
    inbound/
    outbound/
    providers/
    threading/
    mime/
    security/
  storage/
  audit/
drizzle/
tests/
migrations/
```

Do not create empty architecture or folders merely to match this tree.

## Type and Validation Rules

* Keep TypeScript strict.
* Avoid `any`.
* Reuse/infer Drizzle and Zod types where practical.
* Validate untrusted input with Zod at system boundaries.
* Treat forms, query params, headers, webhooks, MIME content, and provider payloads as untrusted.
* Prefer small explicit OSSend domain types over passing Resend objects through the codebase.

## Email Security

Email content is hostile input.

* Never render unsanitized email HTML.
* Disable remote images/tracking by default.
* Never execute message scripts.
* Sanitize and sandbox rendered email content.
* Authorize attachment access before serving data.
* Do not expose unrestricted storage URLs or keys.
* Verify Resend webhook authenticity before processing.
* Enforce ownership checks for domains, addresses, threads, messages, attachments, and audit data.

Do not trade away these rules for development speed.

## Mailbox Invariants

Preserve these when changing mail logic:

* messages belong to the correct user and thread
* recipient types remain correct
* thread assignment is deterministic
* successful outbound mail is represented in OSSend
* retried inbound events do not duplicate messages
* webhook processing is idempotent
* raw mail and attachments stay linked to the correct message
* read/archive/trash changes do not mutate message content
* audit-worthy V1 actions create consistent audit events

Use database constraints and transactions when they materially protect these invariants.

## UI Rules

* Keep webmail conventional and simple.
* Prefer existing components and shadcn/ui primitives.
* Use Tailwind for styling.
* Preserve accessibility and keyboard behavior.
* Avoid unnecessary client state.
* Prioritize inbox, thread, compose, and mail actions over decorative UI work.

## Dependencies

Before adding a package:

1. Check whether the existing stack already solves the problem.
2. Prefer a small local implementation for trivial functionality.
3. Add a dependency only when it materially reduces complexity or security risk.
4. Use `pnpm` only.

Do not replace V1 dependencies without an explicit task requiring it.

## Agent Workflow

For each task:

1. Read relevant files before editing.
2. Inspect `package.json`, nearby code, schema, and tests instead of guessing conventions.
3. Choose the smallest complete change.
4. Reuse existing abstractions and naming.
5. Keep provider code behind existing boundaries.
6. Avoid unrelated refactors or cleanup.
7. Add/update focused tests for changed behavior.
8. Run the narrowest relevant checks first, then broader checks when useful.
9. Fix failures caused by the change.
10. Report changed files, checks run, and real unresolved issues.

Do not rewrite working code solely to match a preferred style.

## Verification

Use scripts that actually exist in `package.json`; do not invent command names.

Run applicable available checks for changed code:

* type checking
* linting
* Vitest
* Playwright for affected user flows
* production build when server/client boundaries, bundling, or deployment may be affected

For database changes, verify Drizzle schema and migration together.

For mail/webhook changes, test normal input, malformed input, and retries where relevant.

## Decision Rule

When several approaches satisfy the task, prefer in this order:

1. fewer moving parts
2. simpler TypeScript
3. clearer boundaries
4. less vendor coupling
5. easier testing

V1 is a small maintainable webmail application. Do not turn it into a generalized platform framework.

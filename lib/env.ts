import { z } from "zod";

const coreEnvironmentSchema = z.object({
	DATABASE_URL: z.url(
		"DATABASE_URL must be a valid PostgreSQL connection URL.",
	),
	BETTER_AUTH_SECRET: z
		.string()
		.min(32, "BETTER_AUTH_SECRET must be at least 32 characters."),
	BETTER_AUTH_URL: z.url("BETTER_AUTH_URL must be a valid URL."),
});

const emailEnvironmentSchema = z.object({
	RESEND_API_KEY: z
		.string()
		.regex(/^re_/, "RESEND_API_KEY must start with re_."),
	EMAIL_FROM: z.string().min(3, "EMAIL_FROM is required."),
});

const resendEnvironmentSchema = z.object({
	RESEND_API_KEY: z
		.string()
		.regex(/^re_/, "RESEND_API_KEY must start with re_."),
});

const webhookEnvironmentSchema = z.object({
	RESEND_WEBHOOK_SECRET: z
		.string()
		.min(1, "RESEND_WEBHOOK_SECRET is required."),
});

export type CoreEnvironment = z.infer<typeof coreEnvironmentSchema>;
export type EmailEnvironment = z.infer<typeof emailEnvironmentSchema>;
export type ResendEnvironment = z.infer<typeof resendEnvironmentSchema>;
export type WebhookEnvironment = z.infer<typeof webhookEnvironmentSchema>;

function parseOrThrow<T>(
	schema: z.ZodType<T>,
	values: Record<string, string | undefined>,
): T {
	const parsed = schema.safeParse(values);
	if (!parsed.success) {
		const details = parsed.error.issues
			.map(
				(issue) =>
					`${(issue.path.length > 0 ? issue.path.join(".") : "environment").toUpperCase()}: ${issue.message}`,
			)
			.join("; ");
		throw new Error(`Invalid environment configuration: ${details}`);
	}
	return parsed.data;
}

function readEnv(...names: string[]): Record<string, string | undefined> {
	return Object.fromEntries(names.map((name) => [name, process.env[name]]));
}

export function getCoreEnvironment(): CoreEnvironment {
	return parseOrThrow(
		coreEnvironmentSchema,
		readEnv("DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"),
	);
}

export function getEmailEnvironment(): EmailEnvironment {
	return parseOrThrow(
		emailEnvironmentSchema,
		readEnv("RESEND_API_KEY", "EMAIL_FROM"),
	);
}

export function getResendEnvironment(): ResendEnvironment {
	return parseOrThrow(resendEnvironmentSchema, readEnv("RESEND_API_KEY"));
}

export function getWebhookEnvironment(): WebhookEnvironment {
	return parseOrThrow(
		webhookEnvironmentSchema,
		readEnv("RESEND_WEBHOOK_SECRET"),
	);
}

import { z } from "zod";

const recipients = z
	.string()
	.transform((value) =>
		value
			.split(",")
			.map((address) => address.trim())
			.filter(Boolean),
	)
	.pipe(z.array(z.email()).max(50));

export const composeSchema = z.object({
	to: recipients.refine(
		(value) => value.length > 0,
		"Add at least one recipient.",
	),
	cc: recipients,
	bcc: recipients,
	subject: z.string().trim().min(1, "Add a subject.").max(998),
	body: z.string().trim().min(1, "Write a message.").max(100_000),
});

export type ComposeInput = z.input<typeof composeSchema>;

export const mailboxSchema = z.object({
	displayName: z.string().trim().min(1, "Enter a display name.").max(120),
	email: z
		.string()
		.trim()
		.toLowerCase()
		.pipe(z.email("Enter a valid email address.")),
});

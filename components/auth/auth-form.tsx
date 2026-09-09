"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isSignUp = mode === "sign-up";

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);

		const result = isSignUp
			? await authClient.signUp.email({
					email,
					name,
					password,
					callbackURL: "/inbox",
				})
			: await authClient.signIn.email({
					email,
					password,
					callbackURL: "/inbox",
				});

		setIsSubmitting(false);
		if (result.error) {
			setError(result.error.message ?? "Unable to continue. Please try again.");
			return;
		}

		router.replace("/inbox");
		router.refresh();
	}

	return (
		<main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-8">
			<section className="w-full max-w-sm border bg-background p-5 sm:p-6">
				<div>
					<p className="text-sm font-semibold tracking-tight">OSSend</p>
					<h1 className="mt-5 text-[15px] font-semibold tracking-tight">
						{isSignUp ? "Create your account" : "Sign in to OSSend"}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{isSignUp
							? "Start with your self-hosted mailbox."
							: "Use your email and password to continue."}
					</p>
				</div>
				<form onSubmit={submit} className="mt-6 space-y-4">
					{isSignUp ? (
						<label className="block space-y-1.5 text-sm">
							<span>Name</span>
							<input
								required
								value={name}
								onChange={(event) => setName(event.target.value)}
								autoComplete="name"
								className="h-8 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
							/>
						</label>
					) : null}
					<label className="block space-y-1.5 text-sm">
						<span>Email</span>
						<input
							required
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							autoComplete="email"
							className="h-8 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
						/>
					</label>
					<label className="block space-y-1.5 text-sm">
						<span>Password</span>
						<input
							required
							type="password"
							minLength={8}
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							autoComplete={isSignUp ? "new-password" : "current-password"}
							className="h-8 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
						/>
					</label>
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					<Button type="submit" className="w-full" disabled={isSubmitting}>
						{isSubmitting
							? "Please wait"
							: isSignUp
								? "Create account"
								: "Sign in"}
					</Button>
				</form>
				<p className="mt-5 text-sm text-muted-foreground">
					{isSignUp ? "Already have an account?" : "Need an account?"}{" "}
					<Link
						href={isSignUp ? "/sign-in" : "/sign-up"}
						className="text-foreground underline underline-offset-4"
					>
						{isSignUp ? "Sign in" : "Create one"}
					</Link>
				</p>
			</section>
		</main>
	);
}

export { AuthForm };

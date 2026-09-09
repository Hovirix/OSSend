import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

export const metadata: Metadata = {
	title: "OSSend",
	description: "A self-hostable email application.",
};

function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en">
			<body>
				<TooltipProvider>
					<AppShell>{children}</AppShell>
				</TooltipProvider>
			</body>
		</html>
	);
}

export default RootLayout;

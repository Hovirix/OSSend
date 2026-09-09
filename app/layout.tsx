import type { Metadata } from "next";
import type { ReactNode } from "react";

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
				<TooltipProvider>{children}</TooltipProvider>
			</body>
		</html>
	);
}

export default RootLayout;

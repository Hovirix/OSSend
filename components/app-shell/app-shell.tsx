import type { ReactNode } from "react";

import { MobileSidebar } from "./mobile-sidebar";
import { Sidebar } from "./sidebar";

function AppShell({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-svh bg-muted/40 md:flex">
			<div className="hidden shrink-0 border-r bg-background md:block">
				<Sidebar />
			</div>
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex h-12 shrink-0 items-center border-b bg-background px-3 md:hidden">
					<MobileSidebar />
					<span className="ml-2 text-sm font-semibold tracking-tight">
						OSSend
					</span>
				</header>
				<main className="min-w-0 flex-1 bg-background">{children}</main>
			</div>
		</div>
	);
}

export { AppShell };

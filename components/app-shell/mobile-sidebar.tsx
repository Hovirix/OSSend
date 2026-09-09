"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

import { Sidebar } from "./sidebar";

function MobileSidebar() {
	const [open, setOpen] = useState(false);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger
				className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
				aria-label="Open navigation"
			>
				<Menu className="size-4" />
			</SheetTrigger>
			<SheetContent
				side="left"
				className="w-60 max-w-[85vw] gap-0 p-0"
				showCloseButton={false}
			>
				<SheetHeader className="sr-only">
					<SheetTitle>Navigation</SheetTitle>
					<SheetDescription>
						Navigate OSSend mailboxes and workspace settings.
					</SheetDescription>
				</SheetHeader>
				<Sidebar onNavigate={() => setOpen(false)} />
			</SheetContent>
		</Sheet>
	);
}

export { MobileSidebar };

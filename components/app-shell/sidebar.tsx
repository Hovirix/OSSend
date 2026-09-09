"use client";

import type { LucideIcon } from "lucide-react";
import {
	Archive,
	FileText,
	Inbox,
	PenLine,
	Send,
	Settings,
	StickyNote,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type NavigationItem = {
	href: string;
	icon: LucideIcon;
	label: string;
	unreadCount?: number;
};

const primaryNavigation: NavigationItem[] = [
	{ href: "/inbox", icon: Inbox, label: "Inbox", unreadCount: 12 },
	{ href: "/sent", icon: Send, label: "Sent" },
	{ href: "/drafts", icon: StickyNote, label: "Drafts" },
	{ href: "/archive", icon: Archive, label: "Archive" },
];

const secondaryNavigation: NavigationItem[] = [
	{ href: "/templates", icon: FileText, label: "Templates" },
	{ href: "/settings", icon: Settings, label: "Settings" },
];

function NavigationItem({
	item,
	onNavigate,
}: {
	item: NavigationItem;
	onNavigate?: () => void;
}) {
	const pathname = usePathname();
	const isActive =
		pathname === item.href || (item.href === "/inbox" && pathname === "/");
	const Icon = item.icon;

	return (
		<Link
			href={item.href}
			onClick={onNavigate}
			className={cn(
				"flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
				isActive && "bg-muted text-foreground",
			)}
		>
			<Icon className="size-4" />
			<span>{item.label}</span>
			{item.unreadCount ? (
				<span className="ml-auto text-xs tabular-nums text-muted-foreground">
					{item.unreadCount}
				</span>
			) : null}
		</Link>
	);
}

function Sidebar({
	onNavigate,
	className,
}: {
	onNavigate?: () => void;
	className?: string;
}) {
	return (
		<aside
			className={cn("flex h-full w-60 flex-col bg-background p-3", className)}
		>
			<Link
				href="/inbox"
				onClick={onNavigate}
				className="flex h-8 items-center px-2 text-sm font-semibold tracking-tight"
			>
				OSSend
			</Link>
			<Button
				className="mt-5 w-full justify-start"
				disabled
				size="sm"
				title="Composing email is not available yet"
			>
				<PenLine />
				Compose
			</Button>
			<nav className="mt-5 space-y-1" aria-label="Mailbox navigation">
				{primaryNavigation.map((item) => (
					<NavigationItem key={item.href} item={item} onNavigate={onNavigate} />
				))}
			</nav>
			<Separator className="my-4" />
			<nav className="space-y-1" aria-label="Workspace navigation">
				{secondaryNavigation.map((item) => (
					<NavigationItem key={item.href} item={item} onNavigate={onNavigate} />
				))}
			</nav>
			<div className="mt-auto px-2 py-1 text-sm text-muted-foreground">
				user@email.com
			</div>
		</aside>
	);
}

export { Sidebar };

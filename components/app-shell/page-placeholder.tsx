function PagePlaceholder({ title }: { title: string }) {
	return (
		<section className="p-5 md:p-6">
			<h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				{title} will be available here.
			</p>
		</section>
	);
}

export { PagePlaceholder };

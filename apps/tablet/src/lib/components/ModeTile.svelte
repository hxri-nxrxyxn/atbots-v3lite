<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import type { Component } from 'svelte';

	import { cn } from '$lib/utils';

	let {
		href,
		title,
		description,
		icon,
		primary = false
	}: {
		href: Pathname;
		title: string;
		description: string;
		icon: Component;
		primary?: boolean;
	} = $props();

	const Icon = $derived(icon);
</script>

<a
	href={resolve(href)}
	class={cn(
		'group bg-card/40 focus-visible:ring-ring/40 flex min-h-40 flex-col justify-between rounded-xl border p-5 outline-none transition-colors focus-visible:ring-3',
		primary
			? 'border-brand/40 hover:border-brand/70 hover:bg-card'
			: 'border-border hover:border-foreground/20 hover:bg-card'
	)}
>
	<span
		class={cn(
			'flex size-10 items-center justify-center rounded-lg',
			primary ? 'bg-brand/15 text-brand' : 'bg-muted text-foreground/80'
		)}
	>
		<Icon class="size-5" />
	</span>

	<span class="mt-6 block">
		<span class="block text-base font-medium">{title}</span>
		<span class="text-muted-foreground mt-1 block text-sm">{description}</span>
	</span>
</a>

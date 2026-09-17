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
		'group bg-card/40 focus-visible:ring-ring/40 flex flex-col justify-between rounded-xl border p-6 outline-none transition-all select-none focus-visible:ring-3',
		'min-h-[160px]',
		primary
			? 'border-brand/50 hover:border-brand bg-card hover:bg-card/90 shadow-md'
			: 'border-border hover:border-foreground/30 hover:bg-card'
	)}
>
	<span
		class={cn(
			'flex size-11 items-center justify-center rounded-lg transition-transform group-hover:scale-105',
			primary ? 'bg-brand/15 text-brand' : 'bg-muted text-foreground/80'
		)}
	>
		<Icon class="size-5" />
	</span>

	<div class="mt-6">
		<h2 class="text-base font-semibold tracking-tight text-foreground">{title}</h2>
		<p class="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
	</div>
</a>

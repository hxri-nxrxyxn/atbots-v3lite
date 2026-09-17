<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button';

	let {
		title,
		subtitle = '',
		backHref = resolve('/'),
		onBack = undefined,
		actions
	}: {
		title: string;
		subtitle?: string;
		backHref?: string;
		onBack?: () => void;
		actions?: Snippet;
	} = $props();
</script>

<header
	class="border-border/70 flex h-14 shrink-0 items-center justify-between border-b px-6 bg-background/95 backdrop-blur-sm select-none"
>
	<div class="flex items-center gap-3">
		{#if onBack}
			<Button variant="ghost" size="icon-sm" onclick={onBack} aria-label="Back">
				<ArrowLeft class="size-4" />
			</Button>
		{:else}
			<Button href={backHref} variant="ghost" size="icon-sm" aria-label="Back">
				<ArrowLeft class="size-4" />
			</Button>
		{/if}
		<div>
			<h1 class="text-sm font-semibold tracking-tight text-foreground">{title}</h1>
			{#if subtitle}
				<p class="text-muted-foreground text-xs font-mono">{subtitle}</p>
			{/if}
		</div>
	</div>

	{#if actions}
		<div class="flex items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</header>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	import { Button } from '$lib/components/ui/button';

	let {
		title,
		subtitle = '',
		actions
	}: { title: string; subtitle?: string; actions?: Snippet } = $props();
</script>

<header class="border-border/70 flex items-center justify-between border-b px-6 py-3">
	<div class="flex items-center gap-3">
		<Button href={resolve('/')} variant="ghost" size="icon-sm" aria-label="Back to console">
			<ArrowLeft class="size-4" />
		</Button>
		<div>
			<div class="text-sm font-medium">{title}</div>
			{#if subtitle}
				<div class="text-muted-foreground text-xs">{subtitle}</div>
			{/if}
		</div>
	</div>

	{#if actions}
		<div class="flex items-center gap-2">{@render actions()}</div>
	{/if}
</header>

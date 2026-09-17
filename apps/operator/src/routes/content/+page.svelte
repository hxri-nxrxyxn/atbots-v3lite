<script lang="ts">
	import { RefreshCw } from '@lucide/svelte';
	import { onMount } from 'svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { staggerIn } from '$lib/motion';
	import { cloud } from '$lib/state/cloud.svelte';

	onMount(() => {
		void cloud.loadContent();
	});
</script>

<div class="flex min-h-dvh flex-col">
	<PageHeader title="Content" subtitle="Knowledge base items">
		{#snippet actions()}
			<Button variant="outline" class="gap-1.5" onclick={() => cloud.loadContent()}>
				<RefreshCw class="size-4" />
				Refresh
			</Button>
		{/snippet}
	</PageHeader>

	<div class="mx-auto w-full max-w-2xl space-y-3 px-6 py-8" use:staggerIn>
		{#if cloud.error}
			<p class="text-destructive text-sm">{cloud.error}</p>
		{/if}

		{#if cloud.content.length === 0 && !cloud.loading}
			<p class="text-muted-foreground text-sm">No content. Is the mock cloud running?</p>
		{/if}

		{#each cloud.content as item (item.id)}
			<article class="border-border bg-card/40 rounded-xl border p-5">
				<h2 class="text-sm font-medium">{item.title}</h2>
				<p class="text-muted-foreground mt-2 text-sm leading-relaxed">{item.body}</p>
			</article>
		{/each}
	</div>
</div>

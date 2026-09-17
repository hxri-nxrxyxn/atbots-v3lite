<script lang="ts">
	import { RefreshCw } from '@lucide/svelte';
	import { onMount } from 'svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { staggerIn } from '$lib/motion';
	import { cloud } from '$lib/state/cloud.svelte';

	onMount(() => {
		void cloud.loadSessions();
	});
</script>

<div class="flex min-h-dvh flex-col">
	<PageHeader title="Sessions" subtitle="Recent conversations">
		{#snippet actions()}
			<Button variant="outline" class="gap-1.5" onclick={() => cloud.loadSessions()}>
				<RefreshCw class="size-4" />
				Refresh
			</Button>
		{/snippet}
	</PageHeader>

	<div class="mx-auto w-full max-w-3xl space-y-3 px-6 py-8" use:staggerIn>
		{#if cloud.error}
			<p class="text-destructive text-sm">{cloud.error}</p>
		{/if}

		{#if cloud.sessions.length === 0 && !cloud.loading}
			<p class="text-muted-foreground text-sm">
				No sessions yet. Run a conversation on the tablet to generate one.
			</p>
		{/if}

		{#each cloud.sessions as session (session.id)}
			<div class="border-border bg-card/40 flex items-center justify-between rounded-xl border p-4">
				<div>
					<div class="font-mono text-xs">{session.id.slice(0, 8)}</div>
					<div class="text-muted-foreground mt-1 text-xs">
						{session.robotId} · {new Date(session.startedAt).toLocaleString()}
					</div>
				</div>
				<div class="text-right">
					<div class="text-sm font-medium">{session.tier}</div>
					<div class="text-muted-foreground text-xs">{session.creditsUsed} credits</div>
				</div>
			</div>
		{/each}
	</div>
</div>

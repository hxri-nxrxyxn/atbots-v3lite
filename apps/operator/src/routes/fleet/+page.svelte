<script lang="ts">
	import { resolve } from '$app/paths';
	import type { RobotStatus } from '@atbots/protocol';
	import { RefreshCw } from '@lucide/svelte';
	import { onMount } from 'svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { staggerIn } from '$lib/motion';
	import { cloud } from '$lib/state/cloud.svelte';
	import { cn } from '$lib/utils';

	onMount(() => {
		void cloud.loadFleet();
	});

	const statusDot: Record<RobotStatus, string> = {
		active: 'bg-brand',
		suspended: 'bg-muted-foreground',
		revoked: 'bg-destructive'
	};
</script>

<div class="flex min-h-dvh flex-col">
	<PageHeader title="Fleet" subtitle="Robots and status">
		{#snippet actions()}
			<Button variant="outline" class="gap-1.5" onclick={() => cloud.loadFleet()}>
				<RefreshCw class="size-4" />
				Refresh
			</Button>
		{/snippet}
	</PageHeader>

	<div class="mx-auto w-full max-w-3xl space-y-3 px-6 py-8" use:staggerIn>
		{#if cloud.error}
			<p class="text-destructive text-sm">{cloud.error}</p>
		{/if}

		{#if cloud.fleet.length === 0 && !cloud.loading}
			<p class="text-muted-foreground text-sm">No robots returned. Is the mock cloud running?</p>
		{/if}

		{#each cloud.fleet as item (item.id)}
			<a
				href={resolve('/fleet/[id]', { id: item.id })}
				class="border-border bg-card/40 hover:border-foreground/20 hover:bg-card flex items-center justify-between rounded-xl border p-4 transition-colors"
			>
				<div class="flex items-center gap-3">
					<span class={cn('size-2 rounded-full', statusDot[item.status])}></span>
					<div>
						<div class="text-sm font-medium">{item.name}</div>
						<div class="text-muted-foreground text-xs">{item.venue ?? '—'} · {item.id}</div>
					</div>
				</div>
				<div class="text-right">
					<div class="font-mono text-sm">{item.batteryPct}%</div>
					<div class="text-muted-foreground text-xs">{item.status}</div>
				</div>
			</a>
		{/each}
	</div>
</div>

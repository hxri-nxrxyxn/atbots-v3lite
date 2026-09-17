<script lang="ts">
	import { RefreshCw } from '@lucide/svelte';
	import { onMount } from 'svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { staggerIn } from '$lib/motion';
	import { cloud } from '$lib/state/cloud.svelte';

	onMount(() => {
		void cloud.loadCredits();
	});

	const projectedDays = $derived.by(() => {
		if (!cloud.credits || cloud.credits.burnPerDay <= 0) return null;
		return Math.floor(cloud.credits.balance / cloud.credits.burnPerDay);
	});
</script>

<div class="flex min-h-dvh flex-col">
	<PageHeader title="Credits" subtitle="Balance and usage">
		{#snippet actions()}
			<Button variant="outline" class="gap-1.5" onclick={() => cloud.loadCredits()}>
				<RefreshCw class="size-4" />
				Refresh
			</Button>
		{/snippet}
	</PageHeader>

	<div class="mx-auto w-full max-w-2xl space-y-6 px-6 py-8" use:staggerIn>
		{#if cloud.error}
			<p class="text-destructive text-sm">{cloud.error}</p>
		{/if}

		{#if cloud.credits}
			<section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div class="border-border bg-card/40 rounded-xl border p-5">
					<div class="text-muted-foreground text-xs">Balance</div>
					<div class="mt-2 text-2xl font-semibold tabular-nums">
						{cloud.credits.balance.toLocaleString()}
					</div>
					<div class="text-muted-foreground mt-1 text-xs">credits</div>
				</div>
				<div class="border-border bg-card/40 rounded-xl border p-5">
					<div class="text-muted-foreground text-xs">Burn rate</div>
					<div class="mt-2 text-2xl font-semibold tabular-nums">
						{cloud.credits.burnPerDay.toLocaleString()}
					</div>
					<div class="text-muted-foreground mt-1 text-xs">per day</div>
				</div>
				<div class="border-border bg-card/40 rounded-xl border p-5">
					<div class="text-muted-foreground text-xs">Projected run-out</div>
					<div class="mt-2 text-2xl font-semibold tabular-nums">
						{projectedDays ?? '—'}
					</div>
					<div class="text-muted-foreground mt-1 text-xs">days</div>
				</div>
			</section>
			<p class="text-muted-foreground text-xs">
				1 credit = ₹1. Rates are published per the current rate card.
			</p>
		{:else if !cloud.error}
			<p class="text-muted-foreground text-sm">Loading…</p>
		{/if}
	</div>
</div>

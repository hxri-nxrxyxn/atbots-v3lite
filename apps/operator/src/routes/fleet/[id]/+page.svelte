<script lang="ts">
	import { page } from '$app/state';
	import type { RobotSummary } from '@atbots/protocol';
	import { RefreshCw, TriangleAlert } from '@lucide/svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { fadeIn } from '$lib/motion';
	import { cloud } from '$lib/state/cloud.svelte';

	let robot = $state<RobotSummary | null>(null);
	let error = $state<string | null>(null);

	const id = $derived(page.params.id ?? '');

	$effect(() => {
		const current = id;
		robot = null;
		error = null;
		if (!current) return;
		cloud
			.getRobot(current)
			.then((result) => (robot = result))
			.catch((cause: unknown) => (error = (cause as Error).message));
	});
</script>

<div class="flex min-h-dvh flex-col">
	<PageHeader title={robot?.name ?? 'Robot'} subtitle={id}>
		{#snippet actions()}
			<Button variant="outline" class="gap-1.5" onclick={() => cloud.restart(id)} disabled={!robot}>
				<RefreshCw class="size-4" />
				Restart
			</Button>
			<Button
				variant="destructive"
				class="gap-1.5"
				onclick={() => cloud.suspend(id)}
				disabled={!robot || robot.status === 'suspended'}
			>
				<TriangleAlert class="size-4" />
				Suspend
			</Button>
		{/snippet}
	</PageHeader>

	<div class="mx-auto w-full max-w-2xl space-y-6 px-6 py-8" use:fadeIn>
		{#if error}
			<p class="text-destructive text-sm">{error}</p>
		{:else if !robot}
			<p class="text-muted-foreground text-sm">Loading…</p>
		{:else}
			<section class="border-border bg-card/40 rounded-xl border p-6">
				<dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
					<dt class="text-muted-foreground">Status</dt>
					<dd class="text-right font-mono">{robot.status}</dd>
					<dt class="text-muted-foreground">Battery</dt>
					<dd class="text-right font-mono">{robot.batteryPct}%</dd>
					<dt class="text-muted-foreground">Firmware</dt>
					<dd class="text-right font-mono">{robot.firmware}</dd>
					<dt class="text-muted-foreground">Venue</dt>
					<dd class="text-right font-mono">{robot.venue ?? '—'}</dd>
					<dt class="text-muted-foreground">Last seen</dt>
					<dd class="text-right font-mono">{new Date(robot.lastSeen).toLocaleString()}</dd>
				</dl>
			</section>
		{/if}
	</div>
</div>

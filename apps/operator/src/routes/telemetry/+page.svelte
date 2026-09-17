<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { robot } from '$lib/state/robot.svelte';

	const telemetry = $derived(robot.telemetry);

	const rows = $derived(
		telemetry
			? [
					{ label: 'Drive', value: telemetry.drive },
					{ label: 'Speed', value: String(telemetry.speed) },
					{ label: 'Expression', value: telemetry.expression },
					{ label: 'Speaking', value: telemetry.speaking ? 'yes' : 'no' },
					{ label: 'Free memory', value: `${telemetry.free} B` },
					{ label: 'Uptime', value: `${Math.round(telemetry.uptime_ms / 1000)} s` }
				]
			: []
	);
</script>

<div class="flex min-h-dvh flex-col">
	<PageHeader title="Telemetry" subtitle="Live robot state and events" />

	<div class="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
		<section class="border-border bg-card/40 rounded-xl border p-6">
			<h2 class="text-sm font-medium">State</h2>
			{#if rows.length === 0}
				<p class="text-muted-foreground mt-3 text-sm">No telemetry. Connect to a robot first.</p>
			{:else}
				<dl class="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
					{#each rows as row (row.label)}
						<dt class="text-muted-foreground">{row.label}</dt>
						<dd class="text-right font-mono">{row.value}</dd>
					{/each}
				</dl>
			{/if}
		</section>

		<section class="border-border bg-card/40 rounded-xl border p-6">
			<h2 class="text-sm font-medium">Events</h2>
			{#if robot.events.length === 0}
				<p class="text-muted-foreground mt-3 text-sm">No events yet.</p>
			{:else}
				<ul class="mt-4 space-y-2">
					{#each robot.events as event, index (index)}
						<li class="flex items-center justify-between text-sm">
							<span class="font-mono">{event.event}</span>
							<span class="text-muted-foreground truncate pl-4 text-xs">{event.detail ?? ''}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>

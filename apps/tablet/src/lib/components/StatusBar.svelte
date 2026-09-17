<script lang="ts">
	import { Wifi, WifiOff } from '@lucide/svelte';

	import { robot } from '$lib/state/robot.svelte';
	import { cn } from '$lib/utils';

	let now = $state(new Date());

	$effect(() => {
		const timer = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(timer);
	});

	const connected = $derived(robot.status === 'open');
	const label = $derived.by(() => {
		if (robot.status === 'open') return robot.mode === 'mock' ? 'Simulated robot' : 'Robot linked';
		if (robot.status === 'connecting') return 'Linking';
		return 'Robot offline';
	});
	const time = $derived(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
</script>

<header class="border-border/70 flex items-center justify-between border-b px-8 py-4">
	<div class="flex items-center gap-2">
		<span class="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
			AT Bots
		</span>
	</div>

	<div class="flex items-center gap-4">
		<span
			class={cn(
				'flex items-center gap-2 rounded-full border px-3 py-1 text-xs',
				connected ? 'border-border text-foreground/80' : 'border-border text-muted-foreground'
			)}
		>
			{#if connected}
				<Wifi class="size-3.5" />
			{:else}
				<WifiOff class="size-3.5" />
			{/if}
			{label}
		</span>
		<span class="text-foreground/90 font-mono text-sm tabular-nums">{time}</span>
	</div>
</header>

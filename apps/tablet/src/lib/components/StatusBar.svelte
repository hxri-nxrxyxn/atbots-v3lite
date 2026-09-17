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

<header
	class="border-border/70 flex h-14 shrink-0 items-center justify-between border-b px-6 bg-background/95 backdrop-blur-sm select-none"
>
	<div class="flex items-center gap-3">
		<span class="text-xs font-semibold tracking-tight text-foreground font-mono">
			AT Bots V3 Lite
		</span>
	</div>

	<div class="flex items-center gap-4">
		<span
			class={cn(
				'flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-mono',
				connected ? 'border-border text-foreground/90' : 'border-border text-muted-foreground'
			)}
		>
			{#if connected}
				<Wifi class="size-3.5 text-brand" />
			{:else}
				<WifiOff class="size-3.5" />
			{/if}
			{label}
		</span>
		<span class="text-foreground/90 font-mono text-sm tabular-nums font-semibold">{time}</span>
	</div>
</header>

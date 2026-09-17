<script lang="ts">
	import type { DriveDirection } from '@atbots/protocol';
	import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, TriangleAlert } from '@lucide/svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import UnlockGate from '$lib/components/UnlockGate.svelte';
	import { Button } from '$lib/components/ui/button';
	import { robot } from '$lib/state/robot.svelte';
	import { cn } from '$lib/utils';

	let speed = $state(5);

	const pad =
		'touch-none select-none flex h-20 items-center justify-center rounded-xl border border-border bg-card/40 text-foreground/90 transition-colors hover:bg-card active:border-brand/50 active:bg-brand/15 disabled:opacity-40';

	const blocked = $derived(robot.estop || robot.status !== 'open');

	function press(dir: DriveDirection) {
		robot.drive(dir, speed);
	}

	$effect(() => {
		const release = () => robot.stop();
		window.addEventListener('pointerup', release);
		window.addEventListener('blur', release);
		return () => {
			window.removeEventListener('pointerup', release);
			window.removeEventListener('blur', release);
		};
	});
</script>

<div class="flex min-h-dvh flex-col">
	<PageHeader title="Drive" subtitle="Hold to move · release to stop">
		{#snippet actions()}
			<Button
				variant={robot.estop ? 'destructive' : 'outline'}
				class="gap-1.5"
				onclick={() => robot.toggleEstop()}
			>
				<TriangleAlert class="size-4" />
				{robot.estop ? 'Reset e-stop' : 'E-stop'}
			</Button>
		{/snippet}
	</PageHeader>

	<UnlockGate title="Drive controls locked">
		<div class="mx-auto w-full max-w-md space-y-5 px-6 py-8">
			{#if robot.estop}
				<div
					class="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm"
				>
					Emergency stop active. Drive is disabled until reset.
				</div>
			{:else if robot.status !== 'open'}
				<div class="border-border bg-card/40 text-muted-foreground rounded-xl border p-4 text-sm">
					Robot is not connected. Open Connect to link one.
				</div>
			{/if}

			<div class="border-border bg-card/40 rounded-xl border p-6">
				<div class="flex items-center justify-between text-sm">
					<span class="text-muted-foreground">Speed</span>
					<span class="font-mono">{speed}</span>
				</div>
				<input type="range" min="1" max="10" bind:value={speed} class="accent-brand mt-3 w-full" />
			</div>

			<div class="grid grid-cols-3 gap-3">
				<span></span>
				<button
					class={pad}
					disabled={blocked}
					aria-label="Forward"
					onpointerdown={() => press('forward')}
				>
					<ArrowUp class="size-6" />
				</button>
				<span></span>

				<button
					class={pad}
					disabled={blocked}
					aria-label="Left"
					onpointerdown={() => press('left')}
				>
					<ArrowLeft class="size-6" />
				</button>
				<button
					class={cn(pad, 'text-muted-foreground text-xs font-medium tracking-wider')}
					aria-label="Stop"
					onpointerdown={() => robot.stop()}
				>
					STOP
				</button>
				<button
					class={pad}
					disabled={blocked}
					aria-label="Right"
					onpointerdown={() => press('right')}
				>
					<ArrowRight class="size-6" />
				</button>

				<span></span>
				<button
					class={pad}
					disabled={blocked}
					aria-label="Backward"
					onpointerdown={() => press('backward')}
				>
					<ArrowDown class="size-6" />
				</button>
				<span></span>
			</div>
		</div>
	</UnlockGate>
</div>

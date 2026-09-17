<script lang="ts">
	import type { DriveDirection } from '@atbots/protocol';
	import {
		ArrowDown,
		ArrowLeft,
		ArrowRight,
		ArrowUp,
		Gauge,
		Layers,
		Sliders,
		TriangleAlert,
		Zap
	} from '@lucide/svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import Face from '$lib/face/Face.svelte';
	import { fadeIn, staggerIn } from '$lib/motion';
	import { robot } from '$lib/state/robot.svelte';
	import { cn } from '$lib/utils';

	let speed = $state(5);
	let activeTab = $state<'drive' | 'gestures' | 'telemetry'>('drive');

	const telemetry = $derived(robot.telemetry);
	const servos = $derived(telemetry?.servos ?? []);

	const pad =
		'touch-none select-none flex h-16 items-center justify-center rounded-xl border border-border bg-card/40 text-foreground/90 transition-all hover:bg-card active:border-brand/50 active:bg-brand/15 disabled:opacity-40';

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

<svelte:head>
	<title>AT Bots — Manual Mode</title>
</svelte:head>

<div class="flex h-full flex-col bg-background">
	<PageHeader title="Manual Mode" subtitle="Direct hardware drive & joint override">
		{#snippet actions()}
			<Button
				variant={robot.estop ? 'destructive' : 'outline'}
				size="sm"
				class="gap-1.5 font-mono text-xs"
				onclick={() => robot.toggleEstop()}
			>
				<TriangleAlert class="size-3.5" />
				{robot.estop ? 'Reset E-Stop' : 'E-Stop'}
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Tab Switcher Strip -->
	<div class="border-b border-border/70 bg-card/30 px-6 shrink-0">
		<div class="mx-auto flex w-full max-w-2xl gap-1 py-2 text-xs font-mono">
			<button
				type="button"
				onclick={() => (activeTab = 'drive')}
				class={cn(
					'rounded-lg px-3.5 py-1.5 font-medium transition-colors flex items-center gap-1.5',
					activeTab === 'drive'
						? 'bg-secondary text-secondary-foreground font-semibold border border-border/80 shadow-xs'
						: 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
				)}
			>
				<Gauge class="size-3.5" />
				Teleop Drive
			</button>

			<button
				type="button"
				onclick={() => (activeTab = 'gestures')}
				class={cn(
					'rounded-lg px-3.5 py-1.5 font-medium transition-colors flex items-center gap-1.5',
					activeTab === 'gestures'
						? 'bg-secondary text-secondary-foreground font-semibold border border-border/80 shadow-xs'
						: 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
				)}
			>
				<Sliders class="size-3.5" />
				Joints & Sequences
			</button>

			<button
				type="button"
				onclick={() => (activeTab = 'telemetry')}
				class={cn(
					'rounded-lg px-3.5 py-1.5 font-medium transition-colors flex items-center gap-1.5',
					activeTab === 'telemetry'
						? 'bg-secondary text-secondary-foreground font-semibold border border-border/80 shadow-xs'
						: 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
				)}
			>
				<Zap class="size-3.5" />
				Telemetry
			</button>
		</div>
	</div>

	<!-- Portrait Content Canvas -->
	<main class="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-6 py-6">
		{#if activeTab === 'drive'}
			<div class="space-y-6" use:fadeIn>
				{#if robot.estop}
					<div
						class="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4 text-xs font-mono"
					>
						EMERGENCY STOP ACTIVE — Physical drive cut until reset.
					</div>
				{:else if robot.status !== 'open'}
					<div
						class="border-border bg-card/40 text-muted-foreground rounded-xl border p-4 text-xs font-mono"
					>
						Robot is not linked. Simulated commands only.
					</div>
				{/if}

				<!-- Face Header & Live Telemetry Bar -->
				<div
					class="border-border bg-card/40 flex items-center justify-between rounded-xl border p-4"
				>
					<div class="flex items-center gap-3">
						<Face
							expression={robot.expression}
							speaking={robot.speaking}
							class="h-10 w-16 shrink-0"
						/>
						<div>
							<div class="text-xs font-semibold font-mono">Drive Controller</div>
							<div class="text-muted-foreground text-[11px] font-mono">
								State: {robot.telemetry?.drive ?? 'stop'}
							</div>
						</div>
					</div>

					<div class="text-right font-mono text-xs">
						<span class="text-muted-foreground">Speed:</span>
						<strong class="text-foreground ml-1">{speed} / 10</strong>
					</div>
				</div>

				<!-- Speed Slider -->
				<div class="border-border bg-card/40 rounded-xl border p-5 space-y-2">
					<div class="flex items-center justify-between text-xs">
						<span class="text-muted-foreground font-mono">Motor Power Scale</span>
						<span class="font-mono font-semibold">{speed * 10}%</span>
					</div>
					<input
						type="range"
						min="1"
						max="10"
						bind:value={speed}
						class="accent-brand w-full cursor-pointer"
					/>
				</div>

				<!-- Hold-to-Move D-Pad -->
				<div class="grid grid-cols-3 gap-3 mx-auto max-w-xs pt-2">
					<div></div>
					<button
						class={pad}
						disabled={blocked}
						aria-label="Forward"
						onpointerdown={() => press('forward')}
					>
						<ArrowUp class="size-6" />
					</button>
					<div></div>

					<button
						class={pad}
						disabled={blocked}
						aria-label="Left"
						onpointerdown={() => press('left')}
					>
						<ArrowLeft class="size-6" />
					</button>
					<button
						class={cn(pad, 'text-muted-foreground text-xs font-mono font-bold tracking-wider')}
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

					<div></div>
					<button
						class={pad}
						disabled={blocked}
						aria-label="Backward"
						onpointerdown={() => press('backward')}
					>
						<ArrowDown class="size-6" />
					</button>
					<div></div>
				</div>
			</div>
		{:else if activeTab === 'gestures'}
			<div class="space-y-6" use:fadeIn>
				<!-- Choreography Sequences -->
				<section class="border-border bg-card/40 rounded-xl border p-5 space-y-3">
					<h3
						class="text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider"
					>
						Stored Choreography
					</h3>
					<div class="flex flex-wrap gap-2 pt-1">
						<Button size="sm" onclick={() => robot.playSequence('wave')}>Wave Greeting</Button>
						<Button size="sm" onclick={() => robot.playSequence('dance_1')}>
							Celebration Dance
						</Button>
						<Button size="sm" variant="outline" onclick={() => robot.home()}>
							Return to Home Pose
						</Button>
					</div>
				</section>

				<!-- 12 Expressive Face Buttons -->
				<section class="border-border bg-card/40 rounded-xl border p-5 space-y-3">
					<h3
						class="text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider"
					>
						Facial Expressions
					</h3>
					<div class="grid grid-cols-3 gap-2 sm:grid-cols-4 pt-1">
						{#each ['neutral', 'happy', 'excited', 'curious', 'thinking', 'sad', 'surprised', 'confused', 'sleepy', 'listening', 'speaking', 'love'] as exp (exp)}
							<Button
								variant="outline"
								size="sm"
								class="text-xs capitalize h-9"
								onclick={() => robot.setExpression(exp as any)}
							>
								{exp}
							</Button>
						{/each}
					</div>
				</section>
			</div>
		{:else if activeTab === 'telemetry'}
			<div class="space-y-6" use:fadeIn>
				<!-- Live Metrics -->
				<section class="border-border bg-card/40 rounded-xl border p-5 space-y-4">
					<h3
						class="text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider"
					>
						Motion Controller State
					</h3>
					<dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-xs font-mono">
						<dt class="text-muted-foreground">Drive State</dt>
						<dd class="text-right text-foreground">{telemetry?.drive ?? 'stop'}</dd>
						<dt class="text-muted-foreground">Speed Duty</dt>
						<dd class="text-right text-foreground">{telemetry?.speed ?? 0} / 10</dd>
						<dt class="text-muted-foreground">Active Expression</dt>
						<dd class="text-right text-brand capitalize">{telemetry?.expression ?? 'neutral'}</dd>
						<dt class="text-muted-foreground">Free Heap Memory</dt>
						<dd class="text-right text-foreground">{telemetry?.free ?? 25000} B</dd>
						<dt class="text-muted-foreground">Controller Uptime</dt>
						<dd class="text-right text-foreground">
							{Math.round((telemetry?.uptime_ms ?? 0) / 1000)} s
						</dd>
					</dl>
				</section>

				<!-- Event Log -->
				<section class="border-border bg-card/40 rounded-xl border p-5 space-y-3">
					<h3
						class="text-xs font-semibold font-mono text-muted-foreground uppercase tracking-wider"
					>
						Recent Safety Events
					</h3>
					{#if robot.events.length === 0}
						<p class="text-muted-foreground text-xs font-mono py-4 text-center">
							No safety events recorded.
						</p>
					{:else}
						<ul class="space-y-2 font-mono text-xs divide-y divide-border/40">
							{#each robot.events.slice(0, 5) as ev (ev.at)}
								<li class="flex items-center justify-between pt-2">
									<span class="text-foreground">{ev.event}</span>
									<span class="text-muted-foreground text-[11px]">{ev.detail ?? 'normal'}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			</div>
		{/if}
	</main>
</div>

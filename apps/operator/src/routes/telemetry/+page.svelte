<script lang="ts">
	import {
		Activity,
		ArrowDown,
		ArrowUp,
		Cpu,
		Gauge,
		Layers,
		Radio,
		RefreshCw,
		Sliders,
		Terminal,
		Trash2,
		TriangleAlert,
		Zap
	} from '@lucide/svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { fadeIn, staggerIn } from '$lib/motion';
	import { robot } from '$lib/state/robot.svelte';
	import { cn } from '$lib/utils';

	let activeTab = $state<'signals' | 'hardware' | 'overrides'>('signals');
	let filterDirection = $state<'all' | 'tx' | 'rx'>('all');

	const telemetry = $derived(robot.telemetry);
	const motors = $derived(telemetry?.motors);
	const power = $derived(telemetry?.power);
	const servos = $derived(telemetry?.servos ?? []);
	const display = $derived(telemetry?.display);
	const io = $derived(telemetry?.io);

	const filteredTraces = $derived.by(() => {
		if (filterDirection === 'all') return robot.traces;
		return robot.traces.filter((t) => t.direction === filterDirection);
	});
</script>

<svelte:head>
	<title>AT Bots — Signal Inspector & Diagnostics</title>
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<PageHeader
		title="Hardware Diagnostics & Signal Inspector"
		subtitle="Live WebSocket bus traces & subsystem states"
	>
		{#snippet actions()}
			<div class="flex items-center gap-2">
				<Button
					variant={robot.estop ? 'destructive' : 'outline'}
					size="sm"
					class="gap-1.5 text-xs font-mono"
					onclick={() => robot.toggleEstop()}
				>
					<TriangleAlert class="size-3.5" />
					{robot.estop ? 'Reset E-Stop' : 'Trigger E-Stop'}
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<!-- Live Signal Banner (Instant status changing text) -->
	<div class="border-b border-border/80 bg-card/60 px-6 py-3 font-mono text-xs backdrop-blur-md">
		<div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 overflow-x-auto">
			<div class="flex items-center gap-6 shrink-0">
				<div class="flex items-center gap-2">
					<span class="text-muted-foreground">LAST TX:</span>
					<span class="rounded-md bg-muted px-2 py-0.5 font-bold text-brand">
						{robot.lastTxTopic}
					</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-muted-foreground">LAST RX:</span>
					<span class="rounded-md bg-muted px-2 py-0.5 font-bold text-foreground">
						{robot.lastRxTopic}
					</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-muted-foreground">HANDSHAKE:</span>
					<span
						class={cn(
							'rounded-md px-2 py-0.5 font-semibold',
							robot.lastAckStatus.startsWith('ACK')
								? 'bg-emerald-500/15 text-emerald-400'
								: robot.lastAckStatus.startsWith('NACK')
									? 'bg-destructive/20 text-destructive'
									: 'bg-muted text-muted-foreground'
						)}
					>
						{robot.lastAckStatus}
					</span>
				</div>
			</div>

			<div class="flex items-center gap-4 shrink-0 text-muted-foreground">
				<span>TX: <strong class="text-foreground">{robot.packetCountTx}</strong></span>
				<span>RX: <strong class="text-foreground">{robot.packetCountRx}</strong></span>
				<span
					class="size-2 rounded-full {robot.status === 'open'
						? 'bg-emerald-400 animate-pulse'
						: 'bg-destructive'}"
				></span>
			</div>
		</div>
	</div>

	<!-- Navigation Tabs -->
	<div class="border-b border-border/70 px-6 py-2">
		<div class="mx-auto flex w-full max-w-6xl gap-2 text-xs font-mono">
			<button
				type="button"
				onclick={() => (activeTab = 'signals')}
				class={cn(
					'rounded-lg px-3.5 py-1.5 transition-all font-medium flex items-center gap-1.5',
					activeTab === 'signals'
						? 'bg-secondary text-secondary-foreground shadow-xs'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				<Terminal class="size-3.5" />
				Live Signal Bus
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'hardware')}
				class={cn(
					'rounded-lg px-3.5 py-1.5 transition-all font-medium flex items-center gap-1.5',
					activeTab === 'hardware'
						? 'bg-secondary text-secondary-foreground shadow-xs'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				<Cpu class="size-3.5" />
				Subsystems (PDF Spec)
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'overrides')}
				class={cn(
					'rounded-lg px-3.5 py-1.5 transition-all font-medium flex items-center gap-1.5',
					activeTab === 'overrides'
						? 'bg-secondary text-secondary-foreground shadow-xs'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				<Sliders class="size-3.5" />
				Component Toggles
			</button>
		</div>
	</div>

	<main class="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
		{#if activeTab === 'signals'}
			<!-- TAB 1: Live WebSocket Traffic Inspector -->
			<div class="space-y-4" use:fadeIn>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="text-xs font-mono text-muted-foreground">Filter:</span>
						{#each ['all', 'tx', 'rx'] as f (f)}
							<button
								type="button"
								onclick={() => (filterDirection = f as 'all' | 'tx' | 'rx')}
								class={cn(
									'rounded-md px-2.5 py-1 text-xs font-mono uppercase transition-colors',
									filterDirection === f
										? 'bg-brand text-brand-foreground font-semibold'
										: 'bg-muted/40 text-muted-foreground hover:text-foreground'
								)}
							>
								{f}
							</button>
						{/each}
					</div>

					<Button
						variant="ghost"
						size="sm"
						class="gap-1.5 text-xs text-muted-foreground font-mono"
						onclick={() => robot.clearTraces()}
					>
						<Trash2 class="size-3.5" />
						Clear Trace
					</Button>
				</div>

				<div
					class="border-border bg-card/40 rounded-xl border p-2 font-mono text-xs divide-y divide-border/40 max-h-[580px] overflow-y-auto"
				>
					{#if filteredTraces.length === 0}
						<div class="p-8 text-center text-muted-foreground">
							No frames captured yet. Connect to robot or trigger a command.
						</div>
					{/if}

					{#each filteredTraces as trace (trace.id)}
						<div
							class="flex items-start justify-between gap-4 p-2.5 hover:bg-muted/30 transition-colors"
						>
							<div class="flex items-start gap-3 min-w-0">
								<span
									class={cn(
										'flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold uppercase',
										trace.direction === 'tx'
											? 'bg-brand/20 text-brand'
											: 'bg-foreground/15 text-foreground'
									)}
								>
									{trace.direction}
								</span>

								<div class="min-w-0 space-y-0.5">
									<div class="flex items-center gap-2">
										<span class="font-semibold text-foreground">{trace.topic}</span>
										{#if trace.msgId}
											<span class="text-[10px] text-muted-foreground opacity-75"
												>ID: {trace.msgId}</span
											>
										{/if}
									</div>
									<pre class="text-muted-foreground text-[11px] truncate max-w-xl">{JSON.stringify(
											trace.payload
										)}</pre>
								</div>
							</div>

							<span class="text-[10px] text-muted-foreground shrink-0 tabular-nums">
								{new Date(trace.ts).toLocaleTimeString()}:{String(trace.ts % 1000).padStart(3, '0')}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{:else if activeTab === 'hardware'}
			<!-- TAB 2: Full Hardware Subsystems (PDF Architecture Spec) -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2" use:staggerIn>
				<!-- Cytron MDD20A & TT555 Drive Motor Block -->
				<section class="border-border bg-card/40 rounded-xl border p-5 space-y-4">
					<div class="flex items-center justify-between border-b border-border/70 pb-3">
						<div class="flex items-center gap-2.5">
							<Gauge class="size-4 text-brand" />
							<h3 class="text-sm font-semibold">Cytron MDD20A (J7) · TT555 Motors</h3>
						</div>
						<span
							class="font-mono text-xs {motors?.estopActive
								? 'text-destructive font-bold'
								: 'text-emerald-400'}"
						>
							{motors?.estopActive ? 'E-STOPPED' : (motors?.state ?? 'STOP')}
						</span>
					</div>

					<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
						<dt class="text-muted-foreground">PWM Speed Left</dt>
						<dd class="text-right text-foreground">{motors?.pwmLeft ?? 0} / 255</dd>
						<dt class="text-muted-foreground">PWM Speed Right</dt>
						<dd class="text-right text-foreground">{motors?.pwmRight ?? 0} / 255</dd>
						<dt class="text-muted-foreground">Direction Pins</dt>
						<dd class="text-right text-foreground">
							DIR1: {motors?.dirLeft ? 'FWD' : 'REV'} · DIR2: {motors?.dirRight ? 'FWD' : 'REV'}
						</dd>
						<dt class="text-muted-foreground">Deadman Failsafe</dt>
						<dd class="text-right text-foreground">
							{motors?.deadmanActive ? 'TRIPPED (500ms)' : 'CLEAR'}
						</dd>
					</dl>
				</section>

				<!-- Daly 4S 100A LiFePO4 BMS Power Block -->
				<section class="border-border bg-card/40 rounded-xl border p-5 space-y-4">
					<div class="flex items-center justify-between border-b border-border/70 pb-3">
						<div class="flex items-center gap-2.5">
							<Zap class="size-4 text-brand" />
							<h3 class="text-sm font-semibold">Daly 4S 100A BMS · 384 Wh Pack</h3>
						</div>
						<span class="font-mono text-xs text-foreground font-bold"
							>{power?.socPercent ?? 88}% SoC</span
						>
					</div>

					<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
						<dt class="text-muted-foreground">Pack Voltage</dt>
						<dd class="text-right text-foreground">{power?.packVoltage ?? 13.2} V</dd>
						<dt class="text-muted-foreground">Current Draw</dt>
						<dd class="text-right text-foreground">{power?.currentAmps ?? 1.4} A</dd>
						<dt class="text-muted-foreground">Cells (4S LFP)</dt>
						<dd class="text-right text-foreground">
							{power?.cellVoltages?.join('V · ') ?? '3.3V · 3.3V · 3.3V · 3.3'}V
						</dd>
						<dt class="text-muted-foreground">Charger Inlet (YM-20)</dt>
						<dd
							class="text-right {power?.chargerPresent
								? 'text-brand font-bold'
								: 'text-foreground'}"
						>
							{power?.chargerPresent ? '14.6V CONNECTED' : 'DISCONNECTED'}
						</dd>
					</dl>
				</section>

				<!-- 5-Servo Serial Bus (J4 UART0 - ST3215 & ST3020) -->
				<section class="border-border bg-card/40 rounded-xl border p-5 space-y-4 md:col-span-2">
					<div class="flex items-center justify-between border-b border-border/70 pb-3">
						<div class="flex items-center gap-2.5">
							<Layers class="size-4 text-brand" />
							<h3 class="text-sm font-semibold">Waveshare Bus Servos (J4 UART0) · 11.8V Rail</h3>
						</div>
						<span class="font-mono text-xs text-muted-foreground">5 Nodes Polled @ 50 Hz</span>
					</div>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5 font-mono text-xs">
						{#each servos as s (s.id)}
							<div class="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1.5">
								<div class="flex items-center justify-between font-bold">
									<span>#{s.id} {s.model}</span>
									<span
										class="size-1.5 rounded-full {s.fault ? 'bg-destructive' : 'bg-emerald-400'}"
									></span>
								</div>
								<div class="text-[11px] text-muted-foreground truncate">{s.name}</div>
								<div
									class="border-t border-border/40 pt-1 flex justify-between text-muted-foreground"
								>
									<span>Angle:</span>
									<strong class="text-foreground">{s.angleDeg}°</strong>
								</div>
								<div class="flex justify-between text-muted-foreground">
									<span>Temp:</span>
									<strong class="text-foreground">{s.tempC}°C</strong>
								</div>
								<div class="flex justify-between text-muted-foreground">
									<span>Torque:</span>
									<strong class={s.torqueEnabled ? 'text-brand' : 'text-muted-foreground'}
										>{s.torqueEnabled ? 'ON' : 'OFF'}</strong
									>
								</div>
							</div>
						{/each}
					</div>
				</section>

				<!-- RP2350 Touch LCD Face & GPIO Interlocks (J3/J8/J9) -->
				<section class="border-border bg-card/40 rounded-xl border p-5 space-y-4">
					<div class="flex items-center justify-between border-b border-border/70 pb-3">
						<div class="flex items-center gap-2.5">
							<Radio class="size-4 text-brand" />
							<h3 class="text-sm font-semibold">RP2350 Face (J8/J9 UART1)</h3>
						</div>
						<span class="font-mono text-xs text-emerald-400 font-bold"
							>{display?.fps ?? 60} FPS</span
						>
					</div>

					<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
						<dt class="text-muted-foreground">Baud Rate</dt>
						<dd class="text-right text-foreground">{display?.baud ?? 921600} 8N1</dd>
						<dt class="text-muted-foreground">Heartbeat Stream</dt>
						<dd class="text-right text-foreground">30 Hz Framed</dd>
						<dt class="text-muted-foreground">Active Expression</dt>
						<dd class="text-right text-brand font-bold uppercase">
							{display?.currentExpression ?? 'neutral'}
						</dd>
					</dl>
				</section>

				<!-- Hardware Interlocks & Sense Pins -->
				<section class="border-border bg-card/40 rounded-xl border p-5 space-y-4">
					<div class="flex items-center justify-between border-b border-border/70 pb-3">
						<div class="flex items-center gap-2.5">
							<Activity class="size-4 text-brand" />
							<h3 class="text-sm font-semibold">Sense Interlocks (J3 Screw Terminals)</h3>
						</div>
						<span class="font-mono text-xs text-muted-foreground">Direct GPIO</span>
					</div>

					<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
						<dt class="text-muted-foreground">GPIO10 (Charger Sense)</dt>
						<dd class="text-right text-foreground">
							{io?.gpio10ChargerSense ? 'HIGH (14.6V)' : 'LOW (0V)'}
						</dd>
						<dt class="text-muted-foreground">GPIO11 (E-Stop Sense)</dt>
						<dd
							class="text-right {io?.gpio11EstopSense
								? 'text-destructive font-bold'
								: 'text-foreground'}"
						>
							{io?.gpio11EstopSense ? 'RELAY OPEN' : 'CLOSED (NORMAL)'}
						</dd>
						<dt class="text-muted-foreground">GPIO15 (Head Tactile)</dt>
						<dd class="text-right text-foreground">
							{io?.gpio15TactileSensor ? 'TOUCHED' : 'IDLE'}
						</dd>
					</dl>
				</section>
			</div>
		{:else if activeTab === 'overrides'}
			<!-- TAB 3: Interactive Component Debug Toggles -->
			<div class="space-y-6" use:fadeIn>
				<div class="border-border bg-card/40 rounded-xl border p-6 space-y-4">
					<h3 class="text-sm font-semibold">Motor Actuator Direct Pulse (MDD20A)</h3>
					<p class="text-muted-foreground text-xs">
						Spin individual wheels forward or reverse to verify phase wiring without hold-to-move
						deadman.
					</p>

					<div class="flex flex-wrap gap-2 pt-2">
						<Button variant="outline" size="sm" onclick={() => robot.testMotor('left', 180, 'fwd')}>
							Pulse Left Wheel (FWD)
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => robot.testMotor('right', 180, 'fwd')}
						>
							Pulse Right Wheel (FWD)
						</Button>
						<Button variant="outline" size="sm" onclick={() => robot.testMotor('both', 220, 'fwd')}>
							Pulse Both (FWD)
						</Button>
						<Button variant="outline" size="sm" onclick={() => robot.stop()}>Stop Motors</Button>
					</div>
				</div>

				<div class="border-border bg-card/40 rounded-xl border p-6 space-y-4">
					<h3 class="text-sm font-semibold">Servo Joint Pose Testing (Waveshare Bus)</h3>
					<p class="text-muted-foreground text-xs">
						Command discrete angles and toggle compliance / holding torque.
					</p>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
						{#each servos as s (s.id)}
							<div
								class="rounded-lg border border-border p-3 space-y-2 bg-muted/20 font-mono text-xs"
							>
								<div class="font-semibold flex justify-between">
									<span>#{s.id} {s.name}</span>
									<span>{s.angleDeg}°</span>
								</div>
								<div class="flex gap-1.5">
									<Button
										variant="outline"
										size="sm"
										class="flex-1 text-[11px] h-7"
										onclick={() => robot.testServo(s.id, -45)}
									>
										-45°
									</Button>
									<Button
										variant="outline"
										size="sm"
										class="flex-1 text-[11px] h-7"
										onclick={() => robot.testServo(s.id, 0)}
									>
										0° (Home)
									</Button>
									<Button
										variant="outline"
										size="sm"
										class="flex-1 text-[11px] h-7"
										onclick={() => robot.testServo(s.id, 45)}
									>
										+45°
									</Button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</main>
</div>

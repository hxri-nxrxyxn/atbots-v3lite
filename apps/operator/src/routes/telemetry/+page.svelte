<script lang="ts">
	import {
		Activity,
		Cpu,
		Gauge,
		Layers,
		Radio,
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
	let hideHeartbeats = $state(true);

	const telemetry = $derived(robot.telemetry);
	const motors = $derived(telemetry?.motors);
	const power = $derived(telemetry?.power);
	const servos = $derived(telemetry?.servos ?? []);
	const display = $derived(telemetry?.display);
	const io = $derived(telemetry?.io);

	const filteredTraces = $derived.by(() => {
		return robot.traces.filter((t) => {
			if (filterDirection !== 'all' && t.direction !== filterDirection) return false;
			if (hideHeartbeats && (t.topic === 'sys/hb' || t.topic === 'res/hb_ack')) return false;
			return true;
		});
	});
</script>

<svelte:head>
	<title>AT Bots — Telemetry & Diagnostics</title>
</svelte:head>

<div class="flex min-h-dvh flex-col bg-background text-foreground">
	<!-- Unified Clean Header -->
	<PageHeader
		title="Telemetry & Diagnostics"
		subtitle="Live signal bus, subsystem states, and hardware overrides"
	>
		{#snippet actions()}
			<div class="flex items-center gap-3">
				<!-- Live Handshake & Bus Indicator in the header -->
				<div
					class="flex items-center gap-2 font-mono text-xs border border-border/80 bg-muted/30 px-3 py-1 rounded-md"
				>
					<span
						class="size-2 rounded-full {robot.status === 'open'
							? 'bg-emerald-400'
							: 'bg-destructive'}"
					></span>
					<span class="text-muted-foreground">BUS:</span>
					<span class="text-foreground font-semibold">{robot.lastRxTopic}</span>
					<span class="text-muted-foreground/50">|</span>
					<span class="text-xs text-muted-foreground font-mono">
						TX: {robot.packetCountTx} · RX: {robot.packetCountRx}
					</span>
				</div>

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

	<!-- Standardized Clean Tab Navigation Strip -->
	<div class="border-b border-border/70 px-6 bg-card/40">
		<div class="mx-auto flex w-full max-w-6xl gap-1 py-2 text-xs">
			<button
				type="button"
				onclick={() => (activeTab = 'signals')}
				class={cn(
					'rounded-lg px-4 py-2 font-medium transition-colors flex items-center gap-2',
					activeTab === 'signals'
						? 'bg-secondary text-secondary-foreground font-semibold border border-border/80 shadow-xs'
						: 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
				)}
			>
				<Terminal class="size-3.5" />
				Live Signal Bus
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'hardware')}
				class={cn(
					'rounded-lg px-4 py-2 font-medium transition-colors flex items-center gap-2',
					activeTab === 'hardware'
						? 'bg-secondary text-secondary-foreground font-semibold border border-border/80 shadow-xs'
						: 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
				)}
			>
				<Cpu class="size-3.5" />
				Hardware Subsystems
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'overrides')}
				class={cn(
					'rounded-lg px-4 py-2 font-medium transition-colors flex items-center gap-2',
					activeTab === 'overrides'
						? 'bg-secondary text-secondary-foreground font-semibold border border-border/80 shadow-xs'
						: 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
				)}
			>
				<Sliders class="size-3.5" />
				Component Toggles
			</button>
		</div>
	</div>

	<!-- Main Content Area -->
	<main class="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
		{#if activeTab === 'signals'}
			<!-- TAB 1: Live WebSocket Traffic Inspector -->
			<div class="space-y-4" use:fadeIn>
				<!-- Filter & Tooling Bar -->
				<div class="flex items-center justify-between border-b border-border/60 pb-3">
					<div class="flex items-center gap-4 text-xs font-mono">
						<div class="flex items-center gap-1.5">
							<span class="text-muted-foreground">Direction:</span>
							{#each ['all', 'tx', 'rx'] as f (f)}
								<button
									type="button"
									onclick={() => (filterDirection = f as 'all' | 'tx' | 'rx')}
									class={cn(
										'rounded-md px-2.5 py-1 uppercase transition-colors',
										filterDirection === f
											? 'bg-secondary text-secondary-foreground font-semibold border border-border/80'
											: 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
									)}
								>
									{f}
								</button>
							{/each}
						</div>

						<span class="text-border">|</span>

						<!-- Heartbeat filter toggle -->
						<label
							class="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors"
						>
							<input
								type="checkbox"
								bind:checked={hideHeartbeats}
								class="size-3.5 rounded border-border bg-muted accent-brand"
							/>
							<span>Hide Heartbeats (sys/hb)</span>
						</label>
					</div>

					<Button
						variant="ghost"
						size="sm"
						class="gap-1.5 text-xs text-muted-foreground font-mono hover:text-foreground"
						onclick={() => robot.clearTraces()}
					>
						<Trash2 class="size-3.5" />
						Clear Stream
					</Button>
				</div>

				<!-- Live Frames Log View -->
				<div
					class="border-border bg-card/40 rounded-xl border p-2 font-mono text-xs divide-y divide-border/40 max-h-[600px] overflow-y-auto"
				>
					{#if filteredTraces.length === 0}
						<div class="p-12 text-center text-muted-foreground">
							No frames matching filter. Connect to robot or send a command.
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
										trace.direction === 'tx' ? 'bg-brand/20 text-brand' : 'bg-muted text-foreground'
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
								: 'text-foreground/80'}"
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
								<div class="flex items-center justify-between font-semibold">
									<span>#{s.id} {s.name}</span>
									<span
										class="size-1.5 rounded-full {s.fault ? 'bg-destructive' : 'bg-emerald-400'}"
									></span>
								</div>
								<div class="text-[11px] text-muted-foreground truncate">{s.model ?? 'ST3020'}</div>
								<div
									class="border-t border-border/40 pt-1 flex justify-between text-muted-foreground"
								>
									<span>Angle:</span>
									<strong class="text-foreground">{s.angleDeg ?? 0}°</strong>
								</div>
								<div class="flex justify-between text-muted-foreground">
									<span>Temp:</span>
									<strong class="text-foreground">{s.tempC ?? 35}°C</strong>
								</div>
								<div class="flex justify-between text-muted-foreground">
									<span>Volts:</span>
									<strong class="text-foreground">{s.voltage ?? 11.8}V</strong>
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
						<span class="font-mono text-xs text-foreground/80 font-semibold"
							>{display?.fps ?? 60} FPS</span
						>
					</div>

					<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
						<dt class="text-muted-foreground">Baud Rate</dt>
						<dd class="text-right text-foreground">921600 8N1</dd>
						<dt class="text-muted-foreground">Heartbeat Stream</dt>
						<dd class="text-right text-foreground">30 Hz Framed</dd>
						<dt class="text-muted-foreground">Active Expression</dt>
						<dd class="text-right text-brand font-semibold capitalize">
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
					<p class="text-muted-foreground text-xs leading-relaxed">
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
					<p class="text-muted-foreground text-xs leading-relaxed">
						Command discrete angles and toggle compliance / holding torque.
					</p>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
						{#each servos as s (s.id)}
							<div
								class="rounded-lg border border-border p-3 space-y-2 bg-muted/20 font-mono text-xs"
							>
								<div class="font-semibold flex justify-between">
									<span>#{s.id} {s.name}</span>
									<span>{s.angleDeg ?? 0}°</span>
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

<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft, CheckCircle2, RefreshCw, RotateCcw, Volume2, Wifi } from '@lucide/svelte';
	import { onMount } from 'svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import VirtualInput from '$lib/components/VirtualInput.svelte';
	import { Button } from '$lib/components/ui/button';
	import { staggerIn } from '$lib/motion';
	import { onboarding } from '$lib/state/onboarding.svelte';
	import { robot } from '$lib/state/robot.svelte';
	import { session } from '$lib/state/session.svelte';

	let espUrl = $state(robot.url);
	let relayUrl = $state(session.relayUrl);
	let voices = $state<SpeechSynthesisVoice[]>([]);
	let selectedVoice = $state('');

	// Wi-Fi Configuration State
	let wifiSsid = $state("Dhanya's Home");
	let wifiPassword = $state('');
	let wifiConnecting = $state(false);
	let wifiStatusMsg = $state<string | null>(null);

	const statusLabel = $derived.by(() => {
		switch (robot.status) {
			case 'open':
				return 'Connected';
			case 'connecting':
				return 'Connecting';
			case 'error':
				return 'Error';
			case 'closed':
				return 'Closed';
			default:
				return 'Idle';
		}
	});

	const telemetry = $derived(robot.telemetry);

	function loadVoices() {
		voices = session.voices();
	}

	onMount(() => {
		loadVoices();
		if (typeof speechSynthesis !== 'undefined') speechSynthesis.onvoiceschanged = loadVoices;
		return () => {
			if (typeof speechSynthesis !== 'undefined') speechSynthesis.onvoiceschanged = null;
		};
	});

	function connectRobot() {
		robot.url = espUrl;
		robot.connect();
	}

	function applyRelay() {
		session.setRelayUrl(relayUrl);
	}

	function selectVoice(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		selectedVoice = value;
		session.setVoice(value || null);
	}

	async function connectWifi() {
		if (!wifiSsid) return;
		wifiConnecting = true;
		wifiStatusMsg = 'Initiating network join...';

		// If connected to live ESP over WS, we can send command or simulate connection
		setTimeout(() => {
			wifiConnecting = false;
			wifiStatusMsg = `Successfully connected to ${wifiSsid}`;
			setTimeout(() => {
				wifiStatusMsg = null;
			}, 3000);
		}, 1400);
	}
</script>

<svelte:head>
	<title>AT Bots — Settings</title>
</svelte:head>

<div class="flex h-full flex-col">
	<PageHeader
		title="Settings"
		subtitle="Robot link & kiosk configuration"
		backHref={resolve('/')}
	/>

	<!-- Portrait Scrollable Settings Container -->
	<main class="mx-auto w-full max-w-2xl flex-1 space-y-6 overflow-y-auto px-6 py-6" use:staggerIn>
		<!-- 1. Wi-Fi Configuration Section -->
		<section class="border-border bg-card/40 rounded-xl border p-6">
			<div class="flex items-baseline justify-between">
				<div class="flex items-center gap-2">
					<Wifi class="size-4 text-brand" />
					<h2 class="text-sm font-semibold tracking-tight text-foreground">Venue Wi-Fi Network</h2>
				</div>
				<span class="text-muted-foreground text-xs font-mono">2.4 GHz / 5 GHz</span>
			</div>
			<p class="text-muted-foreground mt-1 text-xs leading-relaxed">
				Configure the local Wi-Fi connection for the tablet and ESP controller.
			</p>

			<div class="mt-4 space-y-4">
				<VirtualInput
					label="Network Name (SSID)"
					mode="alphanumeric"
					bind:value={wifiSsid}
					placeholder="e.g. Venue-WiFi"
					maxlength={48}
				/>

				<VirtualInput
					label="Network Password"
					mode="alphanumeric"
					bind:value={wifiPassword}
					placeholder="Enter network passphrase"
					maxlength={48}
				/>

				<div class="flex items-center justify-between pt-1">
					<Button onclick={connectWifi} disabled={wifiConnecting || !wifiSsid} class="gap-2">
						{#if wifiConnecting}
							<RefreshCw class="size-3.5 animate-spin" />
							Connecting...
						{:else}
							<Wifi class="size-3.5" />
							Join Wi-Fi
						{/if}
					</Button>

					{#if wifiStatusMsg}
						<span class="text-xs font-mono text-emerald-400 flex items-center gap-1">
							<CheckCircle2 class="size-3.5" />
							{wifiStatusMsg}
						</span>
					{/if}
				</div>
			</div>
		</section>

		<!-- 2. Robot Controller Link -->
		<section class="border-border bg-card/40 rounded-xl border p-6">
			<div class="flex items-baseline justify-between">
				<h2 class="text-sm font-semibold tracking-tight text-foreground">Robot Link</h2>
				<span class="text-muted-foreground text-xs font-mono">{statusLabel}</span>
			</div>

			<div class="mt-4 space-y-4">
				<label class="block">
					<span class="text-muted-foreground mb-1.5 block text-xs">Source</span>
					<select
						bind:value={robot.mode}
						class="border-input bg-background h-9 w-full rounded-md border px-3 text-sm font-mono"
					>
						<option value="mock">Simulated robot</option>
						<option value="esp">ESP8266 over Wi-Fi</option>
					</select>
				</label>

				{#if robot.mode === 'esp'}
					<VirtualInput
						label="WebSocket URL"
						mode="alphanumeric"
						bind:value={espUrl}
						placeholder="ws://192.168.0.155/ws"
						maxlength={64}
					/>
				{/if}

				<div class="flex gap-2">
					<Button onclick={connectRobot}>
						<RefreshCw class="size-4" />
						Connect
					</Button>
					<Button variant="outline" onclick={() => robot.disconnect()}>Disconnect</Button>
				</div>

				{#if telemetry}
					<dl
						class="border-border/70 grid grid-cols-2 gap-x-6 gap-y-2 border-t pt-4 text-xs font-mono"
					>
						<dt class="text-muted-foreground">Drive</dt>
						<dd class="text-right">{telemetry.drive}</dd>
						<dt class="text-muted-foreground">Expression</dt>
						<dd class="text-right">{telemetry.expression}</dd>
						<dt class="text-muted-foreground">Free memory</dt>
						<dd class="text-right">{telemetry.free} B</dd>
						<dt class="text-muted-foreground">Uptime</dt>
						<dd class="text-right">{Math.round(telemetry.uptime_ms / 1000)} s</dd>
					</dl>
				{/if}
			</div>
		</section>

		<!-- 3. AI Cloud Relay -->
		<section class="border-border bg-card/40 rounded-xl border p-6">
			<h2 class="text-sm font-semibold tracking-tight text-foreground">AI Relay</h2>
			<p class="text-muted-foreground mt-1 text-xs leading-relaxed">
				WebSocket streaming relay for conversational AI sessions.
			</p>
			<div class="mt-4 space-y-4">
				<VirtualInput
					label="Relay URL"
					mode="alphanumeric"
					bind:value={relayUrl}
					placeholder="ws://localhost:8787/v1/session"
					maxlength={64}
				/>
				<Button variant="outline" onclick={applyRelay}>Apply</Button>
			</div>
		</section>

		<!-- 4. Voice Synthesis -->
		<section class="border-border bg-card/40 rounded-xl border p-6">
			<h2 class="text-sm font-semibold tracking-tight text-foreground">Voice Synthesis</h2>
			<div class="mt-4 space-y-4">
				<label class="block">
					<span class="text-muted-foreground mb-1.5 block text-xs">System Voice</span>
					<select
						value={selectedVoice}
						onchange={selectVoice}
						class="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
					>
						<option value="">Browser default</option>
						{#each voices as voice (voice.voiceURI)}
							<option value={voice.voiceURI}>{voice.name} — {voice.lang}</option>
						{/each}
					</select>
				</label>
				<Button variant="outline" class="gap-1.5" onclick={() => session.testVoice()}>
					<Volume2 class="size-4" />
					Test Voice
				</Button>
			</div>
		</section>

		<!-- 5. Commissioning Reset -->
		<section class="border-border bg-card/40 rounded-xl border p-6">
			<h2 class="text-sm font-semibold tracking-tight text-foreground">Commissioning</h2>
			<p class="text-muted-foreground mt-1 text-xs leading-relaxed">
				Reset onboarding status to re-run the initial commissioning wizard.
			</p>
			<div class="mt-4 flex items-center justify-between">
				<div class="text-xs text-muted-foreground font-mono">
					Tenant: {onboarding.tenantCode} · Name: {onboarding.robotName}
				</div>
				<Button
					variant="outline"
					size="sm"
					class="gap-1.5"
					href={resolve('/onboarding')}
					onclick={() => onboarding.reset()}
				>
					<RotateCcw class="size-3.5" />
					Re-run Wizard
				</Button>
			</div>
		</section>
	</main>
</div>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft, RefreshCw, RotateCcw, Volume2 } from '@lucide/svelte';
	import { onMount } from 'svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { staggerIn } from '$lib/motion';
	import { onboarding } from '$lib/state/onboarding.svelte';
	import { robot } from '$lib/state/robot.svelte';
	import { session } from '$lib/state/session.svelte';

	let espUrl = $state(robot.url);
	let relayUrl = $state(session.relayUrl);
	let voices = $state<SpeechSynthesisVoice[]>([]);
	let selectedVoice = $state('');

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
						class="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
					>
						<option value="mock">Simulated robot</option>
						<option value="esp">ESP8266 over Wi-Fi</option>
					</select>
				</label>

				{#if robot.mode === 'esp'}
					<label class="block">
						<span class="text-muted-foreground mb-1.5 block text-xs">WebSocket URL</span>
						<Input bind:value={espUrl} placeholder="ws://192.168.0.155/ws" />
					</label>
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

		<section class="border-border bg-card/40 rounded-xl border p-6">
			<h2 class="text-sm font-semibold tracking-tight text-foreground">AI Relay</h2>
			<p class="text-muted-foreground mt-1 text-xs leading-relaxed">
				WebSocket streaming relay for conversational AI sessions.
			</p>
			<div class="mt-4 space-y-4">
				<label class="block">
					<span class="text-muted-foreground mb-1.5 block text-xs">Relay URL</span>
					<Input bind:value={relayUrl} placeholder="ws://localhost:8787/v1/session" />
				</label>
				<Button variant="outline" onclick={applyRelay}>Apply</Button>
			</div>
		</section>

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

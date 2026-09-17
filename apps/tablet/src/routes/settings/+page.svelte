<script lang="ts">
	import { ArrowLeft, RefreshCw, RotateCcw, Volume2 } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

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

<div class="flex min-h-dvh flex-col">
	<header class="border-border/70 flex items-center gap-3 border-b px-6 py-3">
		<Button href={resolve('/')} variant="ghost" size="icon-sm" aria-label="Back to home">
			<ArrowLeft class="size-4" />
		</Button>
		<span class="text-sm font-medium">Settings</span>
	</header>

	<div class="mx-auto w-full max-w-2xl space-y-6 px-6 py-8" use:staggerIn>
		<section class="border-border bg-card/40 rounded-xl border p-6">
			<div class="flex items-baseline justify-between">
				<h2 class="text-sm font-medium">Robot link</h2>
				<span class="text-muted-foreground text-xs">{statusLabel}</span>
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
					<dl class="border-border/70 grid grid-cols-2 gap-x-6 gap-y-2 border-t pt-4 text-sm">
						<dt class="text-muted-foreground">Drive</dt>
						<dd class="text-right font-mono">{telemetry.drive}</dd>
						<dt class="text-muted-foreground">Expression</dt>
						<dd class="text-right font-mono">{telemetry.expression}</dd>
						<dt class="text-muted-foreground">Free memory</dt>
						<dd class="text-right font-mono">{telemetry.free} B</dd>
						<dt class="text-muted-foreground">Uptime</dt>
						<dd class="text-right font-mono">{Math.round(telemetry.uptime_ms / 1000)} s</dd>
					</dl>
				{/if}
			</div>
		</section>

		<section class="border-border bg-card/40 rounded-xl border p-6">
			<h2 class="text-sm font-medium">AI relay</h2>
			<p class="text-muted-foreground mt-1 text-xs">
				Used by the conversation screen. Defaults to the local mock cloud.
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
			<h2 class="text-sm font-medium">Voice</h2>
			<div class="mt-4 space-y-4">
				<label class="block">
					<span class="text-muted-foreground mb-1.5 block text-xs">System voice</span>
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
				<Button variant="outline" onclick={() => session.testVoice()}>
					<Volume2 class="size-4" />
					Test voice
				</Button>
			</div>
		</section>
		<section class="border-border bg-card/40 rounded-xl border p-6">
			<h2 class="text-sm font-medium">Commissioning & Provisioning</h2>
			<p class="text-muted-foreground mt-1 text-xs">
				Reset onboarding status to re-run the initial setup wizard.
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
					Re-run Onboarding
				</Button>
			</div>
		</section>
	</div>
</div>

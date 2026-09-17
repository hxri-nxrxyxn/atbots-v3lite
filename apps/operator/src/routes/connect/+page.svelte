<script lang="ts">
	import { RefreshCw } from '@lucide/svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { auth } from '$lib/state/auth.svelte';
	import { robot } from '$lib/state/robot.svelte';

	let espUrl = $state(robot.url);
	let pin = $state('');

	const statusLabel = $derived.by(() => {
		switch (robot.status) {
			case 'open':
				return robot.mode === 'mock' ? 'Simulated robot' : 'Robot linked';
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

	function connect() {
		robot.url = espUrl;
		robot.connect();
	}

	function submitPin(event: SubmitEvent) {
		event.preventDefault();
		auth.tryUnlock(pin);
	}
</script>

<div class="flex min-h-dvh flex-col">
	<PageHeader title="Connect" subtitle="Robot link and operator access" />

	<div class="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
		<section class="border-border bg-card/40 rounded-xl border p-6">
			<div class="flex items-baseline justify-between">
				<h2 class="text-sm font-medium">Robot</h2>
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
					<Button onclick={connect}>
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
			<div class="flex items-baseline justify-between">
				<h2 class="text-sm font-medium">Operator PIN</h2>
				<span class="text-muted-foreground text-xs">
					{auth.unlocked ? 'Unlocked' : 'Locked'}
				</span>
			</div>

			{#if auth.unlocked}
				<div class="mt-4 flex items-center justify-between">
					<p class="text-muted-foreground text-sm">Local controls are unlocked.</p>
					<Button variant="outline" onclick={() => auth.lock()}>Lock</Button>
				</div>
			{:else}
				<form class="mt-4 flex items-end gap-2" onsubmit={submitPin}>
					<label class="flex-1">
						<span class="text-muted-foreground mb-1.5 block text-xs">6-digit PIN</span>
						<Input
							bind:value={pin}
							maxlength={6}
							placeholder="123456"
							class="font-mono tracking-[0.3em]"
						/>
					</label>
					<Button type="submit">Unlock</Button>
				</form>
				{#if auth.error}
					<p class="text-destructive mt-2 text-xs">{auth.error}</p>
				{/if}
			{/if}
		</section>
	</div>
</div>

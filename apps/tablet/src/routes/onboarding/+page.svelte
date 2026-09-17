<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ArrowRight, CheckCircle2, Cpu, RefreshCw, Sparkles, Wifi, Zap } from '@lucide/svelte';

	import NumericInput from '$lib/components/NumericInput.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Face from '$lib/face/Face.svelte';
	import { fadeIn, staggerIn } from '$lib/motion';
	import { onboarding } from '$lib/state/onboarding.svelte';
	import { robot } from '$lib/state/robot.svelte';
	import { cn } from '$lib/utils';
	import { voice } from '$lib/voice';

	let step = $state(1); // 1: Welcome/Tenant, 2: Link/Diagnostics, 3: Completed

	// Step 1: Activation Form
	let tenantCode = $state(onboarding.tenantCode);
	let robotName = $state(onboarding.robotName);
	let activationPin = $state('');
	let pinError = $state<string | null>(null);

	// Step 2: Diagnostics & Self-Test
	let testingSpeech = $state(false);
	let testingExpression = $state(false);

	function proceedToDiagnostics() {
		if (activationPin !== '123456' && activationPin !== '000000') {
			pinError = 'Enter standard PIN 123456 to verify authority';
			return;
		}
		pinError = null;
		step = 2;
		if (robot.status !== 'open') {
			robot.connect();
		}
	}

	async function testVoiceSpeech() {
		testingSpeech = true;
		robot.setExpression('speaking');
		await voice.speak(
			`Audio subsystem verified for ${robotName}. Speech synthesizer is operational.`
		);
		testingSpeech = false;
		robot.setExpression('happy');
	}

	function testFaceMorph() {
		testingExpression = true;
		robot.setExpression('surprised');
		setTimeout(() => {
			robot.setExpression('excited');
			setTimeout(() => {
				robot.setExpression('happy');
				testingExpression = false;
			}, 800);
		}, 800);
	}

	function completeSetup() {
		onboarding.complete(tenantCode, robotName);
		step = 3;
		robot.setExpression('happy');
		setTimeout(() => {
			void goto(resolve('/'));
		}, 1800);
	}
</script>

<div class="mx-auto w-full max-w-2xl" use:fadeIn>
	<!-- Step Indicator Header -->
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center gap-2">
			{#each [1, 2, 3] as s (s)}
				<div
					class={cn(
						'flex size-7 items-center justify-center rounded-full text-xs font-mono font-semibold transition-all',
						step === s
							? 'bg-brand text-brand-foreground shadow-xs'
							: step > s
								? 'bg-muted text-foreground'
								: 'bg-muted/40 text-muted-foreground'
					)}
				>
					{s}
				</div>
				{#if s < 3}
					<div class="bg-border h-0.5 w-6"></div>
				{/if}
			{/each}
		</div>

		<span class="text-xs text-muted-foreground font-mono">
			Step {step} of 3: {step === 1 ? 'Activation' : step === 2 ? 'Diagnostics' : 'Ready'}
		</span>
	</div>

	<!-- Step Card Container -->
	<div class="border-border bg-card/60 rounded-2xl border p-8 shadow-xl">
		{#if step === 1}
			<!-- STEP 1: Tenant & Robot Setup -->
			<div class="space-y-6" use:staggerIn>
				<div class="flex items-center gap-5">
					<Face expression="curious" class="h-16 w-26 shrink-0" />
					<div>
						<h1 class="scroll-m-20 text-xl font-bold tracking-tight">Robot Activation</h1>
						<p class="text-muted-foreground text-sm mt-1">
							Assign this tablet to a tenant organisation and set its call name.
						</p>
					</div>
				</div>

				<div class="space-y-4 pt-2">
					<div>
						<label
							for="tenant-code-input"
							class="text-xs text-muted-foreground font-medium block mb-1.5"
						>
							Tenant Organisation Code
						</label>
						<Input
							id="tenant-code-input"
							bind:value={tenantCode}
							placeholder="e.g. SCHOOL-01"
							class="font-mono"
						/>
					</div>

					<div>
						<label
							for="robot-name-input"
							class="text-xs text-muted-foreground font-medium block mb-1.5"
						>
							Robot Name
						</label>
						<Input id="robot-name-input" bind:value={robotName} placeholder="e.g. Aria" />
					</div>

					<div class="pt-2">
						<NumericInput
							label="Commissioning Authorization PIN (Use 123456)"
							bind:value={activationPin}
							maxlength={6}
							placeholder="123456"
							error={pinError}
							onComplete={() => proceedToDiagnostics()}
						/>
					</div>
				</div>

				<div class="pt-4 border-t border-border flex justify-end">
					<Button onclick={proceedToDiagnostics} class="gap-2 px-6">
						Next: Diagnostics <ArrowRight class="size-4" />
					</Button>
				</div>
			</div>
		{:else if step === 2}
			<!-- STEP 2: Hardware & Subsystem Verification -->
			<div class="space-y-6" use:staggerIn>
				<div class="flex items-center justify-between border-b border-border/70 pb-4">
					<div>
						<h1 class="scroll-m-20 text-xl font-bold tracking-tight">System Self-Test</h1>
						<p class="text-muted-foreground text-xs mt-1">
							Verify local speech synthesis and control plane connectivity.
						</p>
					</div>
					<Face expression="listening" class="h-12 w-20 shrink-0" />
				</div>

				<div class="space-y-3">
					<!-- Check 1: Robot Controller Link -->
					<div
						class="flex items-center justify-between rounded-xl border border-border p-4 bg-muted/20"
					>
						<div class="flex items-center gap-3">
							<Cpu class="size-5 text-brand" />
							<div>
								<div class="text-sm font-medium">Motion & Safety Controller</div>
								<div class="text-muted-foreground text-xs font-mono">
									{robot.status === 'open'
										? `Connected (${robot.mode === 'mock' ? 'Simulated' : 'ESP8266 Live'})`
										: 'Connecting...'}
								</div>
							</div>
						</div>
						<span class="text-xs font-mono text-emerald-400 font-medium">
							{robot.status === 'open' ? '✔ READY' : 'CONNECTING'}
						</span>
					</div>

					<!-- Check 2: Audio Output -->
					<div
						class="flex items-center justify-between rounded-xl border border-border p-4 bg-muted/20"
					>
						<div class="flex items-center gap-3">
							<Zap class="size-5 text-brand" />
							<div>
								<div class="text-sm font-medium">Audio Synthesizer</div>
								<div class="text-muted-foreground text-xs">
									{testingSpeech ? 'Speaking test phrase...' : 'Verify internal audio amplifier'}
								</div>
							</div>
						</div>
						<Button variant="outline" size="sm" onclick={testVoiceSpeech} disabled={testingSpeech}>
							Test Voice
						</Button>
					</div>

					<!-- Check 3: Face Animation Engine -->
					<div
						class="flex items-center justify-between rounded-xl border border-border p-4 bg-muted/20"
					>
						<div class="flex items-center gap-3">
							<Sparkles class="size-5 text-brand" />
							<div>
								<div class="text-sm font-medium">Procedural Face Engine</div>
								<div class="text-muted-foreground text-xs">
									{testingExpression
										? 'Morphing expressions...'
										: 'Tween parameters & SVG geometry'}
								</div>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onclick={testFaceMorph}
							disabled={testingExpression}
						>
							Test Morph
						</Button>
					</div>
				</div>

				<div class="pt-4 border-t border-border flex items-center justify-between">
					<Button variant="ghost" size="sm" onclick={() => (step = 1)}>← Back</Button>
					<Button onclick={completeSetup} class="gap-2 px-6">
						Complete Commissioning <CheckCircle2 class="size-4" />
					</Button>
				</div>
			</div>
		{:else if step === 3}
			<!-- STEP 3: Setup Completed -->
			<div class="text-center py-6 space-y-6" use:fadeIn>
				<div class="flex justify-center">
					<Face expression="excited" class="h-28 w-44" />
				</div>
				<div>
					<h1 class="scroll-m-20 text-2xl font-bold tracking-tight">Commissioning Complete</h1>
					<p class="text-muted-foreground text-sm mt-2">
						{robotName} is now fully provisioned for {tenantCode}.
					</p>
					<p class="text-xs text-muted-foreground font-mono mt-4">
						Redirecting to Kiosk Home Screen...
					</p>
				</div>
			</div>
		{/if}
	</div>
</div>

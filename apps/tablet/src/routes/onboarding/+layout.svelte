<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Bot, ShieldCheck } from '@lucide/svelte';
	import KeyboardDock from '$lib/components/KeyboardDock.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="bg-background text-foreground flex min-h-dvh flex-col">
	<!-- Dedicated Clean Onboarding Top Header -->
	<header class="border-border/60 flex items-center justify-between border-b px-8 py-5">
		<div class="flex items-center gap-3">
			<div class="bg-brand/15 text-brand flex size-8 items-center justify-center rounded-lg">
				<Bot class="size-4" />
			</div>
			<div>
				<span class="text-xs font-semibold font-mono block"> AT Bots V3 Lite </span>
				<span class="text-muted-foreground text-xs">Commissioning & Provisioning</span>
			</div>
		</div>

		<div class="flex items-center gap-2 text-xs font-mono text-muted-foreground">
			<ShieldCheck class="size-4 text-brand" />
			<span>System Provisioning Setup</span>
		</div>
	</header>

	<!-- Dedicated Canvas Container -->
	<main class="flex flex-1 flex-col items-center justify-center p-6 md:p-12">
		{@render children()}
	</main>

	<!-- Standard Footer -->
	<footer
		class="border-border/60 border-t py-4 text-center text-xs text-muted-foreground font-mono"
	>
		Target Commissioning Time: &lt; 5 Minutes · Fail-Open Architecture
	</footer>
</div>

<!-- Global Bottom-Left Floating Keyboard Dock for Onboarding -->
<KeyboardDock />

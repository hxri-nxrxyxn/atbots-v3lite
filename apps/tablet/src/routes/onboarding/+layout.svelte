<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ShieldCheck } from '@lucide/svelte';
	import KeyboardDock from '$lib/components/KeyboardDock.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="bg-background text-foreground flex min-h-dvh flex-col">
	<!-- Dedicated Clean Onboarding Top Header -->
	<header class="border-border/60 flex items-center justify-between border-b px-8 py-4">
		<div class="flex items-center gap-3">
			<img src="/atbots-logo.png" alt="AT Bots" class="h-7 w-auto object-contain" />
		</div>

		<div class="flex items-center gap-2 text-xs font-mono text-muted-foreground">
			<ShieldCheck class="size-4 text-brand" />
			<span>Commissioning & Provisioning</span>
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

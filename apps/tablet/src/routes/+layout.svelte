<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import KeyboardDock from '$lib/components/KeyboardDock.svelte';
	import { onboarding } from '$lib/state/onboarding.svelte';
	import { onMount, type Snippet } from 'svelte';
	import '../app.css';

	let { children }: { children: Snippet } = $props();

	onMount(() => {
		if (!onboarding.completed && !page.url.pathname.startsWith('/onboarding')) {
			void goto(resolve('/onboarding'));
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Global Portrait Frame: 100dvh Container with Fixed Max Width & Centered Alignment -->
<div
	class="flex h-dvh w-screen flex-col overflow-hidden bg-background text-foreground antialiased selection:bg-brand/30"
>
	{@render children()}
</div>

<!-- Global Floating Bottom-Left Keyboard Dock (Numeric & Alphanumeric) -->
<KeyboardDock />

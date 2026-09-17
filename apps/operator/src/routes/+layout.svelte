<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import KeyboardDock from '$lib/components/KeyboardDock.svelte';
	import type { Snippet } from 'svelte';
	import '../app.css';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<!-- Global Floating Bottom-Left Keyboard Dock (Numeric & Alphanumeric) -->
<KeyboardDock />

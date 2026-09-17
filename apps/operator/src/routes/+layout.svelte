<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import NumericKeypadDock from '$lib/components/NumericKeypadDock.svelte';
	import type { Snippet } from 'svelte';
	import '../app.css';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<!-- Global Floating Bottom-Left Numeric Keypad -->
<NumericKeypadDock />

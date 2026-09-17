<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import { onboarding } from '$lib/state/onboarding.svelte';
	import { onMount, type Snippet } from 'svelte';
	import '../app.css';

	let { children }: { children: Snippet } = $props();

	onMount(() => {
		// If one-time commissioning hasn't been completed and user is not on /onboarding, redirect
		if (!onboarding.completed && !page.url.pathname.startsWith('/onboarding')) {
			void goto(resolve('/onboarding'));
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

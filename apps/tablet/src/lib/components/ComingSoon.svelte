<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft } from '@lucide/svelte';
	import type { Component } from 'svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { fadeIn } from '$lib/motion';

	let { title, description, icon }: { title: string; description: string; icon: Component } =
		$props();

	const Icon = $derived(icon);
</script>

<svelte:head>
	<title>AT Bots — {title}</title>
</svelte:head>

<div class="flex h-full flex-col">
	<PageHeader {title} subtitle="Module status" backHref={resolve('/')} />

	<main class="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-12">
		<div
			class="border-border bg-card/40 w-full max-w-md rounded-2xl border p-8 text-center"
			use:fadeIn={{ scale: 0.98 }}
		>
			<div
				class="bg-muted text-foreground/80 mx-auto flex size-12 items-center justify-center rounded-xl"
			>
				<Icon class="size-6" />
			</div>
			<h2 class="mt-6 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
			<p class="text-muted-foreground mt-2 text-xs leading-relaxed">{description}</p>
			<p class="text-muted-foreground mt-6 text-[11px] font-mono">
				In development for this prototype.
			</p>
			<div class="mt-8">
				<Button href={resolve('/')} variant="outline" class="gap-2 text-xs font-medium">
					<ArrowLeft class="size-3.5" />
					Back to Home
				</Button>
			</div>
		</div>
	</main>
</div>

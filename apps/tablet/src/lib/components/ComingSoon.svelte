<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft } from '@lucide/svelte';
	import type { Component } from 'svelte';

	import { Button } from '$lib/components/ui/button';

	let { title, description, icon }: { title: string; description: string; icon: Component } =
		$props();

	const Icon = $derived(icon);
</script>

<div class="flex min-h-dvh flex-col items-center justify-center px-8">
	<div class="border-border bg-card/40 w-full max-w-md rounded-xl border p-8 text-center">
		<div
			class="bg-muted text-foreground/80 mx-auto flex size-12 items-center justify-center rounded-lg"
		>
			<Icon class="size-6" />
		</div>
		<h1 class="mt-6 text-lg font-medium">{title}</h1>
		<p class="text-muted-foreground mt-2 text-sm">{description}</p>
		<p class="text-muted-foreground mt-6 text-xs">In development for this demo.</p>
		<div class="mt-8">
			<Button href={resolve('/')} variant="outline" class="gap-2">
				<ArrowLeft class="size-4" />
				Back to home
			</Button>
		</div>
	</div>
</div>

<script lang="ts">
	import { Lock } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { auth } from '$lib/state/auth.svelte';

	let { children, title = 'Local controls locked' }: { children: Snippet; title?: string } =
		$props();

	let pin = $state('');

	function submit(event: SubmitEvent) {
		event.preventDefault();
		auth.tryUnlock(pin);
	}
</script>

{#if auth.unlocked}
	{@render children()}
{:else}
	<div class="flex flex-1 items-center justify-center px-6 py-16">
		<form
			class="border-border bg-card/40 w-full max-w-sm rounded-xl border p-8 text-center"
			onsubmit={submit}
		>
			<div
				class="bg-muted text-foreground/80 mx-auto flex size-12 items-center justify-center rounded-lg"
			>
				<Lock class="size-6" />
			</div>
			<h1 class="mt-6 text-lg font-medium">{title}</h1>
			<p class="text-muted-foreground mt-2 text-sm">Enter the 6-digit operator PIN.</p>
			<Input
				bind:value={pin}
				class="mt-6 text-center font-mono tracking-[0.5em]"
				maxlength={6}
				placeholder="••••••"
			/>
			{#if auth.error}
				<p class="text-destructive mt-2 text-xs">{auth.error}</p>
			{/if}
			<Button type="submit" class="mt-4 w-full">Unlock</Button>
		</form>
	</div>
{/if}

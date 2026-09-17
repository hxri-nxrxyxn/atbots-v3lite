<script lang="ts">
	import { Lock } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	import NumericInput from '$lib/components/NumericInput.svelte';
	import { Button } from '$lib/components/ui/button';
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
	<div class="flex flex-1 items-center justify-center px-6 py-12">
		<form
			class="border-border bg-card/40 w-full max-w-sm rounded-2xl border p-8 text-center"
			onsubmit={submit}
		>
			<div
				class="bg-muted text-foreground/80 mx-auto flex size-12 items-center justify-center rounded-xl"
			>
				<Lock class="size-6" />
			</div>
			<h1 class="mt-6 text-lg font-semibold tracking-tight">{title}</h1>
			<p class="text-muted-foreground mt-1 text-sm">Enter the 6-digit operator PIN.</p>

			<div class="mt-6">
				<NumericInput
					bind:value={pin}
					maxlength={6}
					placeholder="••••••"
					error={auth.error}
					autoFocus={true}
					onComplete={() => auth.tryUnlock(pin)}
				/>
			</div>

			<Button type="submit" class="mt-4 w-full">Unlock</Button>
		</form>
	</div>
{/if}

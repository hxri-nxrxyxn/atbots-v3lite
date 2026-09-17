<script lang="ts">
	import { Send } from '@lucide/svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import UnlockGate from '$lib/components/UnlockGate.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { staggerIn } from '$lib/motion';
	import { robot } from '$lib/state/robot.svelte';

	const phrases = [
		'Welcome to the event. Please make your way to the main hall.',
		'Dinner is now being served.',
		'Please proceed to the auditorium for the next session.',
		'Thank you for visiting. Have a wonderful day.'
	];

	let text = $state('');
	let log = $state<string[]>([]);

	function say(value: string) {
		const line = value.trim();
		if (!line) return;
		robot.scriptSay(line);
		log = [line, ...log].slice(0, 10);
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		say(text);
		text = '';
	}
</script>

<div class="flex min-h-dvh flex-col">
	<PageHeader title="Script Mode" subtitle="The tablet speaks what you type" />

	<UnlockGate title="Script Mode locked">
		<div class="mx-auto w-full max-w-2xl space-y-6 px-6 py-8" use:staggerIn>
			<section>
				<h2 class="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
					Phrase library
				</h2>
				<div class="mt-3 grid gap-2">
					{#each phrases as phrase (phrase)}
						<button
							type="button"
							class="border-border bg-card/40 hover:border-foreground/20 hover:bg-card rounded-lg border px-4 py-3 text-left text-sm transition-colors"
							onclick={() => say(phrase)}
						>
							{phrase}
						</button>
					{/each}
				</div>
			</section>

			<section>
				<h2 class="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
					Custom line
				</h2>
				<form class="mt-3 flex items-center gap-2" onsubmit={submit}>
					<Input bind:value={text} placeholder="Type an announcement" class="h-11 flex-1" />
					<Button type="submit" size="icon-lg" disabled={!text.trim()} aria-label="Speak">
						<Send class="size-4" />
					</Button>
				</form>
			</section>

			{#if log.length > 0}
				<section>
					<h2 class="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
						Sent
					</h2>
					<ul class="mt-3 space-y-1">
						{#each log as line, index (index)}
							<li class="text-muted-foreground truncate text-sm">— {line}</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	</UnlockGate>
</div>

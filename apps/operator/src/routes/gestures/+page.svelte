<script lang="ts">
	import { EXPRESSIONS, type Expression } from '@atbots/protocol';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import UnlockGate from '$lib/components/UnlockGate.svelte';
	import { Button } from '$lib/components/ui/button';
	import { robot } from '$lib/state/robot.svelte';

	const sequences = ['wave', 'dance_1'];

	function label(expression: Expression): string {
		return expression.charAt(0).toUpperCase() + expression.slice(1);
	}
</script>

<div class="flex min-h-dvh flex-col">
	<PageHeader title="Gestures" subtitle="Expressions and motion sequences" />

	<UnlockGate title="Gestures locked">
		<div class="mx-auto w-full max-w-3xl space-y-8 px-6 py-8">
			<section>
				<h2 class="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
					Expressions
				</h2>
				<div class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
					{#each EXPRESSIONS as expression (expression)}
						<Button variant="outline" onclick={() => robot.setExpression(expression)}>
							{label(expression)}
						</Button>
					{/each}
				</div>
			</section>

			<section>
				<h2 class="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
					Sequences
				</h2>
				<div class="mt-3 flex flex-wrap gap-2">
					{#each sequences as sequence (sequence)}
						<Button onclick={() => robot.playSequence(sequence)}>{sequence}</Button>
					{/each}
					<Button variant="outline" onclick={() => robot.home()}>Home pose</Button>
				</div>
			</section>
		</div>
	</UnlockGate>
</div>

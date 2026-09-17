<script lang="ts">
	import { Check, Delete, X } from '@lucide/svelte';
	import { gsap } from 'gsap';
	import { keypad } from '$lib/state/keypad.svelte';
	import { cn } from '$lib/utils';

	let containerEl = $state<HTMLDivElement | undefined>(undefined);

	const prefersReducedMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	$effect(() => {
		if (keypad.isOpen && containerEl && !prefersReducedMotion) {
			gsap.fromTo(
				containerEl,
				{ autoAlpha: 0, y: 24, scale: 0.94 },
				{
					autoAlpha: 1,
					y: 0,
					scale: 1,
					duration: 0.28,
					ease: 'power3.out',
					clearProps: 'transform'
				}
			);
		}
	});

	const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
</script>

{#if keypad.isOpen}
	<div
		bind:this={containerEl}
		class="fixed bottom-5 left-5 z-50 w-64 rounded-xl border border-border/80 bg-card/95 p-3 text-foreground shadow-2xl backdrop-blur-xl select-none"
		role="dialog"
		aria-label="Numeric Keypad Dock"
	>
		<!-- Minimalist Header / Title -->
		<div class="mb-2 flex items-center justify-between border-b border-border/60 pb-1.5 px-0.5">
			<span class="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">
				{keypad.currentSession?.label ?? 'Numeric Entry'}
			</span>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={() => keypad.clear()}
					class="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors uppercase"
				>
					Clear
				</button>
				<button
					type="button"
					onclick={() => keypad.close()}
					class="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
					aria-label="Close Keypad"
				>
					<X class="size-3.5" />
				</button>
			</div>
		</div>

		<!-- Compact 3x4 Grid -->
		<div class="grid grid-cols-3 gap-1.5">
			{#each digits as digit (digit)}
				<button
					type="button"
					onclick={() => keypad.pressDigit(digit)}
					class="flex h-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-sm font-mono font-medium transition-all hover:bg-muted active:scale-95 active:bg-brand/15 active:border-brand/40 outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{digit}
				</button>
			{/each}

			{#if keypad.currentSession?.showDecimal}
				<button
					type="button"
					onclick={() => keypad.pressDigit('.')}
					class="flex h-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-sm font-mono transition-all hover:bg-muted active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					.
				</button>
			{:else}
				<div class="h-10"></div>
			{/if}

			<button
				type="button"
				onclick={() => keypad.pressDigit('0')}
				class="flex h-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-sm font-mono font-medium transition-all hover:bg-muted active:scale-95 active:bg-brand/15 active:border-brand/40 outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				0
			</button>

			<button
				type="button"
				onclick={() => keypad.backspace()}
				aria-label="Backspace"
				class="flex h-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-all hover:text-foreground hover:bg-muted active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<Delete class="size-4" />
			</button>
		</div>
	</div>
{/if}

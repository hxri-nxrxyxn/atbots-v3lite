<script lang="ts">
	import { ArrowUp, Delete, Globe, X } from '@lucide/svelte';
	import { gsap } from 'gsap';
	import { keyboard } from '$lib/state/keyboard.svelte';
	import { cn } from '$lib/utils';

	let containerEl = $state<HTMLDivElement | undefined>(undefined);

	const prefersReducedMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	$effect(() => {
		if (keyboard.isOpen && containerEl && !prefersReducedMotion) {
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

	// Key layout configurations
	const NUMERIC_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

	const QWERTY_ROW_1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
	const QWERTY_ROW_2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
	const QWERTY_ROW_3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];

	const SYMBOLS_ROW_1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
	const SYMBOLS_ROW_2 = ['@', '#', '$', '%', '&', '*', '-', '+', '/', '='];
	const SYMBOLS_ROW_3 = ['!', '?', ':', ';', '"', "'", '_'];
</script>

{#if keyboard.isOpen}
	<div
		bind:this={containerEl}
		class={cn(
			'fixed bottom-5 left-5 z-50 rounded-2xl border border-border/80 bg-card/95 p-3.5 text-foreground shadow-2xl backdrop-blur-xl select-none transition-all',
			keyboard.currentSession?.mode === 'alphanumeric'
				? 'w-[480px] max-w-[calc(100vw-40px)]'
				: 'w-64'
		)}
		role="dialog"
		aria-label="Virtual On-Screen Keyboard"
	>
		<!-- Minimalist Header / Title -->
		<div class="mb-2.5 flex items-center justify-between border-b border-border/60 pb-1.5 px-0.5">
			<span class="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">
				{keyboard.currentSession?.label ??
					(keyboard.currentSession?.mode === 'alphanumeric' ? 'Text Entry' : 'Numeric Entry')}
			</span>
			<div class="flex items-center gap-3">
				<button
					type="button"
					onclick={() => keyboard.clear()}
					class="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors uppercase"
				>
					Clear
				</button>
				<button
					type="button"
					onclick={() => keyboard.close()}
					class="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
					aria-label="Close Keyboard"
				>
					<X class="size-3.5" />
				</button>
			</div>
		</div>

		{#if keyboard.currentSession?.mode === 'numeric'}
			<!-- 3x4 Compact Numeric Grid -->
			<div class="grid grid-cols-3 gap-1.5">
				{#each NUMERIC_DIGITS as digit (digit)}
					<button
						type="button"
						onclick={() => keyboard.pressKey(digit)}
						class="flex h-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-sm font-mono font-medium transition-all hover:bg-muted active:scale-95 active:bg-brand/15 active:border-brand/40 outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						{digit}
					</button>
				{/each}

				{#if keyboard.currentSession?.showDecimal}
					<button
						type="button"
						onclick={() => keyboard.pressKey('.')}
						class="flex h-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-sm font-mono transition-all hover:bg-muted active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						.
					</button>
				{:else}
					<div class="h-10"></div>
				{/if}

				<button
					type="button"
					onclick={() => keyboard.pressKey('0')}
					class="flex h-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-sm font-mono font-medium transition-all hover:bg-muted active:scale-95 active:bg-brand/15 active:border-brand/40 outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					0
				</button>

				<button
					type="button"
					onclick={() => keyboard.backspace()}
					aria-label="Backspace"
					class="flex h-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground transition-all hover:text-foreground hover:bg-muted active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<Delete class="size-4" />
				</button>
			</div>
		{:else}
			<!-- Full Alphanumeric QWERTY / Symbols Grid -->
			<div class="space-y-1.5">
				<!-- Row 1 -->
				<div class="flex gap-1 justify-center">
					{#each keyboard.isSymbols ? SYMBOLS_ROW_1 : QWERTY_ROW_1 as key (key)}
						<button
							type="button"
							onclick={() => keyboard.pressKey(key)}
							class="flex h-9 flex-1 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-xs font-mono font-medium transition-all hover:bg-muted active:scale-95 active:bg-brand/15 active:border-brand/40 outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{keyboard.isShift && !keyboard.isSymbols ? key.toUpperCase() : key}
						</button>
					{/each}
				</div>

				<!-- Row 2 -->
				<div class="flex gap-1 justify-center px-2">
					{#each keyboard.isSymbols ? SYMBOLS_ROW_2 : QWERTY_ROW_2 as key (key)}
						<button
							type="button"
							onclick={() => keyboard.pressKey(key)}
							class="flex h-9 flex-1 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-xs font-mono font-medium transition-all hover:bg-muted active:scale-95 active:bg-brand/15 active:border-brand/40 outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{keyboard.isShift && !keyboard.isSymbols ? key.toUpperCase() : key}
						</button>
					{/each}
				</div>

				<!-- Row 3 (Shift, Keys, Backspace) -->
				<div class="flex gap-1 justify-center">
					{#if !keyboard.isSymbols}
						<button
							type="button"
							onclick={() => keyboard.toggleShift()}
							aria-label="Shift toggle"
							class={cn(
								'flex h-9 w-11 items-center justify-center rounded-lg border text-xs font-mono transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring',
								keyboard.isShift
									? 'bg-brand text-brand-foreground border-brand font-bold'
									: 'bg-muted/60 border-border/80 text-muted-foreground'
							)}
						>
							<ArrowUp class="size-3.5" />
						</button>
					{/if}

					{#each keyboard.isSymbols ? SYMBOLS_ROW_3 : QWERTY_ROW_3 as key (key)}
						<button
							type="button"
							onclick={() => keyboard.pressKey(key)}
							class="flex h-9 flex-1 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-xs font-mono font-medium transition-all hover:bg-muted active:scale-95 active:bg-brand/15 active:border-brand/40 outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{keyboard.isShift && !keyboard.isSymbols ? key.toUpperCase() : key}
						</button>
					{/each}

					<button
						type="button"
						onclick={() => keyboard.backspace()}
						aria-label="Backspace"
						class="flex h-9 w-11 items-center justify-center rounded-lg border border-border/80 bg-muted/60 text-muted-foreground transition-all hover:text-foreground active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Delete class="size-3.5" />
					</button>
				</div>

				<!-- Row 4 (Symbols toggle, Spacebar, Period, Done) -->
				<div class="flex gap-1.5 justify-center pt-0.5">
					<button
						type="button"
						onclick={() => keyboard.toggleSymbols()}
						class={cn(
							'flex h-9 px-3 items-center justify-center rounded-lg border text-xs font-mono transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring',
							keyboard.isSymbols
								? 'bg-brand text-brand-foreground border-brand font-semibold'
								: 'bg-muted/60 border-border/80 text-muted-foreground hover:text-foreground'
						)}
					>
						{keyboard.isSymbols ? 'ABC' : '?123'}
					</button>

					<button
						type="button"
						onclick={() => keyboard.pressSpace()}
						class="flex h-9 flex-1 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-xs font-mono text-muted-foreground transition-all hover:bg-muted active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						space
					</button>

					<button
						type="button"
						onclick={() => keyboard.pressKey('.')}
						class="flex h-9 w-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-xs font-mono font-medium transition-all hover:bg-muted active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						.
					</button>

					<button
						type="button"
						onclick={() => keyboard.close()}
						class="flex h-9 px-3 items-center justify-center rounded-lg bg-foreground text-background text-xs font-mono font-semibold transition-all hover:opacity-90 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						done
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<script lang="ts">
	import { ArrowLeft, Check, Delete } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	let {
		value = $bindable(''),
		maxlength = 6,
		showDecimal = false,
		onComplete = undefined,
		onClose = undefined,
		class: className = ''
	}: {
		value?: string;
		maxlength?: number;
		showDecimal?: boolean;
		onComplete?: (val: string) => void;
		onClose?: () => void;
		class?: string;
	} = $props();

	function pressKey(key: string) {
		if (value.length >= maxlength) return;
		if (key === '.' && (value.includes('.') || !showDecimal)) return;
		value = value + key;
		if (value.length === maxlength && onComplete) {
			onComplete(value);
		}
	}

	function backspace() {
		if (value.length > 0) {
			value = value.slice(0, -1);
		}
	}

	function clear() {
		value = '';
	}

	const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
</script>

<div
	class={cn(
		'border-border bg-card/95 text-foreground w-full max-w-xs rounded-2xl border p-4 shadow-2xl backdrop-blur-xl select-none',
		className
	)}
	role="group"
	aria-label="Numeric keypad"
>
	<!-- Keypad Header / Actions -->
	<div class="mb-3 flex items-center justify-between border-b border-border/70 pb-2">
		<button
			type="button"
			onclick={clear}
			class="text-muted-foreground hover:text-foreground text-xs font-mono tracking-wider uppercase transition-colors"
		>
			Clear
		</button>
		{#if onClose}
			<button
				type="button"
				onclick={onClose}
				class="text-muted-foreground hover:text-foreground text-xs font-mono uppercase transition-colors"
			>
				Done
			</button>
		{/if}
	</div>

	<!-- 3x4 Keypad Grid -->
	<div class="grid grid-cols-3 gap-2">
		{#each digits as digit (digit)}
			<button
				type="button"
				onclick={() => pressKey(digit)}
				class="border-border bg-card/60 hover:bg-muted active:scale-95 active:bg-brand/15 active:border-brand/40 flex h-14 items-center justify-center rounded-xl border text-xl font-medium font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{digit}
			</button>
		{/each}

		<!-- Bottom Row: Decimal/Custom, 0, Backspace -->
		{#if showDecimal}
			<button
				type="button"
				onclick={() => pressKey('.')}
				class="border-border bg-card/60 hover:bg-muted active:scale-95 flex h-14 items-center justify-center rounded-xl border text-xl font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				.
			</button>
		{:else}
			<div class="flex h-14 items-center justify-center"></div>
		{/if}

		<button
			type="button"
			onclick={() => pressKey('0')}
			class="border-border bg-card/60 hover:bg-muted active:scale-95 active:bg-brand/15 active:border-brand/40 flex h-14 items-center justify-center rounded-xl border text-xl font-medium font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			0
		</button>

		<button
			type="button"
			onclick={backspace}
			aria-label="Backspace"
			class="border-border bg-card/60 hover:bg-muted active:scale-95 flex h-14 items-center justify-center rounded-xl border text-muted-foreground hover:text-foreground transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<Delete class="size-5" />
		</button>
	</div>
</div>

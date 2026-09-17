<script lang="ts">
	import NumericKeypad from '$lib/components/NumericKeypad.svelte';
	import { fadeIn } from '$lib/motion';
	import { cn } from '$lib/utils';

	let {
		value = $bindable(''),
		maxlength = 6,
		placeholder = '••••••',
		label = undefined,
		error = undefined,
		showDecimal = false,
		onComplete = undefined,
		class: className = '',
		autoFocus = false
	}: {
		value?: string;
		maxlength?: number;
		placeholder?: string;
		label?: string;
		error?: string | null;
		showDecimal?: boolean;
		onComplete?: (val: string) => void;
		class?: string;
		autoFocus?: boolean;
	} = $props();

	let isOpen = $state(false);
	let inputContainerEl = $state<HTMLDivElement | undefined>(undefined);

	$effect(() => {
		if (autoFocus) {
			isOpen = true;
		}
	});

	function handleFocus() {
		isOpen = true;
	}

	function handleBlur(e: FocusEvent) {
		const related = e.relatedTarget as HTMLElement | null;
		if (inputContainerEl && inputContainerEl.contains(related)) {
			return;
		}
	}
</script>

<div bind:this={inputContainerEl} class={cn('relative w-full space-y-2', className)}>
	{#if label}
		<span class="text-muted-foreground block text-xs font-medium">{label}</span>
	{/if}

	<!-- Readonly physical input that opens the keypad on focus/click -->
	<div class="relative flex items-center">
		<input
			type="text"
			readonly
			{value}
			{placeholder}
			onclick={() => (isOpen = true)}
			onfocus={handleFocus}
			onblur={handleBlur}
			class={cn(
				'border-input bg-background file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-11 w-full rounded-md border px-4 text-center font-mono text-lg tracking-[0.4em] shadow-xs transition-[color,box-shadow] outline-none cursor-pointer select-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50'
			)}
		/>
	</div>

	{#if error}
		<p class="text-destructive text-xs">{error}</p>
	{/if}

	<!-- Popover/Docked Numeric Keypad -->
	{#if isOpen}
		<div class="pt-2 flex justify-center" use:fadeIn={{ y: 8, duration: 0.25 }}>
			<NumericKeypad
				bind:value
				{maxlength}
				{showDecimal}
				{onComplete}
				onClose={() => (isOpen = false)}
			/>
		</div>
	{/if}
</div>

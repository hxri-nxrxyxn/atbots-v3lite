<script lang="ts">
	import { keyboard, type KeyboardMode } from '$lib/state/keyboard.svelte';
	import { cn } from '$lib/utils';

	let {
		value = $bindable(''),
		mode = 'alphanumeric',
		maxlength = 64,
		placeholder = 'Type here…',
		label = undefined,
		error = undefined,
		showDecimal = false,
		onComplete = undefined,
		class: className = '',
		autoFocus = false
	}: {
		value?: string;
		mode?: KeyboardMode;
		maxlength?: number;
		placeholder?: string;
		label?: string;
		error?: string | null;
		showDecimal?: boolean;
		onComplete?: (val: string) => void;
		class?: string;
		autoFocus?: boolean;
	} = $props();

	const sessionId = $props.id();

	function openDock() {
		keyboard.open({
			id: sessionId,
			mode,
			getValue: () => value,
			setValue: (v: string) => {
				value = v;
			},
			maxlength,
			showDecimal,
			label: label ?? placeholder,
			onComplete
		});
	}

	$effect(() => {
		if (autoFocus) {
			openDock();
		}
	});

	const isThisActive = $derived(keyboard.isOpen && keyboard.currentSession?.id === sessionId);
</script>

<div class={cn('relative w-full space-y-1.5', className)}>
	{#if label}
		<span class="text-muted-foreground block text-xs font-medium">{label}</span>
	{/if}

	<div class="relative flex items-center">
		<input
			type="text"
			readonly
			{value}
			{placeholder}
			onclick={openDock}
			onfocus={openDock}
			class={cn(
				'border-input bg-background file:text-foreground placeholder:text-muted-foreground/60 flex h-11 w-full rounded-md border px-4 shadow-xs transition-all outline-none cursor-pointer select-none focus-visible:ring-3',
				mode === 'numeric' ? 'text-center font-mono text-lg tracking-[0.4em]' : 'text-left text-sm',
				isThisActive
					? 'border-brand ring-3 ring-brand/30'
					: 'focus-visible:border-ring focus-visible:ring-ring/50',
				error && 'border-destructive ring-destructive/20'
			)}
		/>
	</div>

	{#if error}
		<p class="text-destructive text-xs">{error}</p>
	{/if}
</div>

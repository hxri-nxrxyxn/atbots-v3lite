<script lang="ts">
	import VirtualInput from '$lib/components/VirtualInput.svelte';

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
</script>

<VirtualInput
	bind:value
	mode="numeric"
	{maxlength}
	{placeholder}
	{label}
	{error}
	{showDecimal}
	{onComplete}
	class={className}
	{autoFocus}
/>

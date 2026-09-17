<script lang="ts">
	import { CircleStop, Mic, Send } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import Face from '$lib/face/Face.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { fadeIn, itemIn } from '$lib/motion';
	import { session, type SessionPhase } from '$lib/state/session.svelte';
	import { cn } from '$lib/utils';

	const phaseLabels: Record<SessionPhase, string> = {
		idle: 'Ready',
		starting: 'Connecting',
		listening: 'Listening',
		thinking: 'Thinking',
		speaking: 'Speaking',
		error: 'Error'
	};

	const cannedQuestions = [
		'What are the school timings?',
		'Tell me about admissions',
		'Can you wave?'
	];

	let draft = $state('');
	let transcriptEl = $state<HTMLDivElement | undefined>(undefined);

	const faceExpression = $derived(
		session.phase === 'thinking'
			? 'thinking'
			: session.phase === 'speaking'
				? 'speaking'
				: session.phase === 'error'
					? 'sad'
					: 'listening'
	);

	onMount(() => {
		session.start();
		return () => session.end();
	});

	$effect(() => {
		session.messages.length;
		if (transcriptEl) transcriptEl.scrollTop = transcriptEl.scrollHeight;
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		session.sendText(draft);
		draft = '';
	}

	function ask(question: string) {
		session.sendText(question);
	}
</script>

<svelte:head>
	<title>AT Bots — Conversation</title>
</svelte:head>

<div class="flex h-full flex-col">
	<PageHeader title="Conversation" subtitle="Visitor natural language session">
		{#snippet actions()}
			<div class="flex items-center gap-3">
				<span class="text-muted-foreground flex items-center gap-2 text-xs font-mono">
					<span
						class={cn(
							'size-2 rounded-full',
							session.phase === 'error'
								? 'bg-destructive'
								: session.phase === 'idle'
									? 'bg-muted-foreground'
									: 'bg-brand'
						)}
					></span>
					{phaseLabels[session.phase]}
				</span>

				{#if session.phase === 'speaking'}
					<Button
						variant="outline"
						size="sm"
						class="gap-1.5 font-mono text-xs"
						onclick={() => session.stopSpeaking()}
					>
						<CircleStop class="size-3.5" />
						Stop
					</Button>
				{/if}
			</div>
		{/snippet}
	</PageHeader>

	<!-- Portrait Screen Layout -->
	<main
		class="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-between overflow-hidden px-6 py-6 gap-5"
	>
		<!-- Big Animated Face -->
		<div class="flex justify-center shrink-0" use:fadeIn={{ scale: 0.96, duration: 0.6 }}>
			<Face expression={faceExpression} speaking={session.phase === 'speaking'} class="h-44 w-72" />
		</div>

		<!-- Transcript Scroll Area -->
		<div
			bind:this={transcriptEl}
			class="border-border bg-card/30 flex-1 space-y-3.5 overflow-y-auto rounded-xl border p-5"
		>
			{#if session.messages.length === 0}
				<p class="text-muted-foreground text-sm text-center py-8 font-mono">
					Say hello or select a quick question below to begin.
				</p>
			{/if}

			{#each session.messages as message (message.id)}
				<div
					class={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
					use:itemIn
				>
					<div
						class={cn(
							'max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed',
							message.role === 'user'
								? 'bg-secondary text-secondary-foreground font-medium'
								: 'bg-muted/60 text-foreground'
						)}
					>
						{message.text}
					</div>
				</div>
			{/each}
		</div>

		{#if session.error}
			<p class="text-destructive text-xs font-mono">{session.error}</p>
		{/if}

		<!-- Input & Quick Prompts Toolbar -->
		<footer class="space-y-3 shrink-0">
			<div class="flex flex-wrap gap-2">
				{#each cannedQuestions as question (question)}
					<button
						type="button"
						class="border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-card/40 rounded-lg border px-3 py-1.5 text-xs transition-colors"
						onclick={() => ask(question)}
					>
						{question}
					</button>
				{/each}
			</div>

			<form class="flex items-center gap-2" onsubmit={submit}>
				<Input bind:value={draft} placeholder="Type a message or speak..." class="h-12 flex-1" />
				<Button
					type="button"
					variant="outline"
					size="icon-lg"
					disabled={!session.micAvailable}
					aria-pressed={session.listening}
					aria-label="Use microphone"
					class={session.listening ? 'border-brand text-brand ring-2 ring-brand/30' : ''}
					onclick={() => session.toggleListening()}
				>
					<Mic class="size-4" />
				</Button>
				<Button type="submit" size="icon-lg" disabled={!draft.trim()} aria-label="Send message">
					<Send class="size-4" />
				</Button>
			</form>
		</footer>
	</main>
</div>

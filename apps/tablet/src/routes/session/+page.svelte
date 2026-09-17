<script lang="ts">
	import { ArrowLeft, CircleStop, Mic, Send } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	import Face from '$lib/face/Face.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
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

<div class="flex h-dvh flex-col">
	<header class="border-border/70 flex items-center justify-between border-b px-6 py-3">
		<div class="flex items-center gap-3">
			<Button href={resolve('/')} variant="ghost" size="icon-sm" aria-label="Back to home">
				<ArrowLeft class="size-4" />
			</Button>
			<span class="text-sm font-medium">Conversation</span>
		</div>

		<div class="flex items-center gap-3">
			<span class="text-muted-foreground flex items-center gap-2 text-xs">
				<span
					class={cn(
						'size-1.5 rounded-full',
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
				<Button variant="outline" size="sm" class="gap-1.5" onclick={() => session.stopSpeaking()}>
					<CircleStop class="size-3.5" />
					Stop
				</Button>
			{/if}
		</div>
	</header>

	<div class="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-hidden px-6 py-6">
		<div class="flex justify-center">
			<Face expression={faceExpression} speaking={session.phase === 'speaking'} class="h-40 w-72" />
		</div>

		<div
			bind:this={transcriptEl}
			class="border-border bg-card/30 flex-1 space-y-4 overflow-y-auto rounded-xl border p-5"
		>
			{#if session.messages.length === 0}
				<p class="text-muted-foreground text-sm">Say hello or type a question below to begin.</p>
			{/if}

			{#each session.messages as message (message.id)}
				<div class={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
					<div
						class={cn(
							'max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed',
							message.role === 'user'
								? 'bg-secondary text-secondary-foreground'
								: 'bg-muted/60 text-foreground'
						)}
					>
						{message.text}
					</div>
				</div>
			{/each}
		</div>

		{#if session.error}
			<p class="text-destructive text-xs">{session.error}</p>
		{/if}

		<div class="space-y-3">
			<div class="flex flex-wrap gap-2">
				{#each cannedQuestions as question (question)}
					<button
						type="button"
						class="border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 rounded-full border px-3 py-1 text-xs transition-colors"
						onclick={() => ask(question)}
					>
						{question}
					</button>
				{/each}
			</div>

			<form class="flex items-center gap-2" onsubmit={submit}>
				<Input bind:value={draft} placeholder="Type a message" class="h-11 flex-1" />
				<Button
					type="button"
					variant="outline"
					size="icon-lg"
					disabled={!session.micAvailable}
					aria-pressed={session.listening}
					aria-label="Use microphone"
					class={session.listening ? 'border-brand text-brand' : ''}
					onclick={() => session.toggleListening()}
				>
					<Mic class="size-4" />
				</Button>
				<Button type="submit" size="icon-lg" disabled={!draft.trim()} aria-label="Send message">
					<Send class="size-4" />
				</Button>
			</form>

			{#if !session.micAvailable}
				<p class="text-muted-foreground text-xs">
					Microphone needs a secure context (https or localhost). Typing works everywhere.
				</p>
			{/if}
		</div>
	</div>
</div>

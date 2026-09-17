<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft, CheckCircle2, CircleStop, RotateCcw, Volume2, XCircle } from '@lucide/svelte';

	import { Button } from '$lib/components/ui/button';
	import { SAMPLE_QUIZZES } from '$lib/data/education';
	import Face from '$lib/face/Face.svelte';
	import { fadeIn, staggerIn } from '$lib/motion';
	import { robot } from '$lib/state/robot.svelte';
	import { cn } from '$lib/utils';
	import { voice } from '$lib/voice';
	import type { Quiz } from '@atbots/protocol';

	let selectedQuiz = $state<Quiz | null>(null);
	let currentQuestionIndex = $state(0);
	let selectedOptionId = $state<string | null>(null);
	let isAnswerSubmitted = $state(false);
	let score = $state(0);
	let quizFinished = $state(false);
	let speaking = $state(false);

	const currentQuestion = $derived(
		selectedQuiz ? selectedQuiz.questions[currentQuestionIndex] : null
	);

	const isCorrect = $derived(
		currentQuestion && selectedOptionId === currentQuestion.correctOptionId
	);

	const faceExpression = $derived(
		quizFinished
			? score >= (selectedQuiz?.questions.length ?? 1) / 2
				? 'happy'
				: 'neutral'
			: isAnswerSubmitted
				? isCorrect
					? 'happy'
					: 'sad'
				: 'curious'
	);

	function startQuiz(quiz: Quiz) {
		selectedQuiz = quiz;
		currentQuestionIndex = 0;
		selectedOptionId = null;
		isAnswerSubmitted = false;
		score = 0;
		quizFinished = false;
		robot.setExpression('curious');
		void readAloud(`Starting quiz: ${quiz.title}. Question 1: ${quiz.questions[0]?.question}`);
	}

	function selectOption(optionId: string) {
		if (isAnswerSubmitted) return;
		selectedOptionId = optionId;
	}

	function submitAnswer() {
		if (!selectedOptionId || !currentQuestion || isAnswerSubmitted) return;
		isAnswerSubmitted = true;

		if (isCorrect) {
			score += 1;
			robot.setExpression('happy');
			void readAloud(`Correct! ${currentQuestion.explanation}`);
		} else {
			robot.setExpression('sad');
			void readAloud(`Not quite. ${currentQuestion.explanation}`);
		}
	}

	function nextQuestion() {
		if (!selectedQuiz) return;
		if (currentQuestionIndex + 1 < selectedQuiz.questions.length) {
			currentQuestionIndex += 1;
			selectedOptionId = null;
			isAnswerSubmitted = false;
			robot.setExpression('curious');
			const nextQ = selectedQuiz.questions[currentQuestionIndex];
			void readAloud(`Question ${currentQuestionIndex + 1}: ${nextQ?.question}`);
		} else {
			quizFinished = true;
			const total = selectedQuiz.questions.length;
			const endExp = score >= total / 2 ? 'excited' : 'neutral';
			robot.setExpression(endExp);
			void readAloud(`Quiz complete! You scored ${score} out of ${total}.`);
		}
	}

	async function readAloud(text: string) {
		voice.stop();
		speaking = true;
		robot.setSpeaking(true);
		await voice.speak(text);
		speaking = false;
		robot.setSpeaking(false);
	}

	function stopSpeaking() {
		voice.stop();
		speaking = false;
		robot.setSpeaking(false);
	}

	function resetQuiz() {
		stopSpeaking();
		if (selectedQuiz) {
			startQuiz(selectedQuiz);
		}
	}

	function backToCatalog() {
		stopSpeaking();
		selectedQuiz = null;
		robot.setExpression('neutral');
	}
</script>

<svelte:head>
	<title>AT Bots — Quizzes</title>
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="border-border/70 flex items-center justify-between border-b px-6 py-3">
		<div class="flex items-center gap-3">
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={selectedQuiz ? backToCatalog : undefined}
				href={selectedQuiz ? undefined : resolve('/')}
				aria-label="Back"
			>
				<ArrowLeft class="size-4" />
			</Button>
			<div>
				<div class="text-sm font-semibold tracking-tight">
					{selectedQuiz ? selectedQuiz.title : 'Quizzes'}
				</div>
				<p class="text-muted-foreground text-xs font-mono">
					{selectedQuiz ? `Category: ${selectedQuiz.category}` : 'Offline knowledge challenge'}
				</p>
			</div>
		</div>

		{#if speaking}
			<Button variant="outline" size="sm" class="gap-1.5 font-mono text-xs" onclick={stopSpeaking}>
				<CircleStop class="size-3.5" />
				Stop Voice
			</Button>
		{/if}
	</header>

	{#if !selectedQuiz}
		<!-- Quiz Catalog Selection -->
		<div class="mx-auto w-full max-w-4xl flex-1 space-y-10 px-6 py-10" use:staggerIn>
			<div class="flex items-center gap-6">
				<Face expression="curious" class="h-14 w-24 shrink-0" />
				<div>
					<h1 class="scroll-m-20 text-2xl font-bold tracking-tight">Quiz Library</h1>
					<p class="text-muted-foreground text-sm leading-relaxed mt-1">
						Test your knowledge with immediate audio feedback, scoring, and explanations.
					</p>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				{#each SAMPLE_QUIZZES as quiz (quiz.id)}
					<button
						type="button"
						class="border-border bg-card/40 hover:border-foreground/30 hover:bg-card flex flex-col justify-between rounded-xl border p-6 text-left transition-all group"
						onclick={() => startQuiz(quiz)}
					>
						<div class="space-y-2">
							<div
								class="flex items-center justify-between text-xs text-muted-foreground font-mono"
							>
								<span>{quiz.category}</span>
								<span>{quiz.questions.length} questions</span>
							</div>
							<h2 class="text-base font-semibold tracking-tight group-hover:text-foreground">
								{quiz.title}
							</h2>
							<p class="text-muted-foreground text-sm leading-normal">
								{quiz.description}
							</p>
						</div>

						<div
							class="text-foreground/80 font-mono mt-6 flex items-center gap-1.5 text-xs font-medium"
						>
							Start quiz <span class="transition-transform group-hover:translate-x-0.5">→</span>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{:else if quizFinished}
		<!-- Completion Summary -->
		<div
			class="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-12"
			use:fadeIn
		>
			<div class="border-border bg-card/40 w-full rounded-2xl border p-8 text-center space-y-6">
				<div class="flex justify-center">
					<Face expression={faceExpression} {speaking} class="h-24 w-40" />
				</div>

				<div>
					<h2 class="scroll-m-20 text-2xl font-bold tracking-tight">Quiz Completed</h2>
					<p class="text-muted-foreground text-sm mt-2">
						You scored <span class="text-foreground font-mono font-semibold">{score}</span> of
						<span class="text-foreground font-mono font-semibold"
							>{selectedQuiz.questions.length}</span
						>
					</p>
				</div>

				<div
					class="rounded-xl border border-border bg-muted/40 p-4 text-xs font-mono text-muted-foreground"
				>
					Accuracy: {Math.round((score / selectedQuiz.questions.length) * 100)}%
				</div>

				<div class="flex gap-3 pt-2">
					<Button variant="outline" class="flex-1 gap-1.5 text-xs font-medium" onclick={resetQuiz}>
						<RotateCcw class="size-3.5" />
						Retry
					</Button>
					<Button class="flex-1 text-xs font-medium" onclick={backToCatalog}>All Quizzes</Button>
				</div>
			</div>
		</div>
	{:else if currentQuestion}
		<!-- Active Question View -->
		<div
			class="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-between gap-6 px-6 py-8"
			use:fadeIn
		>
			<div class="space-y-6">
				<!-- Progress Bar & Question Counter -->
				<div class="flex items-center justify-between text-xs text-muted-foreground font-mono">
					<span>Question {currentQuestionIndex + 1} of {selectedQuiz.questions.length}</span>
					<span>Score: {score}</span>
				</div>
				<div class="h-1 w-full overflow-hidden rounded-full bg-muted">
					<div
						class="h-full bg-foreground/80 transition-all duration-300"
						style="width: {((currentQuestionIndex + 1) / selectedQuiz.questions.length) * 100}%"
					></div>
				</div>

				<!-- Top Expression & Question Card -->
				<div class="flex items-center gap-5 border-b border-border/70 pb-6">
					<Face expression={faceExpression} {speaking} class="h-14 w-24 shrink-0" />
					<h2 class="scroll-m-20 text-lg font-semibold tracking-tight leading-snug">
						{currentQuestion.question}
					</h2>
				</div>

				<!-- Options Grid -->
				<div class="grid grid-cols-1 gap-3">
					{#each currentQuestion.options as option (option.id)}
						{@const isSelected = selectedOptionId === option.id}
						{@const isThisCorrect = option.id === currentQuestion.correctOptionId}
						<button
							type="button"
							disabled={isAnswerSubmitted}
							onclick={() => selectOption(option.id)}
							class={cn(
								'flex items-center justify-between rounded-xl border p-4 text-left text-sm transition-all',
								!isAnswerSubmitted &&
									isSelected &&
									'border-brand bg-brand/10 font-medium text-foreground ring-1 ring-brand/50',
								!isAnswerSubmitted &&
									!isSelected &&
									'border-border bg-card/40 hover:border-foreground/30 hover:bg-card',
								isAnswerSubmitted &&
									isThisCorrect &&
									'border-foreground/60 bg-muted/60 text-foreground font-medium',
								isAnswerSubmitted &&
									isSelected &&
									!isThisCorrect &&
									'border-destructive/60 bg-destructive/10 text-destructive',
								isAnswerSubmitted && !isSelected && !isThisCorrect && 'border-border/40 opacity-40'
							)}
						>
							<div class="flex items-center gap-3">
								<span
									class={cn(
										'flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-mono uppercase',
										isSelected
											? 'border-current text-foreground'
											: 'border-border text-muted-foreground'
									)}
								>
									{option.id}
								</span>
								<span>{option.text}</span>
							</div>

							{#if isAnswerSubmitted && isThisCorrect}
								<CheckCircle2 class="size-4 text-foreground" />
							{:else if isAnswerSubmitted && isSelected && !isThisCorrect}
								<XCircle class="size-4 text-destructive" />
							{/if}
						</button>
					{/each}
				</div>

				<!-- Explanation Box (revealed on submit) -->
				{#if isAnswerSubmitted}
					<div
						class="rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed"
						use:fadeIn
					>
						<span class="font-medium text-xs text-foreground block mb-1">
							{isCorrect ? 'Correct' : 'Explanation'}
						</span>
						<p class="text-muted-foreground text-sm">{currentQuestion.explanation}</p>
					</div>
				{/if}
			</div>

			<!-- Bottom Action Controls -->
			<div class="flex items-center justify-between border-t border-border/70 pt-4">
				<Button
					variant="ghost"
					size="sm"
					class="gap-1.5 text-xs text-muted-foreground font-mono"
					onclick={() => readAloud(currentQuestion.question)}
				>
					<Volume2 class="size-3.5" />
					Repeat
				</Button>

				{#if !isAnswerSubmitted}
					<Button
						disabled={!selectedOptionId}
						onclick={submitAnswer}
						class="px-6 text-xs font-medium"
					>
						Submit Answer
					</Button>
				{:else}
					<Button onclick={nextQuestion} class="px-6 text-xs font-medium">
						{currentQuestionIndex + 1 < selectedQuiz.questions.length
							? 'Next Question →'
							: 'View Results →'}
					</Button>
				{/if}
			</div>
		</div>
	{/if}
</div>

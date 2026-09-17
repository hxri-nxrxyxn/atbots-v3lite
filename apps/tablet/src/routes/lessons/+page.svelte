<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Lesson, LessonSection } from '@atbots/protocol';
	import { ChevronLeft, ChevronRight, CircleStop, Clock, Volume2 } from '@lucide/svelte';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { SAMPLE_LESSONS } from '$lib/data/education';
	import Face from '$lib/face/Face.svelte';
	import { fadeIn, staggerIn } from '$lib/motion';
	import { robot } from '$lib/state/robot.svelte';
	import { cn } from '$lib/utils';
	import { voice } from '$lib/voice';

	let selectedLesson = $state<Lesson | null>(null);
	let activeSectionIndex = $state(0);
	let speaking = $state(false);

	const activeSection = $derived(
		selectedLesson ? selectedLesson.sections[activeSectionIndex] : null
	);

	function openLesson(lesson: Lesson) {
		selectedLesson = lesson;
		activeSectionIndex = 0;
		robot.setExpression('curious');
		void readSection(lesson.sections[0]);
	}

	async function readSection(section: LessonSection | undefined | null) {
		if (!section) return;
		voice.stop();
		speaking = true;
		robot.setSpeaking(true);
		robot.setExpression('speaking');
		const textToSpeak = section.speechScript ?? section.content;
		await voice.speak(textToSpeak);
		speaking = false;
		robot.setSpeaking(false);
		robot.setExpression('listening');
	}

	function stopVoice() {
		voice.stop();
		speaking = false;
		robot.setSpeaking(false);
		robot.setExpression('neutral');
	}

	function selectSection(index: number) {
		if (!selectedLesson) return;
		activeSectionIndex = index;
		void readSection(selectedLesson.sections[index]);
	}

	function backToCatalog() {
		stopVoice();
		selectedLesson = null;
		robot.setExpression('neutral');
	}
</script>

<svelte:head>
	<title>AT Bots — Lessons</title>
</svelte:head>

<div class="flex h-full flex-col">
	<PageHeader
		title={selectedLesson ? selectedLesson.title : 'Lessons'}
		subtitle={selectedLesson
			? `Category: ${selectedLesson.category}`
			: 'Interactive reading & robot narration'}
		onBack={selectedLesson ? backToCatalog : undefined}
		backHref={resolve('/')}
	>
		{#snippet actions()}
			{#if speaking}
				<Button variant="outline" size="sm" class="gap-1.5 font-mono text-xs" onclick={stopVoice}>
					<CircleStop class="size-3.5" />
					Stop Voice
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<!-- Portrait Screen Layout -->
	<main
		class="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-between overflow-hidden px-6 py-6 gap-6"
	>
		{#if !selectedLesson}
			<!-- Lesson Catalog -->
			<div class="space-y-6 flex-1 overflow-y-auto" use:staggerIn>
				<div class="flex items-center gap-5 border-b border-border/70 pb-5">
					<Face expression="curious" class="h-14 w-24 shrink-0" />
					<div>
						<h2 class="text-xl font-bold tracking-tight text-foreground">Lesson Library</h2>
						<p class="text-muted-foreground text-xs leading-relaxed mt-0.5">
							Structured technical reading modules with synchronized voice narration.
						</p>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4">
					{#each SAMPLE_LESSONS as lesson (lesson.id)}
						<button
							type="button"
							class="border-border bg-card/40 hover:border-foreground/30 hover:bg-card flex flex-col justify-between rounded-xl border p-5 text-left transition-all group"
							onclick={() => openLesson(lesson)}
						>
							<div class="space-y-2">
								<div
									class="flex items-center justify-between text-xs text-muted-foreground font-mono"
								>
									<span>{lesson.category}</span>
									<span>{lesson.readingTimeMinutes} min</span>
								</div>

								<h3 class="text-base font-semibold tracking-tight group-hover:text-foreground">
									{lesson.title}
								</h3>
								<p class="text-muted-foreground text-xs leading-normal">
									{lesson.summary}
								</p>
							</div>

							<div
								class="text-foreground/80 font-mono mt-4 flex items-center gap-1.5 text-xs font-medium"
							>
								Open module <span class="transition-transform group-hover:translate-x-0.5">→</span>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<!-- Active Lesson Reader -->
			<div class="flex flex-1 flex-col justify-between gap-5 overflow-hidden" use:fadeIn>
				<div class="space-y-5 overflow-y-auto flex-1 pr-1">
					<!-- Section Switcher Tabs -->
					<div
						class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/70 no-scrollbar shrink-0"
					>
						{#each selectedLesson.sections as section, idx (section.heading)}
							{@const isActive = activeSectionIndex === idx}
							<button
								type="button"
								onclick={() => selectSection(idx)}
								class={cn(
									'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
									isActive
										? 'bg-secondary text-secondary-foreground border border-border/80 shadow-xs'
										: 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
								)}
							>
								<span class="font-mono text-[10px] opacity-70">0{idx + 1}</span>
								<span class="truncate max-w-[140px]">{section.heading}</span>
							</button>
						{/each}
					</div>

					<!-- Header Card with Face & Speak Button -->
					<div class="flex items-center justify-between border-b border-border/70 pb-4 shrink-0">
						<div class="flex items-center gap-4">
							<Face
								expression={speaking ? 'speaking' : 'listening'}
								{speaking}
								class="h-12 w-20 shrink-0"
							/>
							<div>
								<span class="text-muted-foreground font-mono text-[11px] block">
									Section {activeSectionIndex + 1} of {selectedLesson.sections.length}
								</span>
								<h2 class="text-lg font-bold tracking-tight text-foreground mt-0.5">
									{activeSection?.heading}
								</h2>
							</div>
						</div>

						{#if activeSection}
							<Button
								variant="outline"
								size="sm"
								class="gap-1.5 text-xs font-mono shrink-0"
								onclick={() => readSection(activeSection)}
							>
								<Volume2 class="size-3.5" />
								{speaking ? 'Replay' : 'Listen'}
							</Button>
						{/if}
					</div>

					<!-- Article Content -->
					{#if activeSection}
						<div class="space-y-5 py-2">
							<p class="text-foreground/90 text-sm leading-7 font-normal">
								{activeSection.content}
							</p>

							{#if activeSection.speechScript}
								<blockquote
									class="border-l-2 border-border pl-4 text-xs text-muted-foreground leading-relaxed italic"
								>
									"{activeSection.speechScript}"
								</blockquote>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Bottom Touch Navigation Footer -->
				<footer class="flex items-center justify-between border-t border-border/70 pt-4 shrink-0">
					<Button
						variant="outline"
						size="sm"
						class="gap-1.5 text-xs font-medium"
						disabled={activeSectionIndex === 0}
						onclick={() => selectSection(activeSectionIndex - 1)}
					>
						<ChevronLeft class="size-4" />
						Previous
					</Button>

					<span class="text-xs text-muted-foreground font-mono">
						{activeSectionIndex + 1} / {selectedLesson.sections.length}
					</span>

					{#if activeSectionIndex + 1 < selectedLesson.sections.length}
						<Button
							size="sm"
							class="gap-1.5 text-xs font-medium"
							onclick={() => selectSection(activeSectionIndex + 1)}
						>
							Next
							<ChevronRight class="size-4" />
						</Button>
					{:else}
						<Button
							size="sm"
							variant="secondary"
							class="text-xs font-medium"
							onclick={backToCatalog}
						>
							Complete Module
						</Button>
					{/if}
				</footer>
			</div>
		{/if}
	</main>
</div>

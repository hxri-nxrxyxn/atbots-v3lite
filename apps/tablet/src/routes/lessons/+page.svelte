<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Lesson, LessonSection } from '@atbots/protocol';
	import {
		ArrowLeft,
		BookOpen,
		ChevronLeft,
		ChevronRight,
		CircleStop,
		Clock,
		Volume2
	} from '@lucide/svelte';

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

<div class="flex min-h-dvh flex-col">
	<header class="border-border/70 flex items-center justify-between border-b px-6 py-3">
		<div class="flex items-center gap-3">
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={selectedLesson ? backToCatalog : undefined}
				href={selectedLesson ? undefined : resolve('/')}
				aria-label="Back"
			>
				<ArrowLeft class="size-4" />
			</Button>
			<div>
				<div class="text-sm font-semibold tracking-tight">
					{selectedLesson ? selectedLesson.title : 'Lessons'}
				</div>
				<p class="text-muted-foreground text-xs font-mono">
					{selectedLesson
						? `Category: ${selectedLesson.category}`
						: 'Interactive reading & robot narration'}
				</p>
			</div>
		</div>

		{#if speaking}
			<Button variant="outline" size="sm" class="gap-1.5 font-mono text-xs" onclick={stopVoice}>
				<CircleStop class="size-3.5" />
				Stop Voice
			</Button>
		{/if}
	</header>

	{#if !selectedLesson}
		<!-- Lesson Catalog -->
		<div class="mx-auto w-full max-w-4xl flex-1 space-y-10 px-6 py-10" use:staggerIn>
			<div class="flex items-center gap-6">
				<Face expression="curious" class="h-14 w-24 shrink-0" />
				<div>
					<h1 class="scroll-m-20 text-2xl font-bold tracking-tight">Lesson Library</h1>
					<p class="text-muted-foreground text-sm leading-relaxed mt-1">
						Structured technical reading modules with synchronized voice narration.
					</p>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				{#each SAMPLE_LESSONS as lesson (lesson.id)}
					<button
						type="button"
						class="border-border bg-card/40 hover:border-foreground/30 hover:bg-card flex flex-col justify-between rounded-xl border p-6 text-left transition-all group"
						onclick={() => openLesson(lesson)}
					>
						<div class="space-y-2">
							<div
								class="flex items-center justify-between text-xs text-muted-foreground font-mono"
							>
								<span>{lesson.category}</span>
								<span>{lesson.readingTimeMinutes} min</span>
							</div>

							<h2 class="text-base font-semibold tracking-tight group-hover:text-foreground">
								{lesson.title}
							</h2>
							<p class="text-muted-foreground text-sm leading-normal">
								{lesson.summary}
							</p>
						</div>

						<div
							class="text-foreground/80 font-mono mt-6 flex items-center gap-1.5 text-xs font-medium"
						>
							Open module <span class="transition-transform group-hover:translate-x-0.5">→</span>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{:else}
		<!-- Active Lesson Reader (Optimized for Tablet & Touch Dimensions) -->
		<div
			class="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-between gap-6 px-6 py-6"
			use:fadeIn
		>
			<div class="space-y-6">
				<!-- Section Horizontal Step Switcher -->
				<div
					class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/70 no-scrollbar"
				>
					{#each selectedLesson.sections as section, idx (section.heading)}
						{@const isActive = activeSectionIndex === idx}
						<button
							type="button"
							onclick={() => selectSection(idx)}
							class={cn(
								'flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all',
								isActive
									? 'bg-secondary text-secondary-foreground border border-border/80 shadow-xs'
									: 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
							)}
						>
							<span class="font-mono text-[10px] opacity-70">0{idx + 1}</span>
							<span class="truncate max-w-[200px]">{section.heading}</span>
						</button>
					{/each}
				</div>

				<!-- Header Card with Face & Speak Button -->
				<div class="flex items-center justify-between border-b border-border/70 pb-5">
					<div class="flex items-center gap-4">
						<Face
							expression={speaking ? 'speaking' : 'listening'}
							{speaking}
							class="h-12 w-20 shrink-0"
						/>
						<div>
							<span class="text-muted-foreground text-xs font-mono block">
								Section {activeSectionIndex + 1} of {selectedLesson.sections.length}
							</span>
							<h2 class="scroll-m-20 text-xl font-bold tracking-tight mt-0.5">
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
					<div class="space-y-6">
						<p class="text-foreground/90 text-base leading-8 font-normal">
							{activeSection.content}
						</p>

						{#if activeSection.speechScript}
							<blockquote
								class="border-l-2 border-border pl-4 text-sm text-muted-foreground leading-relaxed italic"
							>
								"{activeSection.speechScript}"
							</blockquote>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Bottom Touch Navigation Footer -->
			<footer class="flex items-center justify-between border-t border-border/70 pt-4">
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
					<Button size="sm" variant="secondary" class="text-xs font-medium" onclick={backToCatalog}>
						Complete Module
					</Button>
				{/if}
			</footer>
		</div>
	{/if}
</div>

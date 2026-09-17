<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Lesson, LessonSection } from '@atbots/protocol';
	import { ArrowLeft, BookOpen, ChevronRight, CircleStop, Clock, Volume2 } from '@lucide/svelte';

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
				<p class="text-muted-foreground text-xs">
					{selectedLesson
						? `Category: ${selectedLesson.category}`
						: 'Interactive reading & robot narration'}
				</p>
			</div>
		</div>

		{#if speaking}
			<Button variant="outline" size="sm" class="gap-1.5" onclick={stopVoice}>
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
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<span
									class="bg-muted text-foreground/80 rounded-md px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider font-mono"
								>
									{lesson.category}
								</span>
								<span class="text-muted-foreground flex items-center gap-1.5 text-xs font-mono">
									<Clock class="size-3" />
									{lesson.readingTimeMinutes} min
								</span>
							</div>

							<h2 class="text-lg font-semibold tracking-tight group-hover:text-foreground">
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
		<!-- Active Lesson Reader -->
		<div
			class="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-8 px-6 py-8 md:grid-cols-12"
			use:fadeIn
		>
			<!-- Section Navigation Sidebar -->
			<aside class="space-y-4 md:col-span-4">
				<div class="border-border/70 flex items-center gap-3 border-b pb-4">
					<Face
						expression={speaking ? 'speaking' : 'listening'}
						{speaking}
						class="h-10 w-16 shrink-0"
					/>
					<div class="text-xs">
						<span class="font-semibold tracking-tight text-foreground block">Contents</span>
						<span class="text-muted-foreground font-mono">
							{activeSectionIndex + 1} of {selectedLesson.sections.length} sections
						</span>
					</div>
				</div>

				<nav class="space-y-1">
					{#each selectedLesson.sections as section, idx (section.heading)}
						{@const isActive = activeSectionIndex === idx}
						<button
							type="button"
							onclick={() => selectSection(idx)}
							class={cn(
								'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors',
								isActive
									? 'bg-secondary font-medium text-secondary-foreground border border-border/80'
									: 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
							)}
						>
							<span class="truncate font-medium">{section.heading}</span>
							<ChevronRight class="size-3.5 opacity-50 shrink-0 ml-2" />
						</button>
					{/each}
				</nav>
			</aside>

			<!-- Main Article View -->
			<main class="space-y-8 md:col-span-8">
				{#if activeSection}
					<article class="space-y-6">
						<div class="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
							<h2 class="scroll-m-20 text-xl font-semibold tracking-tight">
								{activeSection.heading}
							</h2>
							<Button
								variant="outline"
								size="sm"
								class="gap-1.5 text-xs font-medium shrink-0"
								onclick={() => readSection(activeSection)}
							>
								<Volume2 class="size-3.5" />
								Listen
							</Button>
						</div>

						<div class="space-y-4 text-sm leading-7 text-foreground/90">
							<p>
								{activeSection.content}
							</p>
						</div>

						{#if activeSection.speechScript}
							<blockquote
								class="mt-6 border-l-2 border-border pl-4 italic text-sm text-muted-foreground"
							>
								<span
									class="not-italic font-semibold text-foreground text-xs uppercase tracking-wider block mb-1 font-mono"
								>
									Key Takeaway
								</span>
								"{activeSection.speechScript}"
							</blockquote>
						{/if}
					</article>

					<!-- Bottom Navigation Between Sections -->
					<footer class="flex items-center justify-between border-t border-border/70 pt-6">
						<Button
							variant="outline"
							size="sm"
							disabled={activeSectionIndex === 0}
							onclick={() => selectSection(activeSectionIndex - 1)}
						>
							Previous
						</Button>

						<div class="text-xs text-muted-foreground font-mono">
							{activeSectionIndex + 1} / {selectedLesson.sections.length}
						</div>

						{#if activeSectionIndex + 1 < selectedLesson.sections.length}
							<Button size="sm" onclick={() => selectSection(activeSectionIndex + 1)}>
								Next Section
							</Button>
						{:else}
							<Button size="sm" variant="secondary" onclick={backToCatalog}>Complete Lesson</Button>
						{/if}
					</footer>
				{/if}
			</main>
		</div>
	{/if}
</div>

<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Lesson, LessonSection } from '@atbots/protocol';
	import {
		ArrowLeft,
		BookOpen,
		ChevronRight,
		CircleStop,
		Clock,
		Sparkles,
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
	<title>AT Bots — Interactive Lessons</title>
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
				<div class="text-sm font-medium">
					{selectedLesson ? selectedLesson.title : 'Guided Lessons'}
				</div>
				<div class="text-muted-foreground text-xs">
					{selectedLesson
						? `Category: ${selectedLesson.category}`
						: 'Interactive STEM and robotics reading'}
				</div>
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
		<div class="mx-auto w-full max-w-4xl flex-1 space-y-8 px-6 py-8" use:staggerIn>
			<div class="flex items-center gap-5">
				<Face expression="curious" class="h-14 w-24 shrink-0" />
				<div>
					<h1 class="text-xl font-semibold">Guided Lesson Library</h1>
					<p class="text-muted-foreground mt-1 text-sm">
						Read along with the robot, or listen as each section is explained aloud.
					</p>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{#each SAMPLE_LESSONS as lesson (lesson.id)}
					<button
						type="button"
						class="border-border bg-card/40 hover:border-brand/50 hover:bg-card flex flex-col justify-between rounded-xl border p-6 text-left transition-all"
						onclick={() => openLesson(lesson)}
					>
						<div>
							<div class="flex items-center justify-between">
								<span
									class="bg-brand/15 text-brand rounded-md px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider"
								>
									{lesson.category}
								</span>
								<span class="text-muted-foreground flex items-center gap-1 text-xs font-mono">
									<Clock class="size-3" />
									{lesson.readingTimeMinutes} min read
								</span>
							</div>

							<h2 class="mt-4 text-base font-semibold">{lesson.title}</h2>
							<p class="text-muted-foreground mt-2 text-sm leading-relaxed">
								{lesson.summary}
							</p>
						</div>

						<div class="text-brand mt-6 flex items-center gap-1.5 text-xs font-medium">
							Open Lesson →
						</div>
					</button>
				{/each}
			</div>
		</div>
	{:else}
		<!-- Active Lesson Reader -->
		<div
			class="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-8 px-6 py-8 md:grid-cols-3"
			use:fadeIn
		>
			<!-- Section Navigation Sidebar -->
			<div class="space-y-4 md:col-span-1">
				<div class="border-border/70 flex items-center gap-3 border-b pb-4">
					<Face
						expression={speaking ? 'speaking' : 'listening'}
						{speaking}
						class="h-12 w-20 shrink-0"
					/>
					<div class="text-xs text-muted-foreground">
						<span class="font-medium text-foreground block">Lesson Reader</span>
						{speaking ? 'Speaking section aloud...' : 'Select a section below'}
					</div>
				</div>

				<div class="space-y-1.5">
					{#each selectedLesson.sections as section, idx (section.heading)}
						{@const isActive = activeSectionIndex === idx}
						<button
							type="button"
							onclick={() => selectSection(idx)}
							class={cn(
								'flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-xs transition-all',
								isActive
									? 'bg-brand/15 border-brand/40 border font-medium text-brand'
									: 'hover:bg-muted/40 text-muted-foreground hover:text-foreground'
							)}
						>
							<span class="truncate">{section.heading}</span>
							<ChevronRight class="size-3.5 opacity-60 shrink-0 ml-2" />
						</button>
					{/each}
				</div>
			</div>

			<!-- Main Content View -->
			<div class="space-y-6 md:col-span-2">
				{#if activeSection}
					<article class="border-border bg-card/40 rounded-2xl border p-8 space-y-6">
						<div class="flex items-center justify-between border-b border-border/70 pb-4">
							<h2 class="text-lg font-semibold">{activeSection.heading}</h2>
							<Button
								variant="ghost"
								size="sm"
								class="gap-1.5 text-xs text-muted-foreground"
								onclick={() => readSection(activeSection)}
							>
								<Volume2 class="size-4" />
								Listen Again
							</Button>
						</div>

						<p class="text-foreground/90 text-sm leading-relaxed whitespace-pre-line">
							{activeSection.content}
						</p>

						{#if activeSection.speechScript}
							<div
								class="rounded-xl border border-brand/20 bg-brand/5 p-4 text-xs text-muted-foreground leading-normal flex items-start gap-3"
							>
								<Sparkles class="size-4 text-brand shrink-0 mt-0.5" />
								<div>
									<span class="font-semibold text-brand block mb-0.5">Robot Voice Summary:</span>
									"{activeSection.speechScript}"
								</div>
							</div>
						{/if}
					</article>

					<!-- Bottom Navigation Between Sections -->
					<div class="flex items-center justify-between pt-2">
						<Button
							variant="outline"
							size="sm"
							disabled={activeSectionIndex === 0}
							onclick={() => selectSection(activeSectionIndex - 1)}
						>
							← Previous Section
						</Button>

						{#if activeSectionIndex + 1 < selectedLesson.sections.length}
							<Button size="sm" onclick={() => selectSection(activeSectionIndex + 1)}>
								Next Section →
							</Button>
						{:else}
							<Button size="sm" variant="secondary" onclick={backToCatalog}>✔ Finish Lesson</Button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

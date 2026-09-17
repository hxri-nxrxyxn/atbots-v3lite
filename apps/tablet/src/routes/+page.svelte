<script lang="ts">
	import { Gamepad2, GraduationCap, Hand, ListChecks, Settings, Sparkles } from '@lucide/svelte';
	import { onMount, type Component } from 'svelte';

	import type { Pathname } from '$app/types';

	import ModeTile from '$lib/components/ModeTile.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import Face from '$lib/face/Face.svelte';
	import { robot } from '$lib/state/robot.svelte';

	interface Mode {
		href: Pathname;
		title: string;
		description: string;
		icon: Component;
		primary?: boolean;
	}

	const modes: Mode[] = [
		{
			href: '/session',
			title: 'Speak with AI',
			description: 'Start a conversation',
			icon: Sparkles,
			primary: true
		},
		{ href: '/games', title: 'Games', description: 'Interactive activities', icon: Gamepad2 },
		{
			href: '/lessons',
			title: 'Lessons',
			description: 'Guided learning',
			icon: GraduationCap
		},
		{ href: '/quizzes', title: 'Quizzes', description: 'Test your knowledge', icon: ListChecks },
		{
			href: '/manual',
			title: 'Manual mode',
			description: 'Robot status and controls',
			icon: Hand
		},
		{ href: '/settings', title: 'Settings', description: 'Connection and voice', icon: Settings }
	];

	onMount(() => {
		if (robot.status === 'idle') robot.connect();
	});
</script>

<div class="flex min-h-dvh flex-col">
	<StatusBar />

	<div class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-8 py-10">
		<header class="flex items-center gap-5">
			<Face expression="neutral" class="h-14 w-24 shrink-0" />
			<div>
				<h1 class="text-2xl font-semibold tracking-tight">AT Bots</h1>
				<p class="text-muted-foreground text-sm">Interactive assistant · V3 Lite</p>
			</div>
		</header>

		<div class="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each modes as mode (mode.href)}
				<ModeTile
					href={mode.href}
					title={mode.title}
					description={mode.description}
					icon={mode.icon}
					primary={mode.primary}
				/>
			{/each}
		</div>

		<p class="text-muted-foreground text-center text-xs">
			Touch a mode to begin · Please use with adult supervision
		</p>
	</div>
</div>

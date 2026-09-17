<script lang="ts">
	import { Gamepad2, GraduationCap, Hand, ListChecks, Settings, Sparkles } from '@lucide/svelte';
	import { onMount, type Component } from 'svelte';

	import type { Pathname } from '$app/types';

	import ModeTile from '$lib/components/ModeTile.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import Face from '$lib/face/Face.svelte';
	import { fadeIn, staggerIn } from '$lib/motion';
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
			description: 'Interactive natural language session',
			icon: Sparkles,
			primary: true
		},
		{
			href: '/quizzes',
			title: 'Quizzes',
			description: 'Test your knowledge with immediate feedback',
			icon: ListChecks
		},
		{
			href: '/lessons',
			title: 'Lessons',
			description: 'Guided STEM & robotics reading modules',
			icon: GraduationCap
		},
		{
			href: '/games',
			title: 'Games',
			description: 'Tactile activities & memory training',
			icon: Gamepad2
		},
		{
			href: '/manual',
			title: 'Manual mode',
			description: 'Live robot control, telemetry & joints',
			icon: Hand
		},
		{
			href: '/settings',
			title: 'Settings',
			description: 'Robot link, voice engine & commissioning',
			icon: Settings
		}
	];

	onMount(() => {
		if (robot.status === 'idle') robot.connect();
	});
</script>

<svelte:head>
	<title>AT Bots — Home</title>
</svelte:head>

<div class="flex h-full flex-col overflow-hidden bg-background">
	<StatusBar />

	<!-- Scrollable Container: Top 40vh Hero Face + Peeking Tiles Below -->
	<div class="flex-1 overflow-y-auto">
		<!-- Top 40vh Hero Section (Canvas for 3D/Expressive Face) -->
		<section
			class="h-[38vh] min-h-[260px] max-h-[400px] border-b border-border/60 bg-gradient-to-b from-card/30 to-background flex flex-col items-center justify-center px-6 text-center select-none"
			use:fadeIn
		>
			<div class="flex justify-center mb-3">
				<Face
					expression={robot.expression}
					speaking={robot.speaking}
					class="h-36 w-60 drop-shadow-md"
				/>
			</div>
			<div>
				<h1 class="text-xl font-bold tracking-tight text-foreground">AT Bots Receptionist</h1>
				<p class="text-muted-foreground text-xs mt-0.5 font-mono">
					{robot.status === 'open' ? 'System Online · Touch to Interact' : 'Offline / Standby'}
				</p>
			</div>
		</section>

		<!-- Bottom Content Section: Tiles Flow Below and Peek into View -->
		<main class="mx-auto w-full max-w-2xl px-6 py-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xs font-semibold text-muted-foreground font-mono uppercase tracking-wider">
					Interactive Modules
				</h2>
				<span class="text-[11px] text-muted-foreground/70 font-mono">
					Scroll for all options ↓
				</span>
			</div>

			<!-- 2-Column Portrait Tiles -->
			<div class="grid grid-cols-2 gap-3.5" use:staggerIn>
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

			<footer
				class="border-t border-border/60 pt-6 pb-2 text-center text-[11px] text-muted-foreground font-mono"
			>
				Touch any module to begin · Physical kiosk engagement platform
			</footer>
		</main>
	</div>
</div>

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
			description: 'Hardware telemetry and status controls',
			icon: Hand
		},
		{
			href: '/settings',
			title: 'Settings',
			description: 'Robot link, voice engine, and commissioning',
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

<div class="flex h-full flex-col">
	<StatusBar />

	<!-- Portrait Kiosk Content Frame -->
	<main class="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-between px-6 py-8">
		<!-- Hero Branding & Face Header -->
		<header class="flex items-center gap-6 border-b border-border/70 pb-6" use:fadeIn>
			<Face expression={robot.expression} speaking={robot.speaking} class="h-20 w-32 shrink-0" />
			<div>
				<span
					class="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider block"
				>
					Receptionist & Host Platform
				</span>
				<h1 class="text-2xl font-bold tracking-tight text-foreground mt-0.5">Welcome to AT Bots</h1>
				<p class="text-muted-foreground text-xs mt-1 leading-relaxed">
					Touch any module below to start an interactive experience.
				</p>
			</div>
		</header>

		<!-- 2-Column Portrait Optimized Grid -->
		<div class="grid grid-cols-2 gap-4 py-6" use:staggerIn>
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

		<!-- Footer Notice -->
		<footer
			class="border-t border-border/70 pt-4 text-center text-[11px] text-muted-foreground font-mono"
		>
			Touch to begin · Supervised kiosk engagement platform
		</footer>
	</main>
</div>

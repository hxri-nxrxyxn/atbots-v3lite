<script lang="ts">
	import type { Pathname } from '$app/types';
	import {
		Activity,
		BookOpen,
		Bot,
		Clock,
		Coins,
		Hand,
		Navigation,
		PlugZap,
		ScrollText
	} from '@lucide/svelte';
	import type { Component } from 'svelte';

	import ModeTile from '$lib/components/ModeTile.svelte';
	import { fadeIn, staggerIn } from '$lib/motion';

	interface Mode {
		href: Pathname;
		title: string;
		description: string;
		icon: Component;
		primary?: boolean;
	}

	const local: Mode[] = [
		{
			href: '/connect',
			title: 'Connect',
			description: 'Pair with a robot',
			icon: PlugZap,
			primary: true
		},
		{
			href: '/drive',
			title: 'Drive',
			description: 'Hold-to-move teleoperation',
			icon: Navigation
		},
		{ href: '/gestures', title: 'Gestures', description: 'Expressions and sequences', icon: Hand },
		{
			href: '/script',
			title: 'Script Mode',
			description: 'Type it, the robot speaks it',
			icon: ScrollText
		},
		{
			href: '/telemetry',
			title: 'Telemetry',
			description: 'Battery, link, servo temps',
			icon: Activity
		}
	];

	const cloud: Mode[] = [
		{ href: '/fleet', title: 'Fleet', description: 'Robots and status', icon: Bot },
		{ href: '/content', title: 'Content', description: 'Knowledge and quizzes', icon: BookOpen },
		{ href: '/credits', title: 'Credits', description: 'Balance and usage', icon: Coins },
		{ href: '/sessions', title: 'Sessions', description: 'Recent conversations', icon: Clock }
	];
</script>

<svelte:head>
	<title>AT Bots — Operator</title>
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="border-border/70 flex items-center justify-between border-b px-6 py-4" use:fadeIn>
		<div class="flex items-center gap-3">
			<div class="bg-brand/15 text-brand flex size-8 items-center justify-center rounded-md">
				<Bot class="size-4" />
			</div>
			<div>
				<div class="text-sm leading-none font-medium">AT Bots</div>
				<div class="text-muted-foreground mt-1 text-xs">Operator console</div>
			</div>
		</div>
		<span class="text-muted-foreground text-xs">Local + Cloud</span>
	</header>

	<div class="mx-auto w-full max-w-5xl flex-1 space-y-10 px-6 py-8">
		<section>
			<h2 class="text-sm font-semibold tracking-tight text-foreground">Local Control</h2>
			<p class="text-muted-foreground text-xs mt-0.5">
				Direct WebSocket control plane with zero internet dependency.
			</p>
			<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" use:staggerIn>
				{#each local as mode (mode.href)}
					<ModeTile
						href={mode.href}
						title={mode.title}
						description={mode.description}
						icon={mode.icon}
						primary={mode.primary}
					/>
				{/each}
			</div>
		</section>

		<section>
			<h2 class="text-sm font-semibold tracking-tight text-foreground">Cloud Management</h2>
			<p class="text-muted-foreground text-xs mt-0.5">
				Fleet telemetry, knowledge bases, credits, and session history.
			</p>
			<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" use:staggerIn>
				{#each cloud as mode (mode.href)}
					<ModeTile
						href={mode.href}
						title={mode.title}
						description={mode.description}
						icon={mode.icon}
					/>
				{/each}
			</div>
		</section>
	</div>
</div>

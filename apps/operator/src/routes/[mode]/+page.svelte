<script lang="ts">
	import { page } from '$app/state';
	import {
		Activity,
		BookOpen,
		Bot,
		Clock,
		Coins,
		Hand,
		Navigation,
		PlugZap,
		ScrollText,
		Wrench
	} from '@lucide/svelte';
	import type { Component } from 'svelte';

	import ComingSoon from '$lib/components/ComingSoon.svelte';

	interface ModeInfo {
		title: string;
		description: string;
		icon: Component;
	}

	const MODES: Record<string, ModeInfo> = {
		connect: {
			title: 'Connect',
			description: 'Find and pair with a robot over the local network.',
			icon: PlugZap
		},
		drive: {
			title: 'Drive',
			description: 'Hold-to-move teleoperation with speed and stop controls.',
			icon: Navigation
		},
		gestures: {
			title: 'Gestures',
			description: 'Trigger expressions and motion sequences.',
			icon: Hand
		},
		script: {
			title: 'Script Mode',
			description: 'Type a line and have the robot speak it aloud.',
			icon: ScrollText
		},
		telemetry: {
			title: 'Telemetry',
			description: 'Battery, link latency, servo temperature and faults.',
			icon: Activity
		},
		fleet: {
			title: 'Fleet',
			description: 'Every robot, its status, version and last contact.',
			icon: Bot
		},
		content: {
			title: 'Content',
			description: 'Knowledge, lessons, quizzes and phrase libraries.',
			icon: BookOpen
		},
		credits: {
			title: 'Credits',
			description: 'Balance, burn rate and usage statements.',
			icon: Coins
		},
		sessions: {
			title: 'Sessions',
			description: 'Recent conversations and credit consumption.',
			icon: Clock
		}
	};

	const fallback: ModeInfo = {
		title: 'Not found',
		description: 'This section does not exist.',
		icon: Wrench
	};

	const info = $derived(MODES[page.params.mode ?? ''] ?? fallback);
</script>

<ComingSoon title={info.title} description={info.description} icon={info.icon} />

<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft, CircleStop, Play, RotateCcw, Trophy, Volume2, Zap } from '@lucide/svelte';

	import { Button } from '$lib/components/ui/button';
	import Face from '$lib/face/Face.svelte';
	import { fadeIn, staggerIn } from '$lib/motion';
	import { robot } from '$lib/state/robot.svelte';
	import { cn } from '$lib/utils';
	import { voice } from '$lib/voice';

	type GameState = 'idle' | 'demonstrating' | 'player_turn' | 'game_over' | 'victory';

	const PAD_IDS = [0, 1, 2, 3];
	const TARGET_ROUNDS = 5;

	let gameState = $state<GameState>('idle');
	let sequence = $state<number[]>([]);
	let playerStep = $state(0);
	let activeLitPad = $state<number | null>(null);
	let score = $state(0);
	let highScore = $state(0);
	let round = $state(1);
	let speaking = $state(false);

	const faceExpression = $derived(
		gameState === 'victory'
			? 'excited'
			: gameState === 'game_over'
				? 'sad'
				: gameState === 'demonstrating'
					? 'thinking'
					: gameState === 'player_turn'
						? 'curious'
						: 'neutral'
	);

	function startGame() {
		gameState = 'demonstrating';
		sequence = [];
		playerStep = 0;
		score = 0;
		round = 1;
		robot.setExpression('curious');
		void readAloud('Starting Memory Matrix. Watch the pattern and repeat the sequence.');
		setTimeout(() => nextRound(), 2000);
	}

	function nextRound() {
		gameState = 'demonstrating';
		playerStep = 0;
		const nextPad = Math.floor(Math.random() * 4);
		sequence = [...sequence, nextPad];
		void playSequenceAnimation();
	}

	async function playSequenceAnimation() {
		robot.setExpression('thinking');
		await new Promise((r) => setTimeout(r, 600));

		for (let i = 0; i < sequence.length; i++) {
			activeLitPad = sequence[i];
			await new Promise((r) => setTimeout(r, 450));
			activeLitPad = null;
			await new Promise((r) => setTimeout(r, 200));
		}

		gameState = 'player_turn';
		robot.setExpression('curious');
	}

	function handlePadPress(padId: number) {
		if (gameState !== 'player_turn') return;

		activeLitPad = padId;
		setTimeout(() => (activeLitPad = null), 200);

		if (padId === sequence[playerStep]) {
			playerStep += 1;
			score += 10;
			if (score > highScore) highScore = score;

			if (playerStep === sequence.length) {
				if (round >= TARGET_ROUNDS) {
					gameState = 'victory';
					robot.setExpression('excited');
					robot.playSequence('dance_1');
					void readAloud(
						`Outstanding! You mastered all ${TARGET_ROUNDS} levels with score ${score}!`
					);
				} else {
					round += 1;
					gameState = 'demonstrating';
					robot.setExpression('happy');
					setTimeout(() => nextRound(), 800);
				}
			}
		} else {
			gameState = 'game_over';
			robot.setExpression('sad');
			void readAloud(`Game over. You reached round ${round} with score ${score}. Try again!`);
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
</script>

<svelte:head>
	<title>AT Bots — Robot Memory Matrix</title>
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<!-- Top Navigation Header -->
	<header class="border-border/70 flex items-center justify-between border-b px-6 py-3">
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="icon-sm" href={resolve('/')} aria-label="Back to home">
				<ArrowLeft class="size-4" />
			</Button>
			<div>
				<div class="text-sm font-semibold tracking-tight">Memory Matrix</div>
				<p class="text-muted-foreground text-xs font-mono">Tactile sequence & memory training</p>
			</div>
		</div>

		{#if speaking}
			<Button variant="outline" size="sm" class="gap-1.5 font-mono text-xs" onclick={stopSpeaking}>
				<CircleStop class="size-3.5" />
				Stop Voice
			</Button>
		{/if}
	</header>

	<div
		class="mx-auto flex w-full max-w-xl flex-1 flex-col justify-between gap-6 px-6 py-8"
		use:fadeIn
	>
		<!-- Score & State Toolbar -->
		<div class="border-border bg-card/40 flex items-center justify-between rounded-xl border p-4">
			<div class="flex items-center gap-4">
				<Face expression={faceExpression} {speaking} class="h-12 w-20 shrink-0" />
				<div>
					<span class="text-muted-foreground font-mono text-[10px] uppercase tracking-wider block">
						Status
					</span>
					<span class="text-sm font-semibold font-mono tracking-tight text-foreground">
						{#if gameState === 'idle'}
							Ready
						{:else if gameState === 'demonstrating'}
							Watch Pattern...
						{:else if gameState === 'player_turn'}
							Your Turn ({playerStep}/{sequence.length})
						{:else if gameState === 'victory'}
							Victory!
						{:else}
							Game Over
						{/if}
					</span>
				</div>
			</div>

			<div class="flex items-center gap-6 text-right font-mono">
				<div>
					<span class="text-muted-foreground text-[10px] uppercase tracking-wider block">Round</span
					>
					<span class="text-sm font-bold">{round}/{TARGET_ROUNDS}</span>
				</div>
				<div>
					<span class="text-muted-foreground text-[10px] uppercase tracking-wider block">Score</span
					>
					<span class="text-sm font-bold text-brand">{score}</span>
				</div>
			</div>
		</div>

		<!-- 2x2 Matrix Game Board -->
		<div class="flex flex-1 items-center justify-center">
			<div class="grid grid-cols-2 gap-4 w-full max-w-xs aspect-square p-2">
				{#each PAD_IDS as padId (padId)}
					{@const isLit = activeLitPad === padId}
					<button
						type="button"
						disabled={gameState !== 'player_turn'}
						onclick={() => handlePadPress(padId)}
						class={cn(
							'flex items-center justify-center rounded-2xl border transition-all select-none outline-none font-mono text-lg font-bold aspect-square',
							!isLit &&
								'border-border/80 bg-card/40 hover:bg-card hover:border-foreground/30 active:scale-95',
							isLit &&
								'border-brand bg-brand/30 text-foreground ring-4 ring-brand/40 scale-95 shadow-xl',
							gameState !== 'player_turn' && !isLit && 'opacity-60 cursor-not-allowed'
						)}
						aria-label="Pad {padId + 1}"
					>
						<span
							class={cn(
								'transition-all',
								isLit ? 'text-brand font-black' : 'text-muted-foreground/60'
							)}
						>
							0{padId + 1}
						</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Bottom Action Footer -->
		<div class="flex items-center justify-between border-t border-border/70 pt-4">
			<div class="text-xs text-muted-foreground font-mono">
				Best Score: <span class="font-bold text-foreground">{highScore}</span>
			</div>

			{#if gameState === 'idle'}
				<Button onclick={startGame} class="gap-2 px-6 font-medium">
					<Play class="size-4" />
					Start Game
				</Button>
			{:else}
				<Button variant="outline" size="sm" onclick={startGame} class="gap-1.5 font-mono text-xs">
					<RotateCcw class="size-3.5" />
					Restart
				</Button>
			{/if}
		</div>
	</div>
</div>

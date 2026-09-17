<script lang="ts">
	import type { Expression } from '@atbots/protocol';
	import { gsap } from 'gsap';

	import { FACE_PARAMS } from './face-params';

	let {
		expression = 'neutral',
		speaking = false,
		class: className = ''
	}: { expression?: Expression; speaking?: boolean; class?: string } = $props();

	let blink = $state(1);
	let mouthAnim = $state(0);
	let driftX = $state(0);
	let driftY = $state(0);
	let svgEl = $state<SVGSVGElement | undefined>(undefined);

	// Plain JS numbers for animation targets
	let eyeOpen = $state(FACE_PARAMS.neutral.eyeOpen);
	let browYOffset = $state(FACE_PARAMS.neutral.browY);
	let browTilt = $state(FACE_PARAMS.neutral.browTilt);
	let mouthCurve = $state(FACE_PARAMS.neutral.mouthCurve);
	let mouthRestOpen = $state(FACE_PARAMS.neutral.mouthOpen);

	const prefersReducedMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	$effect(() => {
		const target = FACE_PARAMS[expression] ?? FACE_PARAMS.neutral;
		if (prefersReducedMotion) {
			eyeOpen = target.eyeOpen;
			browYOffset = target.browY;
			browTilt = target.browTilt;
			mouthCurve = target.mouthCurve;
			mouthRestOpen = target.mouthOpen;
			return;
		}

		const animObj = {
			eyeOpen,
			browY: browYOffset,
			browTilt,
			mouthCurve,
			mouthOpen: mouthRestOpen
		};

		const tween = gsap.to(animObj, {
			...target,
			duration: 0.4,
			ease: 'power2.out',
			overwrite: true,
			onUpdate: () => {
				eyeOpen = animObj.eyeOpen;
				browYOffset = animObj.browY;
				browTilt = animObj.browTilt;
				mouthCurve = animObj.mouthCurve;
				mouthRestOpen = animObj.mouthOpen;
			}
		});

		return () => {
			tween.kill();
		};
	});

	$effect(() => {
		if (!svgEl || prefersReducedMotion) return;
		const tween = gsap.from(svgEl, {
			autoAlpha: 0,
			scale: 0.96,
			duration: 0.6,
			ease: 'power2.out',
			clearProps: 'opacity,visibility,transform'
		});
		return () => tween.kill();
	});

	$effect(() => {
		let frame = 0;
		let last = performance.now();
		let nextBlinkAt = last + 2600 + Math.random() * 2400;
		let blinkUntil = 0;
		let mouthPhase = 0;
		let driftPhase = Math.random() * Math.PI * 2;

		const loop = (now: number) => {
			const dt = now - last;
			last = now;

			if (now >= nextBlinkAt && blinkUntil === 0) {
				blinkUntil = now + 150;
				nextBlinkAt = now + 2600 + Math.random() * 3400;
			}
			blink = now < blinkUntil ? 0.06 : 1;

			if (speaking) {
				mouthPhase += dt * 0.017;
				mouthAnim = 0.5 + 0.5 * Math.sin(mouthPhase);
			} else {
				mouthAnim = Math.max(0, mouthAnim - dt * 0.012);
			}

			driftPhase += dt * 0.0007;
			driftX = Math.sin(driftPhase) * 2.5;
			driftY = Math.cos(driftPhase * 0.7) * 1.5;

			frame = requestAnimationFrame(loop);
		};

		frame = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(frame);
	});

	const eyeRy = $derived(30 * eyeOpen * blink);
	const mouthOpen = $derived(Math.max(mouthRestOpen, speaking ? mouthAnim : 0));
	const mouthTop = $derived(-2 - mouthOpen * 16);
	const mouthBottom = $derived(mouthCurve * 12 + mouthOpen * 18);
	const mouthPath = $derived(`M -30 0 Q 0 ${mouthTop} 30 0 Q 0 ${mouthBottom} -30 0 Z`);

	const browY = $derived(28 + browYOffset);
</script>

<svg
	bind:this={svgEl}
	viewBox="0 0 240 150"
	class={className}
	role="img"
	aria-label="Robot face, expression: {expression}"
>
	<g class="fill-foreground">
		<ellipse cx="78" cy="62" rx="26" ry={eyeRy} />
		<ellipse cx="162" cy="62" rx="26" ry={eyeRy} />
	</g>

	<g class="fill-background">
		<circle cx={78 + driftX} cy={62 + driftY} r="9" />
		<circle cx={162 + driftX} cy={62 + driftY} r="9" />
	</g>

	<g class="stroke-foreground" fill="none" stroke-width="6" stroke-linecap="round">
		<line
			x1="58"
			y1={browY}
			x2="98"
			y2={browY}
			transform="rotate({browTilt} 78 {browY})"
		/>
		<line
			x1="142"
			y1={browY}
			x2="182"
			y2={browY}
			transform="rotate({-browTilt} 162 {browY})"
		/>
	</g>

	<path
		d={mouthPath}
		transform="translate(120 112)"
		class={speaking ? 'fill-brand' : 'fill-foreground'}
	/>
</svg>

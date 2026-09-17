import { gsap } from 'gsap';
import type { Action } from 'svelte/action';

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const CLEAR = 'opacity,visibility,transform';

export interface StaggerInOptions {
	/** Selector for the targets; defaults to the node's direct children. */
	selector?: string;
	y?: number;
	stagger?: number;
	duration?: number;
	delay?: number;
}

/** Stagger the node's children (or a scoped selector) into view. */
export const staggerIn: Action<HTMLElement, StaggerInOptions | undefined> = (node, options) => {
	const { selector, y = 14, stagger = 0.06, duration = 0.5, delay = 0 } = options ?? {};
	const mm = gsap.matchMedia();

	mm.add(MOTION_OK, () => {
		const targets = selector
			? gsap.utils.toArray<HTMLElement>(selector, node)
			: Array.from(node.children);
		if (targets.length === 0) return;
		gsap.from(targets, {
			y,
			autoAlpha: 0,
			duration,
			stagger,
			delay,
			ease: 'power2.out',
			clearProps: CLEAR
		});
	});

	return { destroy: () => mm.revert() };
};

export interface FadeInOptions {
	y?: number;
	duration?: number;
	delay?: number;
	scale?: number;
}

/** Fade and slide the node itself into view. */
export const fadeIn: Action<HTMLElement, FadeInOptions | undefined> = (node, options) => {
	const { y = 10, duration = 0.5, delay = 0, scale } = options ?? {};
	const mm = gsap.matchMedia();

	mm.add(MOTION_OK, () => {
		gsap.from(node, {
			y,
			scale,
			autoAlpha: 0,
			duration,
			delay,
			ease: 'power2.out',
			clearProps: CLEAR
		});
	});

	return { destroy: () => mm.revert() };
};

/** Subtle entrance for a newly added element. */
export const itemIn: Action<HTMLElement, undefined> = (node) => {
	const mm = gsap.matchMedia();
	mm.add(MOTION_OK, () => {
		gsap.from(node, {
			y: 8,
			autoAlpha: 0,
			duration: 0.35,
			ease: 'power2.out',
			clearProps: CLEAR
		});
	});
	return { destroy: () => mm.revert() };
};

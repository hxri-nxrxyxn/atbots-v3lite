import type { Expression } from '@atbots/protocol';

/** Parameters that define one expression. See Face.svelte for how they render. */
export interface FaceParams {
	/** Eyelid opening, 0 (closed) to ~1.3 (wide). */
	eyeOpen: number;
	/** Vertical brow offset in SVG units. */
	browY: number;
	/** Brow tilt in degrees; positive raises the inner ends. */
	browTilt: number;
	/** Mouth curvature, -1 (frown) to 1 (smile). */
	mouthCurve: number;
	/** Resting mouth opening, 0 to 1. */
	mouthOpen: number;
}

export const FACE_PARAMS: Record<Expression, FaceParams> = {
	neutral: { eyeOpen: 1, browY: 0, browTilt: 0, mouthCurve: 0.1, mouthOpen: 0 },
	happy: { eyeOpen: 0.82, browY: 1, browTilt: 0, mouthCurve: 1, mouthOpen: 0.05 },
	excited: { eyeOpen: 1.1, browY: 3, browTilt: 0, mouthCurve: 1, mouthOpen: 0.3 },
	curious: { eyeOpen: 1.05, browY: 3, browTilt: 6, mouthCurve: 0.35, mouthOpen: 0.05 },
	thinking: { eyeOpen: 0.7, browY: -1, browTilt: -8, mouthCurve: -0.25, mouthOpen: 0 },
	sad: { eyeOpen: 0.8, browY: -2, browTilt: 12, mouthCurve: -1, mouthOpen: 0 },
	surprised: { eyeOpen: 1.3, browY: 5, browTilt: 0, mouthCurve: 0, mouthOpen: 0.6 },
	confused: { eyeOpen: 0.9, browY: 1, browTilt: 14, mouthCurve: -0.4, mouthOpen: 0.1 },
	sleepy: { eyeOpen: 0.32, browY: -1, browTilt: 0, mouthCurve: -0.1, mouthOpen: 0 },
	listening: { eyeOpen: 1.05, browY: 1, browTilt: 0, mouthCurve: 0.25, mouthOpen: 0 },
	speaking: { eyeOpen: 1, browY: 0, browTilt: 0, mouthCurve: 0.3, mouthOpen: 0.3 },
	love: { eyeOpen: 0.85, browY: 2, browTilt: 0, mouthCurve: 1, mouthOpen: 0.1 }
};

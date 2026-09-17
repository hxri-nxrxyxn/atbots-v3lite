import {
	DEADMAN_MS,
	PROTOCOL_VERSION,
	TELEMETRY_MS,
	type ClientMessage,
	type DriveDirection,
	type EspEvent,
	type EspMessage,
	type Expression
} from '@atbots/protocol';

import type { EspLink, LinkStatus } from './esp-link';

export interface MockEspLinkOptions {
	ip?: string;
	heartbeatMs?: number;
	deadmanMs?: number;
	telemetryMs?: number;
	/** Simulated connect latency. */
	connectDelayMs?: number;
}

const TICK_MS = 50;

/**
 * In-process stand-in for the robot's ESP. Mirrors the firmware behaviour
 * (acks, telemetry, deadman stop) so apps and tests run without hardware.
 */
export class MockEspLink implements EspLink {
	#status: LinkStatus = 'idle';
	#tickTimer: ReturnType<typeof setInterval> | null = null;
	#connectTimer: ReturnType<typeof setTimeout> | null = null;

	#drive: DriveDirection = 'stop';
	#speed = 0;
	#expression: Expression = 'neutral';
	#speaking = false;

	#ticks = 0;
	#ticksSinceHb = 0;
	#seq = 0;

	#messageHandlers = new Set<(message: EspMessage) => void>();
	#statusHandlers = new Set<(status: LinkStatus) => void>();

	readonly #ip: string;
	readonly #deadmanMs: number;
	readonly #telemetryMs: number;
	readonly #connectDelayMs: number;

	constructor(options: MockEspLinkOptions = {}) {
		this.#ip = options.ip ?? '127.0.0.1';
		this.#deadmanMs = options.deadmanMs ?? DEADMAN_MS;
		this.#telemetryMs = options.telemetryMs ?? TELEMETRY_MS;
		this.#connectDelayMs = options.connectDelayMs ?? 0;
	}

	get status(): LinkStatus {
		return this.#status;
	}

	connect(): void {
		if (this.#status === 'open' || this.#status === 'connecting') return;
		this.#setStatus('connecting');
		this.#connectTimer = setTimeout(() => {
			this.#setStatus('open');
			this.#ticks = 0;
			this.#ticksSinceHb = 0;
			this.#emit({ t: 'hello', proto: PROTOCOL_VERSION, ip: this.#ip });
			this.#tickTimer = setInterval(() => this.#tick(), TICK_MS);
		}, this.#connectDelayMs);
	}

	disconnect(): void {
		if (this.#connectTimer) {
			clearTimeout(this.#connectTimer);
			this.#connectTimer = null;
		}
		if (this.#tickTimer) {
			clearInterval(this.#tickTimer);
			this.#tickTimer = null;
		}
		this.#setStatus('idle');
	}

	send(message: ClientMessage): void {
		if (this.#status !== 'open') return;

		switch (message.t) {
			case 'hb':
				this.#ticksSinceHb = 0;
				this.#emit({ t: 'hb_ack', seq: message.seq });
				return;
			case 'drive':
				this.#drive = message.dir;
				this.#speed = message.speed;
				this.#emit({ t: 'ack', cmd: 'drive' });
				return;
			case 'stop':
				this.#drive = 'stop';
				this.#speed = 0;
				this.#emit({ t: 'ack', cmd: 'stop' });
				return;
			case 'set_expression':
				this.#expression = message.value;
				this.#emit({ t: 'ack', cmd: 'set_expression' });
				return;
			case 'set_speaking':
				this.#speaking = message.value;
				this.#emit({ t: 'ack', cmd: 'set_speaking' });
				return;
			case 'script_say':
				this.#emit({ t: 'ack', cmd: 'script_say' });
				this.#emit({ t: 'event', event: 'say', detail: message.text });
				return;
			case 'play_sequence':
				this.#emit({ t: 'ack', cmd: 'play_sequence' });
				return;
			case 'home':
				this.#expression = 'neutral';
				this.#emit({ t: 'ack', cmd: 'home' });
				return;
			default:
				this.#emit({
					t: 'nack',
					reason: 'unknown_command',
					got: (message as { t: string }).t
				});
		}
	}

	onMessage(handler: (message: EspMessage) => void): () => void {
		this.#messageHandlers.add(handler);
		return () => this.#messageHandlers.delete(handler);
	}

	onStatus(handler: (status: LinkStatus) => void): () => void {
		this.#statusHandlers.add(handler);
		return () => this.#statusHandlers.delete(handler);
	}

	/** Test/dev helper: simulate a hardware event. */
	emitEvent(event: EspEvent, detail?: string): void {
		this.#emit({ t: 'event', event, detail });
	}

	#tick(): void {
		this.#ticks++;
		this.#ticksSinceHb++;

		if (this.#drive !== 'stop' && this.#ticksSinceHb * TICK_MS > this.#deadmanMs) {
			this.#drive = 'stop';
			this.#speed = 0;
			this.#emit({ t: 'event', event: 'deadman_stop' });
		}

		const telemetryTicks = Math.max(1, Math.round(this.#telemetryMs / TICK_MS));
		if (this.#ticks % telemetryTicks === 0) {
			this.#emit({
				t: 'telemetry',
				drive: this.#drive,
				speed: this.#speed,
				expression: this.#expression,
				speaking: this.#speaking,
				free: 25000,
				uptime_ms: this.#ticks * TICK_MS
			});
		}
	}

	#emit(message: EspMessage): void {
		for (const handler of this.#messageHandlers) handler(message);
	}

	#setStatus(status: LinkStatus): void {
		if (this.#status === status) return;
		this.#status = status;
		for (const handler of this.#statusHandlers) handler(status);
	}
}

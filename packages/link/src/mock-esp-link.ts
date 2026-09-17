import {
	DEADMAN_MS,
	PROTOCOL_VERSION,
	TELEMETRY_MS,
	type ClientMessage,
	type ClientTopic,
	type DriveDirection,
	type EspMessage,
	type EspTopic,
	type Expression,
	type ResAckMessage
} from '@atbots/protocol';

import type { EspLink, ExtractClientPayload, ExtractPayload, LinkStatus } from './esp-link';

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
 * In-process stand-in for the robot's ESP using standardized Topic & Payload
 * and correlated request handshakes.
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
	#reqId = 0;

	#messageHandlers = new Set<(message: EspMessage) => void>();
	#statusHandlers = new Set<(status: LinkStatus) => void>();
	#topicHandlers = new Map<string, Set<(payload: unknown, message: EspMessage) => void>>();

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
			this.#emit({
				topic: 'sys/hello',
				payload: { proto: PROTOCOL_VERSION, ip: this.#ip, robot_id: 'bot-001' }
			});
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

		switch (message.topic) {
			case 'sys/hb':
				this.#ticksSinceHb = 0;
				this.#emit({
					topic: 'res/hb_ack',
					payload: { seq: message.payload.seq },
					id: message.id
				});
				return;
			case 'cmd/drive':
				this.#drive = message.payload.dir;
				this.#speed = message.payload.speed;
				this.#emit({
					topic: 'res/ack',
					payload: { status: 'ok', cmd: 'cmd/drive' },
					id: message.id
				});
				return;
			case 'cmd/stop':
				this.#drive = 'stop';
				this.#speed = 0;
				this.#emit({
					topic: 'res/ack',
					payload: { status: 'ok', cmd: 'cmd/stop' },
					id: message.id
				});
				return;
			case 'cmd/expression':
				this.#expression = message.payload.value;
				this.#emit({
					topic: 'res/ack',
					payload: { status: 'ok', cmd: 'cmd/expression' },
					id: message.id
				});
				return;
			case 'cmd/speaking':
				this.#speaking = message.payload.value;
				this.#emit({
					topic: 'res/ack',
					payload: { status: 'ok', cmd: 'cmd/speaking' },
					id: message.id
				});
				return;
			case 'cmd/say':
				this.#emit({
					topic: 'res/ack',
					payload: { status: 'ok', cmd: 'cmd/say' },
					id: message.id
				});
				this.#emit({
					topic: 'event/say',
					payload: { text: message.payload.text }
				});
				return;
			case 'cmd/sequence':
				this.#emit({
					topic: 'res/ack',
					payload: { status: 'ok', cmd: 'cmd/sequence' },
					id: message.id
				});
				return;
			case 'cmd/home':
				this.#expression = 'neutral';
				this.#emit({
					topic: 'res/ack',
					payload: { status: 'ok', cmd: 'cmd/home' },
					id: message.id
				});
				return;
			default:
				this.#emit({
					topic: 'res/nack',
					payload: {
						status: 'error',
						reason: 'unknown_topic',
						got: (message as { topic: string }).topic
					},
					id: (message as { id?: string }).id
				});
		}
	}

	request<TTopic extends ClientTopic>(
		topic: TTopic,
		payload: ExtractClientPayload<TTopic>,
		timeoutMs = 3000
	): Promise<ResAckMessage['payload']> {
		return new Promise((resolve, reject) => {
			const id = `mock_req_${++this.#reqId}`;
			const message = { topic, payload, id, ts: Date.now() } as ClientMessage;

			const timer = setTimeout(() => {
				reject(new Error(`Timeout waiting for response to ${topic} (${id})`));
			}, timeoutMs);

			const unsub = this.onMessage((msg) => {
				if (msg.id === id && (msg.topic === 'res/ack' || msg.topic === 'res/nack')) {
					clearTimeout(timer);
					unsub();
					if (msg.topic === 'res/ack') {
						resolve(msg.payload);
					} else {
						reject(new Error(`Rejected: ${(msg.payload as { reason: string }).reason}`));
					}
				}
			});

			this.send(message);
		});
	}

	onMessage(handler: (message: EspMessage) => void): () => void {
		this.#messageHandlers.add(handler);
		return () => this.#messageHandlers.delete(handler);
	}

	onTopic<TTopic extends EspTopic>(
		topicPattern: TTopic | string,
		handler: (payload: ExtractPayload<TTopic>, message: EspMessage) => void
	): () => void {
		let handlers = this.#topicHandlers.get(topicPattern);
		if (!handlers) {
			handlers = new Set();
			this.#topicHandlers.set(topicPattern, handlers);
		}
		const untypedHandler = handler as (payload: unknown, message: EspMessage) => void;
		handlers.add(untypedHandler);

		return () => {
			handlers?.delete(untypedHandler);
			if (handlers?.size === 0) {
				this.#topicHandlers.delete(topicPattern);
			}
		};
	}

	onStatus(handler: (status: LinkStatus) => void): () => void {
		this.#statusHandlers.add(handler);
		return () => this.#statusHandlers.delete(handler);
	}

	#tick(): void {
		this.#ticks++;
		this.#ticksSinceHb++;

		if (this.#drive !== 'stop' && this.#ticksSinceHb * TICK_MS > this.#deadmanMs) {
			this.#drive = 'stop';
			this.#speed = 0;
			this.#emit({ topic: 'event/deadman', payload: { state: 'stopped' } });
		}

		const telemetryTicks = Math.max(1, Math.round(this.#telemetryMs / TICK_MS));
		if (this.#ticks % telemetryTicks === 0) {
			this.#emit({
				topic: 'telemetry',
				payload: {
					drive: this.#drive,
					speed: this.#speed,
					expression: this.#expression,
					speaking: this.#speaking,
					free: 25000,
					uptime_ms: this.#ticks * TICK_MS
				}
			});
		}
	}

	#emit(message: EspMessage): void {
		for (const handler of this.#messageHandlers) handler(message);

		// Dispatch to topic subscribers
		const exact = this.#topicHandlers.get(message.topic);
		if (exact) {
			for (const handler of exact) handler(message.payload, message);
		}

		const parts = message.topic.split('/');
		if (parts.length > 1) {
			const wildcard = `${parts[0]}/*`;
			const wildHandlers = this.#topicHandlers.get(wildcard);
			if (wildHandlers) {
				for (const handler of wildHandlers) handler(message.payload, message);
			}
		}
	}

	#setStatus(status: LinkStatus): void {
		if (this.#status === status) return;
		this.#status = status;
		for (const handler of this.#statusHandlers) handler(status);
	}
}

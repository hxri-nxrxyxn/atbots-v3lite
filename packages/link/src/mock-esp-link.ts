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
	type ResAckMessage,
	type ServoTelemetry,
	type TelemetryPayload
} from '@atbots/protocol';

import type {
	EspLink,
	ExtractClientPayload,
	ExtractPayload,
	LinkStatus,
	PacketTrace
} from './esp-link';

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
 * In-process stand-in for the robot's ESP with rich hardware simulation
 * (Cytron drive, Daly BMS, ST3215/ST3020 servos, RP2350 display, E-stop, Charger).
 */
export class MockEspLink implements EspLink {
	#status: LinkStatus = 'idle';
	#tickTimer: ReturnType<typeof setInterval> | null = null;
	#connectTimer: ReturnType<typeof setTimeout> | null = null;

	#drive: DriveDirection = 'stop';
	#speed = 0;
	#expression: Expression = 'neutral';
	#speaking = false;
	#estopActive = false;
	#chargerPresent = false;
	#tactilePressed = false;

	// Simulated 5-servo bus (Shoulders: ST3215, Elbows + Neck: ST3020)
	#servos: ServoTelemetry[] = [
		{
			id: 1,
			name: 'shoulder_left',
			model: 'ST3215',
			angleDeg: 0,
			tempC: 38,
			voltage: 11.8,
			torqueEnabled: true,
			fault: false
		},
		{
			id: 2,
			name: 'shoulder_right',
			model: 'ST3215',
			angleDeg: 0,
			tempC: 39,
			voltage: 11.8,
			torqueEnabled: true,
			fault: false
		},
		{
			id: 3,
			name: 'elbow_left',
			model: 'ST3020',
			angleDeg: 0,
			tempC: 34,
			voltage: 11.9,
			torqueEnabled: true,
			fault: false
		},
		{
			id: 4,
			name: 'elbow_right',
			model: 'ST3020',
			angleDeg: 0,
			tempC: 35,
			voltage: 11.9,
			torqueEnabled: true,
			fault: false
		},
		{
			id: 5,
			name: 'neck_pan',
			model: 'ST3020',
			angleDeg: 0,
			tempC: 32,
			voltage: 11.9,
			torqueEnabled: true,
			fault: false
		}
	];

	#ticks = 0;
	#ticksSinceHb = 0;
	#reqId = 0;
	#traceId = 0;

	#messageHandlers = new Set<(message: EspMessage) => void>();
	#statusHandlers = new Set<(status: LinkStatus) => void>();
	#traceHandlers = new Set<(trace: PacketTrace) => void>();
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
				payload: {
					proto: PROTOCOL_VERSION,
					ip: this.#ip,
					robot_id: 'bot-001',
					hardware: {
						board: 'ESP32-S3-DevKitC-1 v1.0',
						cpuFreqMhz: 240,
						freeHeap: 284000,
						flashSizeMb: 16
					}
				}
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
		this.#emitTrace('tx', message.topic, message.payload, message.id);

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
				this.#ticksSinceHb = 0;
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
				for (const servo of this.#servos) servo.angleDeg = 0;
				this.#emit({
					topic: 'res/ack',
					payload: { status: 'ok', cmd: 'cmd/home' },
					id: message.id
				});
				return;
			case 'cmd/debug/servo': {
				const s = this.#servos.find((x) => x.id === message.payload.id);
				if (s) {
					s.angleDeg = message.payload.targetAngle;
					s.torqueEnabled = message.payload.torque;
				}
				this.#emit({
					topic: 'res/ack',
					payload: { status: 'ok', cmd: 'cmd/debug/servo' },
					id: message.id
				});
				return;
			}
			case 'cmd/debug/estop':
				this.#estopActive = message.payload.active;
				if (this.#estopActive) {
					this.#drive = 'stop';
					this.#speed = 0;
				}
				this.#emit({
					topic: 'res/ack',
					payload: { status: 'ok', cmd: 'cmd/debug/estop' },
					id: message.id
				});
				this.#emit({
					topic: 'event/estop',
					payload: { state: this.#estopActive ? 'active' : 'cleared' }
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

	onTrace(handler: (trace: PacketTrace) => void): () => void {
		this.#traceHandlers.add(handler);
		return () => this.#traceHandlers.delete(handler);
	}

	#emitTrace(direction: 'tx' | 'rx', topic: string, payload: unknown, msgId?: string): void {
		const trace: PacketTrace = {
			id: `tr_${++this.#traceId}`,
			direction,
			topic,
			payload,
			msgId,
			ts: Date.now()
		};
		for (const handler of this.#traceHandlers) handler(trace);
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
			const pwm = this.#drive === 'stop' ? 0 : Math.round((this.#speed / 10) * 255);
			const isFwd = this.#drive === 'forward';

			const payload: TelemetryPayload = {
				drive: this.#drive,
				speed: this.#speed,
				expression: this.#expression,
				speaking: this.#speaking,
				free: 284000,
				uptime_ms: this.#ticks * TICK_MS,
				motors: {
					state: this.#drive,
					speed: this.#speed,
					pwmLeft: pwm,
					pwmRight: pwm,
					dirLeft: isFwd,
					dirRight: isFwd,
					estopActive: this.#estopActive,
					deadmanActive: this.#ticksSinceHb * TICK_MS > this.#deadmanMs
				},
				power: {
					packVoltage: 13.2,
					currentAmps: this.#drive === 'stop' ? 1.4 : 3.8,
					socPercent: 88,
					cellVoltages: [3.3, 3.3, 3.3, 3.3],
					packTempC: 31,
					chargerPresent: this.#chargerPresent,
					bmsStatus: this.#chargerPresent ? 'charging' : 'normal'
				},
				servos: this.#servos,
				display: {
					link: 'simulated',
					baud: 921600,
					fps: 60,
					heartbeatAck: true,
					currentExpression: this.#expression
				},
				io: {
					gpio10ChargerSense: this.#chargerPresent,
					gpio11EstopSense: this.#estopActive,
					gpio15TactileSensor: this.#tactilePressed,
					gpio16Spare: false
				}
			};

			this.#emit({
				topic: 'telemetry',
				payload
			});
		}
	}

	#emit(message: EspMessage): void {
		this.#emitTrace('rx', message.topic, message.payload, message.id);
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

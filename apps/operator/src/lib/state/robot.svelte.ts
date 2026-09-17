import {
	MockEspLink,
	WebSocketEspLink,
	type EspLink,
	type LinkStatus,
	type PacketTrace
} from '@atbots/link';
import {
	HEARTBEAT_MS,
	type DriveDirection,
	type EspMessage,
	type Expression,
	type TelemetryPayload
} from '@atbots/protocol';

import { config } from '../config';

export type RobotMode = 'mock' | 'esp';

export interface RobotEvent {
	event: string;
	detail?: string;
	at: number;
}

const MAX_EVENTS = 30;
const MAX_TRACES = 100;

/** Owns the operator's link to the robot, packet traces, and component diagnostics. */
class RobotStore {
	status = $state<LinkStatus>('idle');
	mode = $state<RobotMode>('mock');
	url = $state(config.espUrl);
	telemetry = $state<TelemetryPayload | null>(null);
	events = $state<RobotEvent[]>([]);
	estop = $state(false);

	// Live Signal & Packet Trace Inspector
	traces = $state<PacketTrace[]>([]);
	lastTxTopic = $state<string>('NIL');
	lastRxTopic = $state<string>('NIL');
	lastAckStatus = $state<string>('NIL');
	packetCountTx = $state(0);
	packetCountRx = $state(0);

	#link: EspLink = new MockEspLink();
	#unsubs: Array<() => void> = [];
	#heartbeat: ReturnType<typeof setInterval> | null = null;

	connect(): void {
		this.disconnect();
		this.status = 'connecting';

		const link = this.mode === 'esp' ? new WebSocketEspLink({ url: this.url }) : new MockEspLink();
		this.#link = link;
		this.#unsubs = [
			link.onStatus((status) => (this.status = status)),
			link.onMessage((message) => this.#onMessage(message))
		];

		if (link.onTrace) {
			this.#unsubs.push(link.onTrace((trace) => this.#onTrace(trace)));
		}

		link.connect();

		if (this.mode === 'mock') {
			this.#heartbeat = setInterval(
				() =>
					this.#link.send({
						topic: 'sys/hb',
						payload: { seq: Date.now() }
					}),
				HEARTBEAT_MS
			);
		}
	}

	disconnect(): void {
		for (const unsub of this.#unsubs) unsub();
		this.#unsubs = [];
		if (this.#heartbeat) {
			clearInterval(this.#heartbeat);
			this.#heartbeat = null;
		}
		this.#link.disconnect();
		this.status = 'idle';
		this.telemetry = null;
	}

	drive(dir: DriveDirection, speed: number): void {
		if (this.estop) return;
		this.#link.send({ topic: 'cmd/drive', payload: { dir, speed } });
	}

	stop(): void {
		this.#link.send({ topic: 'cmd/stop', payload: {} });
	}

	setExpression(value: Expression): void {
		this.#link.send({ topic: 'cmd/expression', payload: { value } });
	}

	setSpeaking(value: boolean): void {
		this.#link.send({ topic: 'cmd/speaking', payload: { value } });
	}

	playSequence(name: string): void {
		this.#link.send({ topic: 'cmd/sequence', payload: { name } });
	}

	home(): void {
		this.#link.send({ topic: 'cmd/home', payload: {} });
	}

	scriptSay(text: string): Promise<unknown> {
		return this.#link.request('cmd/say', { text });
	}

	testMotor(motor: 'left' | 'right' | 'both', pwm: number, dir: 'fwd' | 'rev') {
		this.#link.send({ topic: 'cmd/debug/motor', payload: { motor, pwm, dir } });
	}

	testServo(id: number, targetAngle: number, torque = true) {
		this.#link.send({ topic: 'cmd/debug/servo', payload: { id, targetAngle, torque } });
	}

	toggleEstop(): void {
		this.estop = !this.estop;
		if (this.estop) this.#link.send({ topic: 'cmd/stop', payload: {} });
		this.#link.send({ topic: 'cmd/debug/estop', payload: { active: this.estop } });
	}

	clearTraces(): void {
		this.traces = [];
	}

	#onTrace(trace: PacketTrace): void {
		if (trace.direction === 'tx') {
			this.packetCountTx += 1;
			this.lastTxTopic = trace.topic;
		} else {
			this.packetCountRx += 1;
			this.lastRxTopic = trace.topic;
			if (trace.topic === 'res/ack') {
				this.lastAckStatus = 'ACK: OK';
			} else if (trace.topic === 'res/nack') {
				this.lastAckStatus = `NACK: ${(trace.payload as { reason?: string })?.reason ?? 'ERR'}`;
			}
		}

		this.traces = [trace, ...this.traces].slice(0, MAX_TRACES);
	}

	#onMessage(message: EspMessage): void {
		if (message.topic === 'telemetry') {
			this.telemetry = message.payload;
			return;
		}
		if (message.topic.startsWith('event/')) {
			const eventType = message.topic.replace('event/', '');
			const detail =
				'text' in message.payload
					? String(message.payload.text)
					: 'state' in message.payload
						? String(message.payload.state)
						: undefined;

			this.events = [{ event: eventType, detail, at: Date.now() }, ...this.events].slice(
				0,
				MAX_EVENTS
			);
		}
	}
}

export const robot = new RobotStore();

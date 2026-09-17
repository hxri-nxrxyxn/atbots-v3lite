import { MockEspLink, WebSocketEspLink, type EspLink, type LinkStatus } from '@atbots/link';
import {
	HEARTBEAT_MS,
	type DriveDirection,
	type EspMessage,
	type Expression
} from '@atbots/protocol';

import { config } from '../config';

type Telemetry = Extract<EspMessage, { t: 'telemetry' }>;

export type RobotMode = 'mock' | 'esp';

export interface RobotEvent {
	event: string;
	detail?: string;
	at: number;
}

const MAX_EVENTS = 30;

/** Owns the operator's link to the robot and mirrors its state. */
class RobotStore {
	status = $state<LinkStatus>('idle');
	mode = $state<RobotMode>('mock');
	url = $state(config.espUrl);
	telemetry = $state<Telemetry | null>(null);
	events = $state<RobotEvent[]>([]);
	estop = $state(false);

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
		link.connect();

		// WebSocketEspLink heartbeats itself; the mock needs the app to do it.
		if (this.mode === 'mock') {
			this.#heartbeat = setInterval(
				() => this.#link.send({ t: 'hb', seq: Date.now() }),
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
		this.#link.send({ t: 'drive', dir, speed });
	}

	stop(): void {
		this.#link.send({ t: 'stop' });
	}

	setExpression(value: Expression): void {
		this.#link.send({ t: 'set_expression', value });
	}

	setSpeaking(value: boolean): void {
		this.#link.send({ t: 'set_speaking', value });
	}

	playSequence(name: string): void {
		this.#link.send({ t: 'play_sequence', name });
	}

	home(): void {
		this.#link.send({ t: 'home' });
	}

	scriptSay(text: string): void {
		this.#link.send({ t: 'script_say', text });
	}

	toggleEstop(): void {
		this.estop = !this.estop;
		if (this.estop) this.#link.send({ t: 'stop' });
	}

	#onMessage(message: EspMessage): void {
		if (message.t === 'telemetry') {
			this.telemetry = message;
			return;
		}
		if (message.t === 'event') {
			this.events = [
				{ event: message.event, detail: message.detail, at: Date.now() },
				...this.events
			].slice(0, MAX_EVENTS);
		}
	}
}

export const robot = new RobotStore();

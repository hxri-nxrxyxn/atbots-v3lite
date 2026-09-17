import { MockEspLink, WebSocketEspLink, type EspLink, type LinkStatus } from '@atbots/link';
import type { DriveDirection, EspMessage, Expression } from '@atbots/protocol';

import { config } from '../config';
import { voice } from '../voice';

type Telemetry = Extract<EspMessage, { t: 'telemetry' }>;

export type RobotMode = 'mock' | 'esp';

export interface RobotEvent {
	event: string;
	detail?: string;
	at: number;
}

const MAX_EVENTS = 20;

/** Owns the link to the robot's ESP and mirrors its telemetry. */
class RobotStore {
	status = $state<LinkStatus>('idle');
	mode = $state<RobotMode>('mock');
	url = $state(config.espUrl);
	telemetry = $state<Telemetry | null>(null);
	events = $state<RobotEvent[]>([]);
	/** Locally driven face state (immediate, not waiting on telemetry echo). */
	expression = $state<Expression>('neutral');
	speaking = $state(false);

	#link: EspLink = new MockEspLink();
	#unsubs: Array<() => void> = [];
	#announceToken = 0;

	connect(): void {
		this.#detach();
		this.status = 'connecting';

		const link = this.mode === 'esp' ? new WebSocketEspLink({ url: this.url }) : new MockEspLink();
		this.#link = link;
		this.#unsubs = [
			link.onStatus((status) => (this.status = status)),
			link.onMessage((message) => this.#onMessage(message))
		];
		link.connect();
	}

	disconnect(): void {
		this.#detach();
		this.status = 'idle';
		this.telemetry = null;
	}

	setExpression(value: Expression): void {
		this.expression = value;
		this.#link.send({ t: 'set_expression', value });
	}

	setSpeaking(value: boolean): void {
		this.speaking = value;
		this.#link.send({ t: 'set_speaking', value });
	}

	playSequence(name: string): void {
		this.#link.send({ t: 'play_sequence', name });
	}

	home(): void {
		this.#link.send({ t: 'home' });
	}

	drive(dir: DriveDirection, speed: number): void {
		this.#link.send({ t: 'drive', dir, speed });
	}

	stop(): void {
		this.#link.send({ t: 'stop' });
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
			if (message.event === 'say' && message.detail) {
				void this.#announce(message.detail);
			}
		}
	}

	/** Script Mode: the operator typed a line; the tablet speaks it. */
	async #announce(text: string): Promise<void> {
		const token = ++this.#announceToken;
		voice.stop();
		this.setSpeaking(true);
		this.setExpression('speaking');
		await voice.speak(text);
		if (token !== this.#announceToken) return;
		this.setSpeaking(false);
		this.setExpression('neutral');
	}

	#detach(): void {
		for (const unsub of this.#unsubs) unsub();
		this.#unsubs = [];
		this.#link.disconnect();
	}
}

export const robot = new RobotStore();

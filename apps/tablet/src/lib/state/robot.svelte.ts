import { MockEspLink, WebSocketEspLink, type EspLink, type LinkStatus } from '@atbots/link';
import type { DriveDirection, EspMessage, Expression } from '@atbots/protocol';

import { config } from '../config';
import { voice } from '../voice';

type Telemetry = Extract<EspMessage, { topic: 'telemetry' }>['payload'];

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
			link.onMessage((message) => this.#onMessage(message)),
			link.onTopic('event/say', (payload) => {
				if (payload.text) {
					void this.#announce(payload.text);
				}
			})
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
		this.#link.send({ topic: 'cmd/expression', payload: { value } });
	}

	setSpeaking(value: boolean): void {
		this.speaking = value;
		this.#link.send({ topic: 'cmd/speaking', payload: { value } });
	}

	playSequence(name: string): void {
		this.#link.send({ topic: 'cmd/sequence', payload: { name } });
	}

	home(): void {
		this.#link.send({ topic: 'cmd/home', payload: {} });
	}

	drive(dir: DriveDirection, speed: number): void {
		this.#link.send({ topic: 'cmd/drive', payload: { dir, speed } });
	}

	stop(): void {
		this.#link.send({ topic: 'cmd/stop', payload: {} });
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

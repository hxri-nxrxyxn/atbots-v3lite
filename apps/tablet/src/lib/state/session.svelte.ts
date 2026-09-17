import { RelayClient, type LinkStatus } from '@atbots/link';
import type { Expression, RelayServerMessage } from '@atbots/protocol';

import { config } from '../config';
import { recognizer } from '../speech';
import { voice } from '../voice';
import { robot } from './robot.svelte';

export type SessionPhase = 'idle' | 'starting' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface ChatMessage {
	id: number;
	role: 'user' | 'assistant';
	text: string;
}

/** Drives one visitor conversation: relay, speech in, speech out, robot motion. */
class SessionStore {
	phase = $state<SessionPhase>('idle');
	messages = $state<ChatMessage[]>([]);
	error = $state<string | null>(null);
	relayStatus = $state<LinkStatus>('idle');
	relayUrl = $state(config.relayUrl);
	listening = $state(false);
	readonly micAvailable = recognizer.available;

	#relay: RelayClient;
	#nextId = 1;

	constructor() {
		this.#relay = this.#createRelay();
	}

	setRelayUrl(url: string): void {
		this.relayUrl = url;
		this.#relay.close();
		this.#relay = this.#createRelay();
	}

	start(): void {
		this.messages = [];
		this.error = null;
		this.phase = 'starting';
		if (robot.status !== 'open') robot.connect();
		this.#relay.connect();
		this.#relay.startSession(config.robotId, 'standard');
	}

	end(): void {
		this.stopListening();
		voice.stop();
		this.#relay.endSession();
		this.#relay.close();
		robot.setSpeaking(false);
		robot.setExpression('neutral');
		this.phase = 'idle';
	}

	sendText(text: string): void {
		const trimmed = text.trim();
		if (!trimmed) return;
		this.#relay.sendText(trimmed);
	}

	stopSpeaking(): void {
		voice.stop();
		robot.setSpeaking(false);
		if (this.phase === 'speaking') this.#toListening();
	}

	toggleListening(): void {
		if (this.listening) {
			this.stopListening();
			return;
		}
		this.listening = true;
		robot.setExpression('listening');
		recognizer.start({
			onResult: (text) => this.sendText(text),
			onEnd: () => (this.listening = false),
			onError: (error) => {
				this.listening = false;
				this.error = `Speech recognition: ${error}`;
			}
		});
	}

	stopListening(): void {
		if (!this.listening) return;
		recognizer.stop();
		this.listening = false;
	}

	setVoice(uri: string | null): void {
		voice.setVoice(uri);
	}

	voices(): SpeechSynthesisVoice[] {
		return voice.voices();
	}

	testVoice(): void {
		void voice.speak('Hello, I am the AT Bots assistant.');
	}

	#createRelay(): RelayClient {
		const relay = new RelayClient({ url: this.relayUrl });
		relay.onStatus((status) => (this.relayStatus = status));
		relay.onMessage((message) => this.#onRelay(message));
		return relay;
	}

	#onRelay(message: RelayServerMessage): void {
		switch (message.t) {
			case 'session.started':
				this.phase = 'listening';
				robot.setExpression('listening');
				break;
			case 'transcript.final':
				this.#push('user', message.text);
				this.phase = 'thinking';
				robot.setExpression('thinking');
				break;
			case 'reply.chunk':
				this.#push('assistant', message.text);
				void this.#speak(message.text);
				break;
			case 'tool.call':
				this.#handleTool(message.tool, message.args);
				break;
			case 'session.error':
				this.error = message.reason;
				this.phase = 'error';
				break;
			case 'session.ended':
				if (this.phase !== 'speaking') this.#toListening();
				break;
			case 'transcript.partial':
				break;
		}
	}

	#handleTool(tool: string, args: Record<string, unknown>): void {
		if (tool === 'set_expression' && typeof args.emotion === 'string') {
			robot.setExpression(args.emotion as Expression);
		} else if (tool === 'play_sequence' && typeof args.name === 'string') {
			robot.playSequence(args.name);
		}
	}

	async #speak(text: string): Promise<void> {
		this.phase = 'speaking';
		robot.setSpeaking(true);
		robot.setExpression('speaking');
		await voice.speak(text);
		robot.setSpeaking(false);
		if (this.phase === 'speaking') this.#toListening();
	}

	#toListening(): void {
		this.phase = 'listening';
		robot.setExpression('listening');
	}

	#push(role: 'user' | 'assistant', text: string): void {
		this.messages = [...this.messages, { id: this.#nextId++, role, text }];
	}
}

export const session = new SessionStore();

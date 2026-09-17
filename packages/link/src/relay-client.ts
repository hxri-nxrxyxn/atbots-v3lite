import type { RelayClientMessage, RelayServerMessage, Tier } from '@atbots/protocol';

import type { LinkStatus } from './esp-link';

export interface RelayClientOptions {
	url: string;
	WebSocketImpl?: typeof WebSocket;
}

/** WebSocket client for the streaming relay (AI sessions). */
export class RelayClient {
	#status: LinkStatus = 'idle';
	#ws: WebSocket | null = null;
	#sessionId: string | null = null;

	#messageHandlers = new Set<(message: RelayServerMessage) => void>();
	#statusHandlers = new Set<(status: LinkStatus) => void>();

	readonly #url: string;
	readonly #WebSocketImpl: typeof WebSocket;

	constructor(options: RelayClientOptions) {
		this.#url = options.url;
		this.#WebSocketImpl = options.WebSocketImpl ?? WebSocket;
	}

	get status(): LinkStatus {
		return this.#status;
	}

	get sessionId(): string | null {
		return this.#sessionId;
	}

	connect(): void {
		if (this.#status === 'open' || this.#status === 'connecting') return;
		this.#setStatus('connecting');

		const ws = new this.#WebSocketImpl(this.#url);
		this.#ws = ws;

		ws.onopen = () => this.#setStatus('open');
		ws.onerror = () => this.#setStatus('error');
		ws.onclose = () => {
			this.#ws = null;
			this.#sessionId = null;
			this.#setStatus('closed');
		};
		ws.onmessage = (event: MessageEvent) => {
			let parsed: unknown;
			try {
				parsed = JSON.parse(String(event.data));
			} catch {
				return;
			}
			if (!isRelayMessage(parsed)) return;
			if (parsed.t === 'session.started') this.#sessionId = parsed.sessionId;
			if (parsed.t === 'session.ended') this.#sessionId = null;
			for (const handler of this.#messageHandlers) handler(parsed);
		};
	}

	close(): void {
		this.#ws?.close();
		this.#ws = null;
		this.#sessionId = null;
		this.#setStatus('idle');
	}

	startSession(robotId: string, tier: Tier = 'standard'): void {
		this.#send({ t: 'session.start', robotId, tier });
	}

	sendText(text: string): void {
		this.#send({ t: 'user.text', text });
	}

	endSession(): void {
		this.#send({ t: 'session.end' });
	}

	onMessage(handler: (message: RelayServerMessage) => void): () => void {
		this.#messageHandlers.add(handler);
		return () => this.#messageHandlers.delete(handler);
	}

	onStatus(handler: (status: LinkStatus) => void): () => void {
		this.#statusHandlers.add(handler);
		return () => this.#statusHandlers.delete(handler);
	}

	#send(message: RelayClientMessage): void {
		if (this.#ws && this.#status === 'open') {
			this.#ws.send(JSON.stringify(message));
		}
	}

	#setStatus(status: LinkStatus): void {
		if (this.#status === status) return;
		this.#status = status;
		for (const handler of this.#statusHandlers) handler(status);
	}
}

const RELAY_TYPES = new Set([
	'session.started',
	'transcript.partial',
	'transcript.final',
	'reply.chunk',
	'tool.call',
	'session.error',
	'session.ended'
]);

function isRelayMessage(value: unknown): value is RelayServerMessage {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { t?: unknown }).t === 'string' &&
		RELAY_TYPES.has((value as { t: string }).t)
	);
}

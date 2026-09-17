import {
	HEARTBEAT_MS,
	parseEspMessage,
	type ClientMessage,
	type EspMessage
} from '@atbots/protocol';

import type { EspLink, LinkStatus } from './esp-link';

export interface WebSocketEspLinkOptions {
	url: string;
	heartbeatMs?: number;
	autoReconnect?: boolean;
	reconnectDelayMs?: number;
	/** Injectable for tests / non-browser runtimes. */
	WebSocketImpl?: typeof WebSocket;
}

export class WebSocketEspLink implements EspLink {
	#status: LinkStatus = 'idle';
	#ws: WebSocket | null = null;
	#heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	#reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	#manualClose = false;
	#seq = 0;
	#queue: ClientMessage[] = [];

	#messageHandlers = new Set<(message: EspMessage) => void>();
	#statusHandlers = new Set<(status: LinkStatus) => void>();

	readonly #url: string;
	readonly #heartbeatMs: number;
	readonly #autoReconnect: boolean;
	readonly #reconnectDelayMs: number;
	readonly #WebSocketImpl: typeof WebSocket;

	constructor(options: WebSocketEspLinkOptions) {
		this.#url = options.url;
		this.#heartbeatMs = options.heartbeatMs ?? HEARTBEAT_MS;
		this.#autoReconnect = options.autoReconnect ?? true;
		this.#reconnectDelayMs = options.reconnectDelayMs ?? 2000;
		this.#WebSocketImpl = options.WebSocketImpl ?? WebSocket;
	}

	get status(): LinkStatus {
		return this.#status;
	}

	connect(): void {
		if (this.#status === 'open' || this.#status === 'connecting') return;
		this.#manualClose = false;
		this.#setStatus('connecting');

		const ws = new this.#WebSocketImpl(this.#url);
		this.#ws = ws;

		ws.onopen = () => {
			this.#setStatus('open');
			this.#startHeartbeat();
			for (const message of this.#queue.splice(0)) {
				ws.send(JSON.stringify(message));
			}
		};

		ws.onmessage = (event: MessageEvent) => {
			const message = parseEspMessage(event.data);
			if (message) {
				for (const handler of this.#messageHandlers) handler(message);
			}
		};

		ws.onerror = () => {
			this.#setStatus('error');
		};

		ws.onclose = () => {
			this.#stopHeartbeat();
			this.#ws = null;
			this.#setStatus('closed');
			if (this.#autoReconnect && !this.#manualClose) {
				this.#reconnectTimer = setTimeout(() => this.connect(), this.#reconnectDelayMs);
			}
		};
	}

	disconnect(): void {
		this.#manualClose = true;
		this.#stopHeartbeat();
		if (this.#reconnectTimer) {
			clearTimeout(this.#reconnectTimer);
			this.#reconnectTimer = null;
		}
		this.#ws?.close();
		this.#ws = null;
		this.#setStatus('idle');
	}

	send(message: ClientMessage): void {
		if (this.#ws && this.#status === 'open') {
			this.#ws.send(JSON.stringify(message));
			return;
		}
		// Heartbeats are only meaningful while connected; queue the rest.
		if (message.t !== 'hb') {
			this.#queue.push(message);
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

	#startHeartbeat(): void {
		this.#stopHeartbeat();
		this.#heartbeatTimer = setInterval(() => {
			this.send({ t: 'hb', seq: ++this.#seq });
		}, this.#heartbeatMs);
	}

	#stopHeartbeat(): void {
		if (this.#heartbeatTimer) {
			clearInterval(this.#heartbeatTimer);
			this.#heartbeatTimer = null;
		}
	}

	#setStatus(status: LinkStatus): void {
		if (this.#status === status) return;
		this.#status = status;
		for (const handler of this.#statusHandlers) handler(status);
	}
}

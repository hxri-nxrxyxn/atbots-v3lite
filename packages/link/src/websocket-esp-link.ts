import {
	HEARTBEAT_MS,
	parseEspMessage,
	type ClientMessage,
	type ClientTopic,
	type EspMessage,
	type EspTopic,
	type ResAckMessage
} from '@atbots/protocol';

import type { EspLink, ExtractClientPayload, ExtractPayload, LinkStatus } from './esp-link';

export interface WebSocketEspLinkOptions {
	url: string;
	heartbeatMs?: number;
	autoReconnect?: boolean;
	reconnectDelayMs?: number;
	/** Injectable for tests / non-browser runtimes. */
	WebSocketImpl?: typeof WebSocket;
}

interface PendingRequest {
	resolve: (value: ResAckMessage['payload']) => void;
	reject: (reason: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

export class WebSocketEspLink implements EspLink {
	#status: LinkStatus = 'idle';
	#ws: WebSocket | null = null;
	#heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	#reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	#manualClose = false;
	#seq = 0;
	#reqId = 0;
	#queue: ClientMessage[] = [];

	#pendingRequests = new Map<string, PendingRequest>();
	#messageHandlers = new Set<(message: EspMessage) => void>();
	#statusHandlers = new Set<(status: LinkStatus) => void>();
	#topicHandlers = new Map<string, Set<(payload: unknown, message: EspMessage) => void>>();

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
			if (!message) return;

			// Resolve correlated request if message contains an ID
			if (message.id && (message.topic === 'res/ack' || message.topic === 'res/nack')) {
				const pending = this.#pendingRequests.get(message.id);
				if (pending) {
					clearTimeout(pending.timer);
					this.#pendingRequests.delete(message.id);
					if (message.topic === 'res/ack') {
						pending.resolve(message.payload);
					} else {
						pending.reject(
							new Error(`Command rejected: ${(message.payload as { reason: string }).reason}`)
						);
					}
				}
			}

			// Dispatch to all global message handlers
			for (const handler of this.#messageHandlers) handler(message);

			// Dispatch to topic subscribers
			this.#dispatchTopic(message.topic, message.payload, message);
		};

		ws.onerror = () => {
			this.#setStatus('error');
		};

		ws.onclose = () => {
			this.#stopHeartbeat();
			this.#ws = null;
			this.#setStatus('closed');

			// Reject any pending requests on connection drop
			for (const [id, pending] of this.#pendingRequests.entries()) {
				clearTimeout(pending.timer);
				pending.reject(new Error('Connection closed before response received'));
				this.#pendingRequests.delete(id);
			}

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
		for (const [id, pending] of this.#pendingRequests.entries()) {
			clearTimeout(pending.timer);
			pending.reject(new Error('Client disconnected'));
			this.#pendingRequests.delete(id);
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
		if (message.topic !== 'sys/hb') {
			this.#queue.push(message);
		}
	}

	request<TTopic extends ClientTopic>(
		topic: TTopic,
		payload: ExtractClientPayload<TTopic>,
		timeoutMs = 3000
	): Promise<ResAckMessage['payload']> {
		return new Promise((resolve, reject) => {
			const id = `req_${++this.#reqId}_${Date.now()}`;
			const message = { topic, payload, id, ts: Date.now() } as ClientMessage;

			const timer = setTimeout(() => {
				this.#pendingRequests.delete(id);
				reject(new Error(`Timeout waiting for response to ${topic} (${id})`));
			}, timeoutMs);

			this.#pendingRequests.set(id, { resolve, reject, timer });
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

	#dispatchTopic(topic: string, payload: unknown, message: EspMessage): void {
		// Exact match
		const exact = this.#topicHandlers.get(topic);
		if (exact) {
			for (const handler of exact) handler(payload, message);
		}

		// Wildcard match (e.g. 'event/*' matches 'event/say')
		const parts = topic.split('/');
		if (parts.length > 1) {
			const wildcard = `${parts[0]}/*`;
			const wildHandlers = this.#topicHandlers.get(wildcard);
			if (wildHandlers) {
				for (const handler of wildHandlers) handler(payload, message);
			}
		}
	}

	#startHeartbeat(): void {
		this.#stopHeartbeat();
		if (this.#heartbeatMs <= 0) return;
		this.#heartbeatTimer = setInterval(() => {
			this.send({ topic: 'sys/hb', payload: { seq: ++this.#seq } });
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

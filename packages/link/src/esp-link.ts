import type {
	ClientMessage,
	ClientTopic,
	EspMessage,
	EspTopic,
	ResAckMessage
} from '@atbots/protocol';

export type LinkStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export type ExtractPayload<TTopic extends EspTopic> = Extract<
	EspMessage,
	{ topic: TTopic }
>['payload'];

export type ExtractClientPayload<TTopic extends ClientTopic> = Extract<
	ClientMessage,
	{ topic: TTopic }
>['payload'];

/** Transport-agnostic link to the robot's ESP with Topic & Payload and Correlated Requests. */
export interface EspLink {
	readonly status: LinkStatus;
	connect(): void;
	disconnect(): void;

	/** Send a typed topic message (fire-and-forget). */
	send(message: ClientMessage): void;

	/** Send a command with an automatic correlation ID and await the ACK/NACK response. */
	request<TTopic extends ClientTopic>(
		topic: TTopic,
		payload: ExtractClientPayload<TTopic>,
		timeoutMs?: number
	): Promise<ResAckMessage['payload']>;

	/** Subscribe to all inbound messages from the robot. */
	onMessage(handler: (message: EspMessage) => void): () => void;

	/** Subscribe to a specific topic pattern (e.g. 'telemetry', 'event/say', 'event/*'). */
	onTopic<TTopic extends EspTopic>(
		topic: TTopic | string,
		handler: (payload: ExtractPayload<TTopic>, message: EspMessage) => void
	): () => void;

	/** Subscribe to link connection status changes. */
	onStatus(handler: (status: LinkStatus) => void): () => void;
}

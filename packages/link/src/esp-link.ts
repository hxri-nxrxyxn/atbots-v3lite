import type { ClientMessage, EspMessage } from '@atbots/protocol';

export type LinkStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

/** Transport-agnostic link to the robot's ESP. */
export interface EspLink {
	readonly status: LinkStatus;
	connect(): void;
	disconnect(): void;
	send(message: ClientMessage): void;
	onMessage(handler: (message: EspMessage) => void): () => void;
	onStatus(handler: (status: LinkStatus) => void): () => void;
}

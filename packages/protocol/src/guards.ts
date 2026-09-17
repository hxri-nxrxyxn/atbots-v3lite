import type { ClientMessage, EspMessage } from './messages';

const CLIENT_TYPES = new Set([
	'hb',
	'drive',
	'stop',
	'set_expression',
	'set_speaking',
	'script_say',
	'play_sequence',
	'home'
]);

const ESP_TYPES = new Set(['hello', 'telemetry', 'hb_ack', 'ack', 'nack', 'event']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function isClientMessage(value: unknown): value is ClientMessage {
	return isRecord(value) && typeof value.t === 'string' && CLIENT_TYPES.has(value.t);
}

export function isEspMessage(value: unknown): value is EspMessage {
	return isRecord(value) && typeof value.t === 'string' && ESP_TYPES.has(value.t);
}

/** Parse an inbound WS text frame into an EspMessage, or null if unrecognised. */
export function parseEspMessage(data: unknown): EspMessage | null {
	if (typeof data !== 'string') return null;
	try {
		const parsed: unknown = JSON.parse(data);
		return isEspMessage(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

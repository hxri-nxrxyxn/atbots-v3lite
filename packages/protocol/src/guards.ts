import type { ClientMessage, EspMessage } from './messages';

const CLIENT_TOPICS = new Set([
	'sys/hb',
	'cmd/drive',
	'cmd/stop',
	'cmd/expression',
	'cmd/speaking',
	'cmd/say',
	'cmd/sequence',
	'cmd/home',
	'cmd/debug/motor',
	'cmd/debug/servo',
	'cmd/debug/estop',
	'cmd/debug/fault'
]);

const ESP_TOPICS = new Set([
	'sys/hello',
	'telemetry',
	'res/hb_ack',
	'res/ack',
	'res/nack',
	'event/say',
	'event/deadman',
	'event/estop',
	'event/fault'
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function isClientMessage(value: unknown): value is ClientMessage {
	return (
		isRecord(value) &&
		typeof value.topic === 'string' &&
		CLIENT_TOPICS.has(value.topic) &&
		'payload' in value
	);
}

export function isEspMessage(value: unknown): value is EspMessage {
	return (
		isRecord(value) &&
		typeof value.topic === 'string' &&
		ESP_TOPICS.has(value.topic) &&
		'payload' in value
	);
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

export const PROTOCOL_VERSION = 1;

/** App -> ESP heartbeat interval (5 Hz). */
export const HEARTBEAT_MS = 200;
/** ESP stops drive if no heartbeat arrives within this window. */
export const DEADMAN_MS = 500;
/** ESP telemetry push interval. */
export const TELEMETRY_MS = 1000;

export const WS_PATH = '/ws';
export const DEFAULT_HTTP_PORT = 80;

/** Default local ports for the Node simulators. */
export const MOCK_ESP_PORT = 8765;
export const MOCK_CLOUD_PORT = 8787;

export const DRIVE_DIRECTIONS = ['stop', 'forward', 'backward', 'left', 'right'] as const;

export const EXPRESSIONS = [
	'neutral',
	'happy',
	'excited',
	'curious',
	'thinking',
	'sad',
	'surprised',
	'confused',
	'sleepy',
	'listening',
	'speaking',
	'love'
] as const;

export const SYSTEM_STATES = [
	'booting',
	'no_network',
	'low_battery',
	'charging',
	'estop',
	'error'
] as const;

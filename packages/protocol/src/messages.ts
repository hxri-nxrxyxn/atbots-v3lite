import type { DRIVE_DIRECTIONS, EXPRESSIONS } from './constants';

export type DriveDirection = (typeof DRIVE_DIRECTIONS)[number];
export type Expression = (typeof EXPRESSIONS)[number];

/** App -> ESP. */
export type ClientMessage =
	| { t: 'hb'; seq: number }
	| { t: 'drive'; dir: DriveDirection; speed: number }
	| { t: 'stop' }
	| { t: 'set_expression'; value: Expression }
	| { t: 'set_speaking'; value: boolean }
	| { t: 'script_say'; text: string }
	| { t: 'play_sequence'; name: string }
	| { t: 'home' };

export type EspEvent = 'deadman_stop' | 'estop' | 'charger_connected' | 'servo_fault' | 'say';

/** ESP -> App. */
export type EspMessage =
	| { t: 'hello'; proto: number; ip: string }
	| {
			t: 'telemetry';
			drive: DriveDirection;
			speed: number;
			expression: Expression;
			speaking: boolean;
			free: number;
			uptime_ms: number;
	  }
	| { t: 'hb_ack'; seq: number }
	| { t: 'ack'; cmd: string }
	| { t: 'nack'; reason: string; got?: string }
	| { t: 'event'; event: EspEvent; detail?: string };

export type ClientMessageType = ClientMessage['t'];
export type EspMessageType = EspMessage['t'];

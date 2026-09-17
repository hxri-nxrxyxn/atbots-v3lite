import type { DRIVE_DIRECTIONS, EXPRESSIONS } from './constants';

export type DriveDirection = (typeof DRIVE_DIRECTIONS)[number];
export type Expression = (typeof EXPRESSIONS)[number];

export interface BaseEnvelope<TTopic extends string, TPayload> {
	topic: TTopic;
	payload: TPayload;
	id?: string;
	ts?: number;
}

// -------------------------------------------------------------------------
// App -> ESP (Commands & System)
// -------------------------------------------------------------------------

export type SysHbMessage = BaseEnvelope<'sys/hb', { seq: number }>;
export type CmdDriveMessage = BaseEnvelope<'cmd/drive', { dir: DriveDirection; speed: number }>;
export type CmdStopMessage = BaseEnvelope<'cmd/stop', Record<string, never>>;
export type CmdExpressionMessage = BaseEnvelope<'cmd/expression', { value: Expression }>;
export type CmdSpeakingMessage = BaseEnvelope<'cmd/speaking', { value: boolean }>;
export type CmdSayMessage = BaseEnvelope<'cmd/say', { text: string }>;
export type CmdSequenceMessage = BaseEnvelope<'cmd/sequence', { name: string }>;
export type CmdHomeMessage = BaseEnvelope<'cmd/home', Record<string, never>>;

export type ClientMessage =
	| SysHbMessage
	| CmdDriveMessage
	| CmdStopMessage
	| CmdExpressionMessage
	| CmdSpeakingMessage
	| CmdSayMessage
	| CmdSequenceMessage
	| CmdHomeMessage;

// -------------------------------------------------------------------------
// ESP -> App (Telemetry, Events & Responses)
// -------------------------------------------------------------------------

export type SysHelloMessage = BaseEnvelope<
	'sys/hello',
	{ proto: number; ip: string; robot_id?: string }
>;

export type TelemetryMessage = BaseEnvelope<
	'telemetry',
	{
		drive: DriveDirection;
		speed: number;
		expression: Expression;
		speaking: boolean;
		free: number;
		uptime_ms: number;
	}
>;

export type ResHbAckMessage = BaseEnvelope<'res/hb_ack', { seq: number }>;

export type ResAckMessage = BaseEnvelope<
	'res/ack',
	{ status: 'ok'; cmd: string; id?: string; detail?: string }
>;

export type ResNackMessage = BaseEnvelope<
	'res/nack',
	{ status: 'error'; reason: string; got?: string; id?: string }
>;

export type EventSayMessage = BaseEnvelope<'event/say', { text: string; from?: string }>;
export type EventDeadmanMessage = BaseEnvelope<'event/deadman', { state: 'stopped' }>;
export type EventEstopMessage = BaseEnvelope<'event/estop', { state: 'active' | 'cleared' }>;
export type EventFaultMessage = BaseEnvelope<'event/fault', { reason: string }>;

export type EspEventMessage =
	EventSayMessage | EventDeadmanMessage | EventEstopMessage | EventFaultMessage;

export type EspMessage =
	| SysHelloMessage
	| TelemetryMessage
	| ResHbAckMessage
	| ResAckMessage
	| ResNackMessage
	| EspEventMessage;

export type ClientTopic = ClientMessage['topic'];
export type EspTopic = EspMessage['topic'];
export type AllTopic = ClientTopic | EspTopic;

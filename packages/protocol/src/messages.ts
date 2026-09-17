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
// Hardware Peripherals & Telemetry Subsystems
// -------------------------------------------------------------------------

export interface ServoTelemetry {
	id: number;
	name: 'shoulder_left' | 'shoulder_right' | 'elbow_left' | 'elbow_right' | 'neck_pan';
	model: 'ST3215' | 'ST3020';
	angleDeg: number;
	tempC: number;
	voltage: number;
	torqueEnabled: boolean;
	fault: boolean;
}

export interface DriveTelemetry {
	state: DriveDirection;
	speed: number;
	pwmLeft: number;
	pwmRight: number;
	dirLeft: boolean;
	dirRight: boolean;
	estopActive: boolean;
	deadmanActive: boolean;
}

export interface PowerTelemetry {
	packVoltage: number;
	currentAmps: number;
	socPercent: number;
	cellVoltages: [number, number, number, number];
	packTempC: number;
	chargerPresent: boolean;
	bmsStatus: 'normal' | 'protect' | 'charging';
}

export interface DisplayTelemetry {
	link: 'UART1' | 'simulated';
	baud: 921600;
	fps: number;
	heartbeatAck: boolean;
	currentExpression: Expression;
}

export interface IOStateTelemetry {
	gpio10ChargerSense: boolean;
	gpio11EstopSense: boolean;
	gpio15TactileSensor: boolean;
	gpio16Spare: boolean;
}

// -------------------------------------------------------------------------
// App -> ESP (Commands & Debug Overrides)
// -------------------------------------------------------------------------

export type SysHbMessage = BaseEnvelope<'sys/hb', { seq: number }>;
export type CmdDriveMessage = BaseEnvelope<'cmd/drive', { dir: DriveDirection; speed: number }>;
export type CmdStopMessage = BaseEnvelope<'cmd/stop', Record<string, never>>;
export type CmdExpressionMessage = BaseEnvelope<'cmd/expression', { value: Expression }>;
export type CmdSpeakingMessage = BaseEnvelope<'cmd/speaking', { value: boolean }>;
export type CmdSayMessage = BaseEnvelope<'cmd/say', { text: string }>;
export type CmdSequenceMessage = BaseEnvelope<'cmd/sequence', { name: string }>;
export type CmdHomeMessage = BaseEnvelope<'cmd/home', Record<string, never>>;

/** Diagnostic Toggles (Test motors, servos, relays, simulated faults) */
export type CmdTestMotorMessage = BaseEnvelope<
	'cmd/debug/motor',
	{ motor: 'left' | 'right' | 'both'; pwm: number; dir: 'fwd' | 'rev' }
>;
export type CmdTestServoMessage = BaseEnvelope<
	'cmd/debug/servo',
	{ id: number; targetAngle: number; torque: boolean }
>;
export type CmdToggleEstopMessage = BaseEnvelope<'cmd/debug/estop', { active: boolean }>;
export type CmdSimulateFaultMessage = BaseEnvelope<
	'cmd/debug/fault',
	{ component: string; inject: boolean }
>;

export type ClientMessage =
	| SysHbMessage
	| CmdDriveMessage
	| CmdStopMessage
	| CmdExpressionMessage
	| CmdSpeakingMessage
	| CmdSayMessage
	| CmdSequenceMessage
	| CmdHomeMessage
	| CmdTestMotorMessage
	| CmdTestServoMessage
	| CmdToggleEstopMessage
	| CmdSimulateFaultMessage;

// -------------------------------------------------------------------------
// ESP -> App (Telemetry, Events & Responses)
// -------------------------------------------------------------------------

export type SysHelloMessage = BaseEnvelope<
	'sys/hello',
	{
		proto: number;
		ip: string;
		robot_id?: string;
		hardware?: {
			board: string;
			cpuFreqMhz: number;
			freeHeap: number;
			flashSizeMb?: number;
		};
	}
>;

export type TelemetryPayload = {
	drive: DriveDirection;
	speed: number;
	expression: Expression;
	speaking: boolean;
	free: number;
	uptime_ms: number;
	// Rich Hardware Subsystem States
	motors?: DriveTelemetry;
	power?: PowerTelemetry;
	servos?: ServoTelemetry[];
	display?: DisplayTelemetry;
	io?: IOStateTelemetry;
};

export type TelemetryMessage = BaseEnvelope<'telemetry', TelemetryPayload>;

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
export type EventFaultMessage = BaseEnvelope<
	'event/fault',
	{ component: string; reason: string; code?: number }
>;

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

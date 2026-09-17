/** Messages and shapes for the cloud relay + stateless API (mocked in M1). */

export type Tier = 'standard' | 'premium';
export type RobotStatus = 'active' | 'suspended' | 'revoked';

export interface RobotSummary {
	id: string;
	name: string;
	tenantId: string;
	status: RobotStatus;
	lastSeen: string;
	batteryPct: number;
	firmware: string;
	venue?: string;
}

export interface CreditBalance {
	tenantId: string;
	balance: number;
	burnPerDay: number;
}

export interface SessionSummary {
	id: string;
	robotId: string;
	startedAt: string;
	tier: Tier;
	creditsUsed: number;
}

export interface KnowledgeItem {
	id: string;
	title: string;
	body: string;
}

/** App -> relay. */
export type RelayClientMessage =
	| { t: 'session.start'; robotId: string; tier: Tier; languageHint?: string }
	| { t: 'user.text'; text: string }
	| { t: 'audio.chunk'; data: string }
	| { t: 'audio.end'; text?: string }
	| { t: 'session.end' };

/** Relay -> app. */
export type RelayServerMessage =
	| { t: 'session.started'; sessionId: string }
	| { t: 'transcript.partial'; text: string }
	| { t: 'transcript.final'; text: string }
	| { t: 'reply.chunk'; text: string }
	| { t: 'tool.call'; callId: string; tool: string; args: Record<string, unknown> }
	| { t: 'session.error'; reason: string }
	| { t: 'session.ended'; creditsUsed: number };

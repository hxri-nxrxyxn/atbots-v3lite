import type { CreditBalance, KnowledgeItem, RobotSummary, SessionSummary } from '@atbots/protocol';

const now = () => new Date().toISOString();

export const robots: RobotSummary[] = [
	{
		id: 'bot-001',
		name: 'Aria',
		tenantId: 'tenant-demo',
		status: 'active',
		lastSeen: now(),
		batteryPct: 82,
		firmware: '0.1.0',
		venue: 'Demo Lab'
	},
	{
		id: 'bot-002',
		name: 'Bruno',
		tenantId: 'tenant-demo',
		status: 'active',
		lastSeen: now(),
		batteryPct: 47,
		firmware: '0.1.0',
		venue: 'Reception'
	},
	{
		id: 'bot-003',
		name: 'Cleo',
		tenantId: 'tenant-demo',
		status: 'suspended',
		lastSeen: new Date(Date.now() - 86_400_000).toISOString(),
		batteryPct: 12,
		firmware: '0.0.9',
		venue: 'Branch 2'
	}
];

export const creditBalance: CreditBalance = {
	tenantId: 'tenant-demo',
	balance: 9400,
	burnPerDay: 120
};

export const knowledge: KnowledgeItem[] = [
	{
		id: 'kb-001',
		title: 'School timings',
		body: 'The school is open from 8:00 to 15:30, Monday to Friday.'
	},
	{
		id: 'kb-002',
		title: 'Admissions',
		body: 'Admissions for the next academic year open in January. Please contact the front office.'
	}
];

export const sessions: SessionSummary[] = [];

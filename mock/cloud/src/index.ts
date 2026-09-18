/**
 * Mock cloud: a stateless HTTP API plus a WebSocket relay stub.
 *
 *   http://localhost:8787/v1/...      fleet, credits, content, sessions
 *   ws://localhost:8787/v1/session    AI session relay (mock or real provider)
 *
 * The AI provider is chosen with AI_PROVIDER (`mock` / `gemini` / `openai`).
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve as pathResolve } from 'node:path';

// Auto-load local environment variables from .env.local or .env if present
function loadEnv() {
	for (const filename of ['.env.local', '.env']) {
		const fullPath = pathResolve(process.cwd(), filename);
		if (existsSync(fullPath)) {
			try {
				const content = readFileSync(fullPath, 'utf-8');
				for (const line of content.split('\n')) {
					const trimmed = line.trim();
					if (!trimmed || trimmed.startsWith('#')) continue;
					const idx = trimmed.indexOf('=');
					if (idx > 0) {
						const key = trimmed.slice(0, idx).trim();
						const val = trimmed
							.slice(idx + 1)
							.trim()
							.replace(/^["']|["']$/g, '');
						if (!process.env[key]) {
							process.env[key] = val;
						}
					}
				}
			} catch {
				// Ignore
			}
		}
	}
}
loadEnv();

import {
	MOCK_CLOUD_PORT,
	type RelayClientMessage,
	type RelayServerMessage,
	type SessionSummary,
	type Tier
} from '@atbots/protocol';
import { WebSocketServer, type WebSocket } from 'ws';

import { createProvider, type AiTurn } from './ai';
import { creditBalance, knowledge, robots, sessions } from './data';

const port = Number(process.env.PORT ?? MOCK_CLOUD_PORT);
const provider = createProvider();

function json(res: ServerResponse, status: number, body: unknown): void {
	const payload = JSON.stringify(body);
	res.writeHead(status, { 'content-type': 'application/json' });
	res.end(payload);
}

async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
	const url = new URL(req.url ?? '/', `http://localhost:${port}`);
	const path = url.pathname;
	const method = req.method ?? 'GET';

	if (method === 'GET' && path === '/v1/fleet/robots') return json(res, 200, robots);

	const robotMatch = path.match(/^\/v1\/fleet\/robots\/([^/]+)(?:\/(restart|suspend))?$/);
	if (robotMatch) {
		const robot = robots.find((candidate) => candidate.id === robotMatch[1]);
		if (!robot) return json(res, 404, { error: 'robot_not_found' });
		const action = robotMatch[2];
		if (method === 'GET' && !action) return json(res, 200, robot);
		if (method === 'POST' && action === 'restart') {
			robot.lastSeen = new Date().toISOString();
			return json(res, 200, { ok: true });
		}
		if (method === 'POST' && action === 'suspend') {
			robot.status = 'suspended';
			return json(res, 200, { ok: true });
		}
	}

	if (method === 'GET' && path === '/v1/credits/balance') return json(res, 200, creditBalance);
	if (method === 'GET' && path === '/v1/content/knowledge') return json(res, 200, knowledge);
	if (method === 'GET' && path === '/v1/sessions') return json(res, 200, sessions);

	json(res, 404, { error: 'not_found', path });
}

const httpServer = createServer((req, res) => {
	handleApi(req, res).catch((error: unknown) => {
		json(res, 500, { error: (error as Error).message });
	});
});

const wss = new WebSocketServer({ server: httpServer, path: '/v1/session' });

wss.on('connection', (ws: WebSocket) => {
	let sessionId: string | null = null;
	let robotId = 'bot-001';
	let tier: Tier = 'standard';
	let creditsUsed = 0;
	const history: AiTurn[] = [];

	const send = (message: RelayServerMessage) => ws.send(JSON.stringify(message));

	ws.on('message', (data) => {
		void (async () => {
			let message: RelayClientMessage;
			try {
				message = JSON.parse(String(data)) as RelayClientMessage;
			} catch {
				send({ t: 'session.error', reason: 'bad_json' });
				return;
			}

			if (message.t === 'session.start') {
				sessionId = randomUUID();
				robotId = message.robotId || robotId;
				tier = message.tier ?? 'standard';
				send({ t: 'session.started', sessionId });
				return;
			}

			if (message.t === 'session.end') {
				send({ t: 'session.ended', creditsUsed });
				return;
			}

			const text =
				message.t === 'user.text'
					? message.text
					: message.t === 'audio.end'
						? (message.text ?? '')
						: '';
			if (!text) return;
			if (!sessionId) {
				send({ t: 'session.error', reason: 'no_session' });
				return;
			}

			send({ t: 'transcript.final', text });

			try {
				const reply = await provider.reply({ text, history, tenantId: 'tenant-demo' });
				send({ t: 'reply.chunk', text: reply.text });
				if (reply.toolCall) {
					send({
						t: 'tool.call',
						callId: randomUUID(),
						tool: reply.toolCall.tool,
						args: reply.toolCall.args
					});
				}
				history.push({ role: 'user', text });
				history.push({ role: 'assistant', text: reply.text });

				const cost = tier === 'premium' ? 6 : 1;
				creditsUsed += cost;
				creditBalance.balance = Math.max(0, creditBalance.balance - cost);
				const summary: SessionSummary = {
					id: sessionId,
					robotId,
					startedAt: new Date().toISOString(),
					tier,
					creditsUsed
				};
				sessions.unshift(summary);
				if (sessions.length > 50) sessions.pop();
				send({ t: 'session.ended', creditsUsed });
			} catch (error) {
				send({ t: 'session.error', reason: (error as Error).message });
			}
		})();
	});
});

httpServer.listen(port, () => {
	console.log(`[mock-cloud] http://localhost:${port}/v1/...  provider=${provider.name}`);
});

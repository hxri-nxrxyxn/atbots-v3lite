/**
 * Node simulator for the robot's ESP. Speaks the exact same Topic & Payload
 * JSON-over-WebSocket protocol as `firmware/esp8266`.
 *
 *   ws://localhost:8765/ws   command channel
 *   http://localhost:8765/status
 */

import { createServer } from 'node:http';

import {
	DEADMAN_MS,
	MOCK_ESP_PORT,
	PROTOCOL_VERSION,
	TELEMETRY_MS,
	isClientMessage,
	type ClientMessage,
	type DriveDirection,
	type EspMessage,
	type Expression
} from '@atbots/protocol';
import { WebSocketServer, type WebSocket } from 'ws';

const port = Number(process.env.PORT ?? MOCK_ESP_PORT);

const state: {
	drive: DriveDirection;
	speed: number;
	expression: Expression;
	speaking: boolean;
} = { drive: 'stop', speed: 0, expression: 'neutral', speaking: false };

const startedAt = Date.now();
let lastHb = Date.now();

function telemetry(): EspMessage {
	return {
		topic: 'telemetry',
		payload: {
			drive: state.drive,
			speed: state.speed,
			expression: state.expression,
			speaking: state.speaking,
			free: 25000,
			uptime_ms: Date.now() - startedAt
		}
	};
}

function status() {
	return { ok: true, ip: '127.0.0.1', uptime_ms: Date.now() - startedAt, state };
}

const httpServer = createServer((req, res) => {
	if (req.url === '/status') {
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end(JSON.stringify(status()));
		return;
	}
	res.writeHead(404);
	res.end();
});

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

function broadcast(message: EspMessage): void {
	const payload = JSON.stringify(message);
	for (const client of wss.clients) {
		if (client.readyState === client.OPEN) client.send(payload);
	}
}

function reply(ws: WebSocket, message: EspMessage): void {
	ws.send(JSON.stringify(message));
}

function handleCommand(ws: WebSocket, message: ClientMessage): void {
	const id = message.id;

	switch (message.topic) {
		case 'sys/hb':
		case 'cmd/drive':
			lastHb = Date.now();
			if (message.topic === 'sys/hb') {
				reply(ws, {
					topic: 'res/hb_ack',
					payload: { seq: message.payload.seq },
					id
				});
				return;
			}
			state.drive = message.payload.dir;
			state.speed = message.payload.speed;
			reply(ws, {
				topic: 'res/ack',
				payload: { status: 'ok', cmd: 'cmd/drive' },
				id
			});
			return;
		case 'cmd/stop':
			state.drive = 'stop';
			state.speed = 0;
			reply(ws, {
				topic: 'res/ack',
				payload: { status: 'ok', cmd: 'cmd/stop' },
				id
			});
			return;
		case 'cmd/expression':
			state.expression = message.payload.value;
			reply(ws, {
				topic: 'res/ack',
				payload: { status: 'ok', cmd: 'cmd/expression' },
				id
			});
			return;
		case 'cmd/speaking':
			state.speaking = message.payload.value;
			reply(ws, {
				topic: 'res/ack',
				payload: { status: 'ok', cmd: 'cmd/speaking' },
				id
			});
			return;
		case 'cmd/say':
			reply(ws, {
				topic: 'res/ack',
				payload: { status: 'ok', cmd: 'cmd/say' },
				id
			});
			broadcast({
				topic: 'event/say',
				payload: { text: message.payload.text }
			});
			return;
		case 'cmd/sequence':
			reply(ws, {
				topic: 'res/ack',
				payload: { status: 'ok', cmd: 'cmd/sequence' },
				id
			});
			return;
		case 'cmd/home':
			state.expression = 'neutral';
			reply(ws, {
				topic: 'res/ack',
				payload: { status: 'ok', cmd: 'cmd/home' },
				id
			});
			return;
		default:
			reply(ws, {
				topic: 'res/nack',
				payload: {
					status: 'error',
					reason: 'unknown_topic',
					got: (message as { topic: string }).topic
				},
				id
			});
	}
}

wss.on('connection', (ws) => {
	ws.send(
		JSON.stringify({
			topic: 'sys/hello',
			payload: { proto: PROTOCOL_VERSION, ip: '127.0.0.1', robot_id: 'bot-001' }
		} satisfies EspMessage)
	);

	ws.on('message', (data) => {
		let parsed: unknown;
		try {
			parsed = JSON.parse(String(data));
		} catch {
			reply(ws, {
				topic: 'res/nack',
				payload: { status: 'error', reason: 'bad_json' }
			});
			return;
		}
		if (!isClientMessage(parsed)) {
			reply(ws, {
				topic: 'res/nack',
				payload: {
					status: 'error',
					reason: 'invalid_topic_envelope',
					got: String((parsed as { topic?: string })?.topic)
				}
			});
			return;
		}
		handleCommand(ws, parsed);
	});
});

setInterval(() => {
	if (state.drive !== 'stop' && Date.now() - lastHb > DEADMAN_MS) {
		state.drive = 'stop';
		state.speed = 0;
		broadcast({ topic: 'event/deadman', payload: { state: 'stopped' } });
	}
	broadcast(telemetry());
}, TELEMETRY_MS);

httpServer.listen(port, () => {
	console.log(`[mock-esp] ws://localhost:${port}/ws  http://localhost:${port}/status`);
});

/**
 * Node simulator for the robot's ESP. Speaks the exact same JSON-over-WebSocket
 * protocol as `firmware/esp8266`, so the apps can be developed and demoed
 * without hardware.
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
		t: 'telemetry',
		drive: state.drive,
		speed: state.speed,
		expression: state.expression,
		speaking: state.speaking,
		free: 25000,
		uptime_ms: Date.now() - startedAt
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
	switch (message.t) {
		case 'hb':
			lastHb = Date.now();
			reply(ws, { t: 'hb_ack', seq: message.seq });
			return;
		case 'drive':
			state.drive = message.dir;
			state.speed = message.speed;
			reply(ws, { t: 'ack', cmd: 'drive' });
			return;
		case 'stop':
			state.drive = 'stop';
			state.speed = 0;
			reply(ws, { t: 'ack', cmd: 'stop' });
			return;
		case 'set_expression':
			state.expression = message.value;
			reply(ws, { t: 'ack', cmd: 'set_expression' });
			return;
		case 'set_speaking':
			state.speaking = message.value;
			reply(ws, { t: 'ack', cmd: 'set_speaking' });
			return;
		case 'script_say':
			reply(ws, { t: 'ack', cmd: 'script_say' });
			broadcast({ t: 'event', event: 'say', detail: message.text });
			return;
		case 'play_sequence':
			reply(ws, { t: 'ack', cmd: 'play_sequence' });
			return;
		case 'home':
			state.expression = 'neutral';
			reply(ws, { t: 'ack', cmd: 'home' });
			return;
		default:
			reply(ws, { t: 'nack', reason: 'unknown_command', got: (message as { t: string }).t });
	}
}

wss.on('connection', (ws) => {
	ws.send(
		JSON.stringify({ t: 'hello', proto: PROTOCOL_VERSION, ip: '127.0.0.1' } satisfies EspMessage)
	);

	ws.on('message', (data) => {
		let parsed: unknown;
		try {
			parsed = JSON.parse(String(data));
		} catch {
			reply(ws, { t: 'nack', reason: 'bad_json' });
			return;
		}
		if (!isClientMessage(parsed)) {
			reply(ws, {
				t: 'nack',
				reason: 'unknown_command',
				got: String((parsed as { t?: string })?.t)
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
		broadcast({ t: 'event', event: 'deadman_stop' });
	}
	broadcast(telemetry());
}, TELEMETRY_MS);

httpServer.listen(port, () => {
	console.log(`[mock-esp] ws://localhost:${port}/ws  http://localhost:${port}/status`);
});

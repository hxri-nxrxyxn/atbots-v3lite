import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EspMessage } from '@atbots/protocol';

import { MockEspLink } from './mock-esp-link';

describe('MockEspLink with Topic Schema & Requests', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	function collect(link: MockEspLink) {
		const messages: EspMessage[] = [];
		link.onMessage((message) => messages.push(message));
		return messages;
	}

	it('emits sys/hello on connect and telemetry on the tick', () => {
		const link = new MockEspLink();
		const messages = collect(link);
		link.connect();
		vi.advanceTimersByTime(1);

		expect(link.status).toBe('open');
		expect(messages[0]).toEqual({
			topic: 'sys/hello',
			payload: { proto: 1, ip: '127.0.0.1', robot_id: 'bot-001' }
		});

		vi.advanceTimersByTime(1000);
		expect(messages.some((m) => m.topic === 'telemetry')).toBe(true);
	});

	it('acks heartbeat and drive commands', () => {
		const link = new MockEspLink();
		const messages = collect(link);
		link.connect();
		vi.advanceTimersByTime(1);

		link.send({ topic: 'sys/hb', payload: { seq: 7 } });
		link.send({ topic: 'cmd/drive', payload: { dir: 'forward', speed: 5 } });

		expect(messages).toContainEqual({
			topic: 'res/hb_ack',
			payload: { seq: 7 },
			id: undefined
		});
		expect(messages).toContainEqual({
			topic: 'res/ack',
			payload: { status: 'ok', cmd: 'cmd/drive' },
			id: undefined
		});
	});

	it('resolves correlated request() calls with response ID', async () => {
		const link = new MockEspLink();
		link.connect();
		vi.advanceTimersByTime(1);

		const promise = link.request('cmd/expression', { value: 'happy' });
		const result = await promise;

		expect(result).toEqual({ status: 'ok', cmd: 'cmd/expression' });
	});

	it('supports onTopic pattern subscriptions', () => {
		const link = new MockEspLink();
		let sayReceived = '';
		link.onTopic('event/say', (payload) => {
			sayReceived = payload.text;
		});

		link.connect();
		vi.advanceTimersByTime(1);

		link.send({ topic: 'cmd/say', payload: { text: 'Welcome to the demo!' } });

		expect(sayReceived).toBe('Welcome to the demo!');
	});

	it('stops the drive after the deadman window', () => {
		const link = new MockEspLink();
		const messages = collect(link);
		link.connect();
		vi.advanceTimersByTime(1);

		link.send({ topic: 'cmd/drive', payload: { dir: 'forward', speed: 5 } });
		vi.advanceTimersByTime(600);

		expect(messages.some((m) => m.topic === 'event/deadman' && m.payload.state === 'stopped')).toBe(
			true
		);
	});

	it('does not deadman-stop while heartbeats keep arriving', () => {
		const link = new MockEspLink();
		const messages = collect(link);
		link.connect();
		vi.advanceTimersByTime(1);

		link.send({ topic: 'cmd/drive', payload: { dir: 'forward', speed: 5 } });
		for (let i = 0; i < 8; i++) {
			link.send({ topic: 'sys/hb', payload: { seq: i } });
			vi.advanceTimersByTime(200);
		}

		expect(messages.some((m) => m.topic === 'event/deadman' && m.payload.state === 'stopped')).toBe(
			false
		);
	});

	it('nacks unknown topics', () => {
		const link = new MockEspLink();
		const messages = collect(link);
		link.connect();
		vi.advanceTimersByTime(1);

		link.send({ topic: 'bogus/action', payload: {} } as never);

		expect(messages).toContainEqual({
			topic: 'res/nack',
			payload: { status: 'error', reason: 'unknown_topic', got: 'bogus/action' },
			id: undefined
		});
	});
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EspMessage } from '@atbots/protocol';

import { MockEspLink } from './mock-esp-link';

describe('MockEspLink', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	function collect(link: MockEspLink) {
		const messages: EspMessage[] = [];
		link.onMessage((message) => messages.push(message));
		return messages;
	}

	it('emits hello on connect and telemetry on the tick', () => {
		const link = new MockEspLink();
		const messages = collect(link);
		link.connect();
		vi.advanceTimersByTime(1);

		expect(link.status).toBe('open');
		expect(messages[0]).toEqual({ t: 'hello', proto: 1, ip: '127.0.0.1' });

		vi.advanceTimersByTime(1000);
		expect(messages.some((m) => m.t === 'telemetry')).toBe(true);
	});

	it('acks heartbeat and drive commands', () => {
		const link = new MockEspLink();
		const messages = collect(link);
		link.connect();
		vi.advanceTimersByTime(1);

		link.send({ t: 'hb', seq: 7 });
		link.send({ t: 'drive', dir: 'forward', speed: 5 });

		expect(messages).toContainEqual({ t: 'hb_ack', seq: 7 });
		expect(messages).toContainEqual({ t: 'ack', cmd: 'drive' });
	});

	it('stops the drive after the deadman window', () => {
		const link = new MockEspLink();
		const messages = collect(link);
		link.connect();
		vi.advanceTimersByTime(1);

		link.send({ t: 'drive', dir: 'forward', speed: 5 });
		vi.advanceTimersByTime(600);

		expect(messages.some((m) => m.t === 'event' && m.event === 'deadman_stop')).toBe(true);
	});

	it('does not deadman-stop while heartbeats keep arriving', () => {
		const link = new MockEspLink();
		const messages = collect(link);
		link.connect();
		vi.advanceTimersByTime(1);

		link.send({ t: 'drive', dir: 'forward', speed: 5 });
		for (let i = 0; i < 8; i++) {
			link.send({ t: 'hb', seq: i });
			vi.advanceTimersByTime(200);
		}

		expect(messages.some((m) => m.t === 'event' && m.event === 'deadman_stop')).toBe(false);
	});

	it('nacks unknown commands', () => {
		const link = new MockEspLink();
		const messages = collect(link);
		link.connect();
		vi.advanceTimersByTime(1);

		link.send({ t: 'bogus' } as never);

		expect(messages).toContainEqual({ t: 'nack', reason: 'unknown_command', got: 'bogus' });
	});

	it('acks script_say and emits a say event', () => {
		const link = new MockEspLink();
		const messages = collect(link);
		link.connect();
		vi.advanceTimersByTime(1);

		link.send({ t: 'script_say', text: 'Welcome to the event.' });

		expect(messages).toContainEqual({ t: 'ack', cmd: 'script_say' });
		expect(messages).toContainEqual({
			t: 'event',
			event: 'say',
			detail: 'Welcome to the event.'
		});
	});
});

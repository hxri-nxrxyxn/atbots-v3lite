import { describe, expect, it } from 'vitest';

import { isClientMessage, isEspMessage, parseEspMessage } from './guards';

describe('topic guards', () => {
	it('accepts known client topic messages', () => {
		expect(isClientMessage({ topic: 'sys/hb', payload: { seq: 1 } })).toBe(true);
		expect(
			isClientMessage({
				topic: 'cmd/drive',
				payload: { dir: 'forward', speed: 5 },
				id: 'req_1'
			})
		).toBe(true);
		expect(isClientMessage({ topic: 'cmd/stop', payload: {} })).toBe(true);
	});

	it('rejects unknown or malformed client messages', () => {
		expect(isClientMessage({ topic: 'bogus/topic', payload: {} })).toBe(false);
		expect(isClientMessage({})).toBe(false);
		expect(isClientMessage(null)).toBe(false);
		expect(isClientMessage('cmd/stop')).toBe(false);
	});

	it('accepts known ESP topic messages', () => {
		expect(
			isEspMessage({
				topic: 'sys/hello',
				payload: { proto: 2, ip: '1.2.3.4' }
			})
		).toBe(true);
		expect(isEspMessage({ topic: 'res/hb_ack', payload: { seq: 1 } })).toBe(true);
		expect(
			isEspMessage({
				topic: 'res/nack',
				payload: { status: 'error', reason: 'unknown_command' },
				id: 'req_1'
			})
		).toBe(true);
		expect(isEspMessage({ topic: 'event/say', payload: { text: 'hello' } })).toBe(true);
	});

	it('rejects a client topic on the ESP channel', () => {
		expect(isEspMessage({ topic: 'cmd/drive', payload: { dir: 'forward', speed: 1 } })).toBe(false);
	});

	it('parses valid JSON topic frames and ignores bad ones', () => {
		expect(parseEspMessage('{"topic":"res/hb_ack","payload":{"seq":3},"id":"123"}')).toEqual({
			topic: 'res/hb_ack',
			payload: { seq: 3 },
			id: '123'
		});
		expect(parseEspMessage('not json')).toBeNull();
		expect(parseEspMessage('{"topic":"bogus","payload":{}}')).toBeNull();
		expect(parseEspMessage(42)).toBeNull();
	});
});

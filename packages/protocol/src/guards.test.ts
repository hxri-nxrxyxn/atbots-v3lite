import { describe, expect, it } from 'vitest';

import { isClientMessage, isEspMessage, parseEspMessage } from './guards';

describe('guards', () => {
	it('accepts known client messages', () => {
		expect(isClientMessage({ t: 'hb', seq: 1 })).toBe(true);
		expect(isClientMessage({ t: 'drive', dir: 'forward', speed: 5 })).toBe(true);
		expect(isClientMessage({ t: 'stop' })).toBe(true);
	});

	it('rejects unknown or malformed client messages', () => {
		expect(isClientMessage({ t: 'bogus' })).toBe(false);
		expect(isClientMessage({})).toBe(false);
		expect(isClientMessage(null)).toBe(false);
		expect(isClientMessage('hb')).toBe(false);
	});

	it('accepts known ESP messages', () => {
		expect(isEspMessage({ t: 'hello', proto: 1, ip: '1.2.3.4' })).toBe(true);
		expect(isEspMessage({ t: 'hb_ack', seq: 1 })).toBe(true);
		expect(isEspMessage({ t: 'nack', reason: 'unknown_command' })).toBe(true);
	});

	it('rejects a client message on the ESP channel', () => {
		expect(isEspMessage({ t: 'hb', seq: 1 })).toBe(false);
	});

	it('parses valid JSON frames and ignores bad ones', () => {
		expect(parseEspMessage('{"t":"hb_ack","seq":3}')).toEqual({ t: 'hb_ack', seq: 3 });
		expect(parseEspMessage('not json')).toBeNull();
		expect(parseEspMessage('{"t":"bogus"}')).toBeNull();
		expect(parseEspMessage(42)).toBeNull();
	});
});

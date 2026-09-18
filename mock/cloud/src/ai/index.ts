import { existsSync, readFileSync } from 'node:fs';
import { resolve as pathResolve } from 'node:path';

import { GeminiProvider } from './gemini-provider';
import { MockProvider } from './mock-provider';
import type { AIProvider } from './provider';
import { OpenAIProvider } from './real-provider';

export type { AIProvider, AiReply, AiRequest, AiToolCall, AiTurn } from './provider';

function loadLocalEnv() {
	// Search current working directory and parent directories for .env.local
	for (const base of [
		process.cwd(),
		pathResolve(process.cwd(), '../..'),
		pathResolve(process.cwd(), '..')
	]) {
		for (const filename of ['.env.local', '.env']) {
			const fullPath = pathResolve(base, filename);
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
}

export function createProvider(): AIProvider {
	loadLocalEnv();
	const kind = (process.env.AI_PROVIDER ?? 'mock').toLowerCase();

	if (kind === 'gemini' || kind === 'google') {
		return new GeminiProvider();
	}

	if (kind === 'openai') {
		return new OpenAIProvider();
	}

	const hasGeminiKey =
		process.env.GEMINI_API_KEY ||
		process.env.GOOGLE_API_KEY ||
		(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('AQ.'));

	if (hasGeminiKey) {
		return new GeminiProvider();
	}

	return new MockProvider();
}

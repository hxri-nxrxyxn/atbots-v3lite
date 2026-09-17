import { MockProvider } from './mock-provider';
import type { AIProvider } from './provider';
import { OpenAIProvider } from './real-provider';

export type { AIProvider, AiReply, AiRequest, AiToolCall, AiTurn } from './provider';

export function createProvider(): AIProvider {
	const kind = process.env.AI_PROVIDER ?? 'mock';
	if (kind === 'openai') return new OpenAIProvider();
	return new MockProvider();
}

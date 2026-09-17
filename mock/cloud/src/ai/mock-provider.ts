import type { AIProvider, AiReply, AiRequest } from './provider';

const RULES: Array<{ match: RegExp; tool: string; args: Record<string, unknown> }> = [
	{ match: /\b(wave|hello|hi|greet)\b/i, tool: 'play_sequence', args: { name: 'wave' } },
	{ match: /\b(dance|celebrate|party)\b/i, tool: 'play_sequence', args: { name: 'dance_1' } },
	{ match: /\b(happy|smile|cheer)\b/i, tool: 'set_expression', args: { emotion: 'happy' } },
	{ match: /\b(sad|sorry)\b/i, tool: 'set_expression', args: { emotion: 'sad' } },
	{ match: /\b(look|turn)\b/i, tool: 'look_at', args: { direction: 'centre' } }
];

/** Canned, deterministic replies with fake latency. No network, no API key. */
export class MockProvider implements AIProvider {
	readonly name = 'mock';

	async reply(request: AiRequest): Promise<AiReply> {
		await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));

		const rule = RULES.find((candidate) => candidate.match.test(request.text));
		const text = this.#compose(request.text);
		return rule ? { text, toolCall: { tool: rule.tool, args: rule.args } } : { text };
	}

	#compose(question: string): string {
		const q = question.trim();
		if (!q) return 'I did not catch that. Could you say it again?';
		return (
			`You asked: "${q}". ` +
			'I am the AT Bots demo assistant running on a mock model, so my answers ' +
			'are canned. Ask me to wave or dance and watch the face.'
		);
	}
}

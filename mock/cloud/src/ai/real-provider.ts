import type { AIProvider, AiReply, AiRequest } from './provider';

/**
 * OpenAI-compatible chat provider. Selected with `AI_PROVIDER=openai`.
 * Requires OPENAI_API_KEY; optional OPENAI_BASE_URL and OPENAI_MODEL.
 * Keys live only on this dev server — never in a client app.
 */
export class OpenAIProvider implements AIProvider {
	readonly name = 'openai';

	async reply(request: AiRequest): Promise<AiReply> {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

		const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
		const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

		const messages = [
			{
				role: 'system',
				content:
					'You are a friendly receptionist robot at a school or shop. ' +
					'Answer in the language you are addressed in. Keep replies short.'
			},
			...request.history.map((turn) => ({ role: turn.role, content: turn.text })),
			{ role: 'user', content: request.text }
		];

		const response = await fetch(`${baseUrl}/chat/completions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
			body: JSON.stringify({ model, messages, temperature: 0.6 })
		});

		if (!response.ok) throw new Error(`provider ${response.status}: ${await response.text()}`);
		const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
		const text = data.choices?.[0]?.message?.content?.trim() ?? '';
		return { text };
	}
}

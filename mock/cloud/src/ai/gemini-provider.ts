import type { AIProvider, AiReply, AiRequest } from './provider';

/**
 * Native Google Gemini API Provider (gemini-3.6-flash).
 * Direct REST API integration using official generateContent endpoint.
 */
export class GeminiProvider implements AIProvider {
	readonly name = 'gemini';

	async reply(request: AiRequest): Promise<AiReply> {
		const apiKey =
			process.env.GEMINI_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.GOOGLE_API_KEY;
		if (!apiKey) {
			throw new Error('GEMINI_API_KEY (or OPENAI_API_KEY) is not set in environment or .env.local');
		}

		const model = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
		const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

		// Convert history to Gemini contents format (user / model)
		const contents = [
			...request.history.map((turn) => ({
				role: turn.role === 'assistant' ? 'model' : 'user',
				parts: [{ text: turn.text }]
			})),
			{
				role: 'user',
				parts: [{ text: request.text }]
			}
		];

		const systemInstruction = {
			parts: [
				{
					text:
						'You are the friendly, intelligent physical receptionist robot for AT Bots V3 Lite. ' +
						'Keep responses natural, concise (1-2 sentences max for spoken audio output), polite, and helpful. ' +
						'If the visitor asks you to wave, dance, smile, or celebrate, acknowledge it warmly.'
				}
			]
		};

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				contents,
				systemInstruction,
				generationConfig: {
					temperature: 0.7,
					maxOutputTokens: 2048
				}
			})
		});

		if (!response.ok) {
			const errorBody = await response.text();
			throw new Error(`Gemini API error [${response.status}]: ${errorBody}`);
		}

		const data = (await response.json()) as {
			candidates?: Array<{
				content?: {
					parts?: Array<{ text?: string }>;
				};
			}>;
		};

		console.log('RAW GEMINI RESP:', JSON.stringify(data, null, 2));

		const parts = data.candidates?.[0]?.content?.parts ?? [];
		const text = parts
			.map((p) => p.text ?? '')
			.join('')
			.trim();
		if (!text) {
			throw new Error('Gemini returned empty response');
		}

		// Detect tool intents in prompt/reply for physical robot interaction
		let toolCall: { tool: string; args: Record<string, unknown> } | undefined = undefined;
		const lowerPrompt = request.text.toLowerCase();
		if (/\b(wave|hi|hello|greet)\b/i.test(lowerPrompt)) {
			toolCall = { tool: 'play_sequence', args: { name: 'wave' } };
		} else if (/\b(dance|party|celebrate)\b/i.test(lowerPrompt)) {
			toolCall = { tool: 'play_sequence', args: { name: 'dance_1' } };
		} else if (/\b(happy|smile|cheer)\b/i.test(lowerPrompt)) {
			toolCall = { tool: 'set_expression', args: { emotion: 'happy' } };
		} else if (/\b(sad|sorry)\b/i.test(lowerPrompt)) {
			toolCall = { tool: 'set_expression', args: { emotion: 'sad' } };
		}

		return { text, toolCall };
	}
}

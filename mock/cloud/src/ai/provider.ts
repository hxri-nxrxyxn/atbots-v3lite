export interface AiTurn {
	role: 'user' | 'assistant';
	text: string;
}

export interface AiToolCall {
	tool: string;
	args: Record<string, unknown>;
}

export interface AiReply {
	text: string;
	toolCall?: AiToolCall;
}

export interface AiRequest {
	text: string;
	history: AiTurn[];
	tenantId: string;
}

/**
 * The single seam between the relay and any language model. `MockProvider` is
 * the default; a real provider is selected with the `AI_PROVIDER` env var.
 */
export interface AIProvider {
	readonly name: string;
	reply(request: AiRequest): Promise<AiReply>;
}

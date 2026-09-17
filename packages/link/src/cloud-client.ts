import type { CreditBalance, KnowledgeItem, RobotSummary, SessionSummary } from '@atbots/protocol';

export interface CloudClientOptions {
	baseUrl: string;
	/** Injectable for tests / non-browser runtimes. */
	fetchImpl?: typeof fetch;
}

/** Thin client for the stateless API (mocked in M1). */
export class CloudClient {
	readonly #baseUrl: string;
	readonly #fetch: typeof fetch;

	constructor(options: CloudClientOptions) {
		this.#baseUrl = options.baseUrl.replace(/\/$/, '');
		this.#fetch = options.fetchImpl ?? fetch;
	}

	getFleet(): Promise<RobotSummary[]> {
		return this.#get('/v1/fleet/robots');
	}

	getRobot(id: string): Promise<RobotSummary> {
		return this.#get(`/v1/fleet/robots/${id}`);
	}

	getCredits(): Promise<CreditBalance> {
		return this.#get('/v1/credits/balance');
	}

	getContent(): Promise<KnowledgeItem[]> {
		return this.#get('/v1/content/knowledge');
	}

	getSessions(): Promise<SessionSummary[]> {
		return this.#get('/v1/sessions');
	}

	async restartRobot(id: string): Promise<void> {
		await this.#post(`/v1/fleet/robots/${id}/restart`);
	}

	async suspendRobot(id: string): Promise<void> {
		await this.#post(`/v1/fleet/robots/${id}/suspend`);
	}

	async #get<T>(path: string): Promise<T> {
		const response = await this.#fetch(`${this.#baseUrl}${path}`);
		if (!response.ok) throw new Error(`GET ${path} -> ${response.status}`);
		return (await response.json()) as T;
	}

	async #post(path: string, body?: unknown): Promise<void> {
		const response = await this.#fetch(`${this.#baseUrl}${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		if (!response.ok) throw new Error(`POST ${path} -> ${response.status}`);
	}
}

import { CloudClient } from '@atbots/link';
import type { CreditBalance, KnowledgeItem, RobotSummary, SessionSummary } from '@atbots/protocol';

import { config } from '../config';

/** Thin reactive wrapper over the stateless API (mocked in the demo). */
class CloudStore {
	fleet = $state<RobotSummary[]>([]);
	credits = $state<CreditBalance | null>(null);
	content = $state<KnowledgeItem[]>([]);
	sessions = $state<SessionSummary[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	#client = new CloudClient({ baseUrl: config.cloudUrl });

	async loadFleet(): Promise<void> {
		const result = await this.#run(() => this.#client.getFleet());
		if (result) this.fleet = result;
	}

	async loadCredits(): Promise<void> {
		const result = await this.#run(() => this.#client.getCredits());
		if (result) this.credits = result;
	}

	async loadContent(): Promise<void> {
		const result = await this.#run(() => this.#client.getContent());
		if (result) this.content = result;
	}

	async loadSessions(): Promise<void> {
		const result = await this.#run(() => this.#client.getSessions());
		if (result) this.sessions = result;
	}

	async restart(id: string): Promise<void> {
		await this.#run(() => this.#client.restartRobot(id));
		await this.loadFleet();
	}

	async suspend(id: string): Promise<void> {
		await this.#run(() => this.#client.suspendRobot(id));
		await this.loadFleet();
	}

	getRobot(id: string): Promise<RobotSummary> {
		return this.#client.getRobot(id);
	}

	async #run<T>(task: () => Promise<T>): Promise<T | null> {
		this.loading = true;
		this.error = null;
		try {
			return await task();
		} catch (error) {
			this.error = (error as Error).message;
			return null;
		} finally {
			this.loading = false;
		}
	}
}

export const cloud = new CloudStore();

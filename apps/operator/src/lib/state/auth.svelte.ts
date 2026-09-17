import { config } from '../config';

/**
 * Local-control PIN gate. Demo-only: the PIN is compared in the app so the flow
 * can be shown without firmware support. The shipping design verifies it on the
 * ESP32.
 */
class AuthStore {
	unlocked = $state(false);
	error = $state<string | null>(null);

	tryUnlock(pin: string): boolean {
		if (pin === config.operatorPin) {
			this.unlocked = true;
			this.error = null;
			return true;
		}
		this.error = 'Incorrect PIN';
		return false;
	}

	lock(): void {
		this.unlocked = false;
		this.error = null;
	}
}

export const auth = new AuthStore();

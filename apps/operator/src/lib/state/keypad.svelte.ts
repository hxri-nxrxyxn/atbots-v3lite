interface ActiveInputSession {
	id: string;
	getValue: () => string;
	setValue: (val: string) => void;
	maxlength: number;
	showDecimal: boolean;
	label?: string;
	onComplete?: (val: string) => void;
}

class KeypadStore {
	isOpen = $state(false);
	currentSession = $state<ActiveInputSession | null>(null);

	open(session: ActiveInputSession) {
		this.currentSession = session;
		this.isOpen = true;
	}

	close() {
		this.isOpen = false;
		this.currentSession = null;
	}

	pressDigit(digit: string) {
		if (!this.currentSession) return;
		const current = this.currentSession.getValue();
		if (current.length >= this.currentSession.maxlength) return;
		if (digit === '.' && (current.includes('.') || !this.currentSession.showDecimal)) return;

		const next = current + digit;
		this.currentSession.setValue(next);

		if (next.length === this.currentSession.maxlength && this.currentSession.onComplete) {
			this.currentSession.onComplete(next);
		}
	}

	backspace() {
		if (!this.currentSession) return;
		const current = this.currentSession.getValue();
		if (current.length > 0) {
			this.currentSession.setValue(current.slice(0, -1));
		}
	}

	clear() {
		if (!this.currentSession) return;
		this.currentSession.setValue('');
	}
}

export const keypad = new KeypadStore();

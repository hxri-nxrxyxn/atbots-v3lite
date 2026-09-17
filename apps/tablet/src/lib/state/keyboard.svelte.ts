export type KeyboardMode = 'numeric' | 'alphanumeric';

export interface ActiveInputSession {
	id: string;
	mode: KeyboardMode;
	getValue: () => string;
	setValue: (val: string) => void;
	maxlength: number;
	showDecimal: boolean;
	label?: string;
	onComplete?: (val: string) => void;
}

class KeyboardStore {
	isOpen = $state(false);
	currentSession = $state<ActiveInputSession | null>(null);

	// Alphanumeric state toggles
	isShift = $state(false);
	isSymbols = $state(false);

	open(session: ActiveInputSession) {
		this.currentSession = session;
		this.isShift = false;
		this.isSymbols = false;
		this.isOpen = true;
	}

	close() {
		this.isOpen = false;
		this.currentSession = null;
		this.isShift = false;
		this.isSymbols = false;
	}

	toggleShift() {
		this.isShift = !this.isShift;
	}

	toggleSymbols() {
		this.isSymbols = !this.isSymbols;
		this.isShift = false;
	}

	pressKey(char: string) {
		if (!this.currentSession) return;
		const current = this.currentSession.getValue();
		if (current.length >= this.currentSession.maxlength) return;
		if (
			char === '.' &&
			current.includes('.') &&
			this.currentSession.mode === 'numeric' &&
			!this.currentSession.showDecimal
		) {
			return;
		}

		let nextChar = char;
		if (this.currentSession.mode === 'alphanumeric' && !this.isSymbols) {
			nextChar = this.isShift ? char.toUpperCase() : char.toLowerCase();
		}

		const next = current + nextChar;
		this.currentSession.setValue(next);

		// If shift was on, reset after 1 character (standard touch behavior)
		if (this.isShift && !this.isSymbols) {
			this.isShift = false;
		}

		if (next.length === this.currentSession.maxlength && this.currentSession.onComplete) {
			this.currentSession.onComplete(next);
		}
	}

	pressSpace() {
		if (!this.currentSession) return;
		const current = this.currentSession.getValue();
		if (current.length >= this.currentSession.maxlength) return;
		this.currentSession.setValue(current + ' ');
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

export const keyboard = new KeyboardStore();
// Backward compatibility alias
export const keypad = keyboard;

/** Thin wrapper over the browser speech synthesiser. */
export interface Voice {
	readonly available: boolean;
	speak(text: string): Promise<void>;
	stop(): void;
	voices(): SpeechSynthesisVoice[];
	get voiceUri(): string | null;
	setVoice(uri: string | null): void;
}

export class BrowserVoice implements Voice {
	#voiceUri: string | null = null;

	get available(): boolean {
		return typeof window !== 'undefined' && 'speechSynthesis' in window;
	}

	get voiceUri(): string | null {
		return this.#voiceUri;
	}

	setVoice(uri: string | null): void {
		this.#voiceUri = uri;
	}

	speak(text: string): Promise<void> {
		if (!this.available) return Promise.resolve();

		return new Promise((resolve) => {
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.rate = 1;
			utterance.pitch = 1;

			const selected = this.#voiceUri
				? speechSynthesis.getVoices().find((voice) => voice.voiceURI === this.#voiceUri)
				: undefined;
			if (selected) utterance.voice = selected;

			let settled = false;
			const done = () => {
				if (settled) return;
				settled = true;
				resolve();
			};
			utterance.onend = done;
			utterance.onerror = done;

			speechSynthesis.cancel();
			speechSynthesis.speak(utterance);
		});
	}

	stop(): void {
		if (this.available) speechSynthesis.cancel();
	}

	voices(): SpeechSynthesisVoice[] {
		return this.available ? speechSynthesis.getVoices() : [];
	}
}

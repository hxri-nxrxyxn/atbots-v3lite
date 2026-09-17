import { config } from './config';

interface SpeechRecognitionAlternativeLike {
	transcript: string;
}

interface SpeechRecognitionResultLike {
	readonly length: number;
	[index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
	readonly length: number;
	[index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
	results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorLike {
	error: string;
}

interface SpeechRecognitionLike {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	maxAlternatives: number;
	start(): void;
	stop(): void;
	onresult: ((event: SpeechRecognitionEventLike) => void) | null;
	onend: (() => void) | null;
	onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
	if (typeof window === 'undefined') return null;
	const candidate = window as unknown as {
		SpeechRecognition?: SpeechRecognitionCtor;
		webkitSpeechRecognition?: SpeechRecognitionCtor;
	};
	return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export interface RecognizerHandlers {
	onResult: (text: string) => void;
	onEnd: () => void;
	onError: (error: string) => void;
}

export interface Recognizer {
	readonly available: boolean;
	start(handlers: RecognizerHandlers): void;
	stop(): void;
}

/** Web Speech API recogniser. Needs a secure context (https or localhost). */
export class WebSpeechRecognizer implements Recognizer {
	#recognition: SpeechRecognitionLike | null = null;

	get available(): boolean {
		return getCtor() !== null && window.isSecureContext;
	}

	start(handlers: RecognizerHandlers): void {
		const Ctor = getCtor();
		if (!Ctor || !window.isSecureContext) {
			handlers.onError('unsupported');
			return;
		}

		this.stop();
		const recognition = new Ctor();
		recognition.lang = config.speechLang;
		recognition.continuous = false;
		recognition.interimResults = false;
		recognition.maxAlternatives = 1;

		recognition.onresult = (event) => {
			const result = event.results[event.results.length - 1];
			const text = result?.[0]?.transcript?.trim() ?? '';
			if (text) handlers.onResult(text);
		};
		recognition.onerror = (event) => handlers.onError(event.error);
		recognition.onend = () => handlers.onEnd();

		this.#recognition = recognition;
		try {
			recognition.start();
		} catch {
			this.#recognition = null;
			handlers.onError('start_failed');
		}
	}

	stop(): void {
		try {
			this.#recognition?.stop();
		} catch {
			// already stopped
		}
		this.#recognition = null;
	}
}

export const recognizer = new WebSpeechRecognizer();

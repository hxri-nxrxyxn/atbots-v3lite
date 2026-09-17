const env = import.meta.env as Record<string, string | undefined>;

export const config = {
	robotId: env.PUBLIC_ROBOT_ID ?? 'bot-001',
	relayUrl: env.PUBLIC_RELAY_URL ?? 'ws://localhost:8787/v1/session',
	cloudUrl: env.PUBLIC_CLOUD_URL ?? 'http://localhost:8787',
	espUrl: env.PUBLIC_ESP_URL ?? 'ws://192.168.0.155/ws',
	speechLang: env.PUBLIC_SPEECH_LANG ?? 'en-IN'
};

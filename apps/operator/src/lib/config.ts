const env = import.meta.env as Record<string, string | undefined>;

export const config = {
	robotId: env.PUBLIC_ROBOT_ID ?? 'bot-001',
	cloudUrl: env.PUBLIC_CLOUD_URL ?? 'http://localhost:8787',
	espUrl: env.PUBLIC_ESP_URL ?? 'ws://192.168.0.155/ws',
	/** Demo-only: the real build verifies the PIN on the ESP. */
	operatorPin: env.PUBLIC_OPERATOR_PIN ?? '123456'
};

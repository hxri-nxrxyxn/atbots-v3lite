import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// SPA mode: every route is served from the static fallback page.
			adapter: adapter({ fallback: 'index.html' }),

			// One JS bundle + one CSS file. Friendlier to the Capacitor local
			// server, which is HTTP/1 and limits concurrent connections.
			output: { bundleStrategy: 'single' }
		})
	]
});

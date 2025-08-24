import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Increase the chunk size warning limit to 1000kb for this project
		chunkSizeWarningLimit: 1000
	}
});

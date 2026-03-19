import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		external: [
			'better-sqlite3',
			'node-cron',
			'node-ical',
			'rss-parser',
			'openai',
			'cheerio',
			'playwright'
		]
	}
});

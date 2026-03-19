/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				gendo: {
					bg: '#0c0c0e',
					surface: '#141416',
					muted: '#1c1c1e',
					accent: '#e07a5f',
					cream: '#f5f3f0',
					'text-muted': '#71717a',
				}
			}
		}
	},
	plugins: []
};

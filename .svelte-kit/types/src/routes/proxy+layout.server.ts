// @ts-nocheck
import type { LayoutServerLoad } from './$types';

export const load = async () => {
	return {
		// Meta por defecto para SEO (páginas hijas pueden sobrescribir)
		meta: {
			title: 'Gendo — Events & Things to Do in Cedar Rapids, IA',
			description: 'Discover events, concerts, markets, and things to do in Cedar Rapids, Iowa. Free and paid events, live music, festivals, food, and more.',
		},
	};
};
;null as any as LayoutServerLoad;
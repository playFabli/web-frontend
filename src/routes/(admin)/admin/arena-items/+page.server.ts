import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('token') ?? null;

	return {
		title: 'Arena Items',
		token
	};
};

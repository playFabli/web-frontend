import type { PageServerLoad } from './$types';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
	const token = cookies.get('token');

	return { title: `Settings`, token };
};

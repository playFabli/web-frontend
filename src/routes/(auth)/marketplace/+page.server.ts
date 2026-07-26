import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const token = cookies.get('token') || null;
	const response = await fetch(`${config.internalApi}/marketplace/categories`, {
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		}
	});

	if(!response.ok) {
		throw new Error('Failed to fetch categories');
	}

	const categories = await response.json();

	return {
		title: "Marketplace",
		categories: categories.data,
		token
	};
};

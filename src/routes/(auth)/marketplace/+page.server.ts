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

	// Fetch collections for filter
	const collectionsResponse = await fetch(`${config.internalApi}/marketplace/collections`, {
		headers: {
			'Authorization': `Bearer ${token}`,
			'Accept': 'application/json'
		}
	});

	let collections = [];
	if (collectionsResponse.ok) {
		const collectionsJson = await collectionsResponse.json();
		collections = collectionsJson.data || [];
	}

	return {
		title: "Marketplace",
		categories: categories.data,
		token,
		collections
	};
};

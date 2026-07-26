import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	let token = cookies.get("token") || null;
	let categories: any = [];
	try {
		const response = await fetch(`${config.api}/forum/categories`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			}
		});
		if (!response.ok) {
			throw error(response.status, 'Failed to fetch categories');
		}

		categories = await response.json();
	} catch (err) {
		throw error(500, 'Error loading categories');
	}

	return { title: "New Thread", categories: categories.data, token };
};

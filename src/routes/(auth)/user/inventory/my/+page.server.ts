import type { PageServerLoad } from './$types';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ fetch, cookies, url }) => {
	const token = cookies.get('token');
	const page = url.searchParams.get('page') || '1';

	// Fetch user's inventory with pagination
	let inventory: any[] = [];
	let pagination: any = {
		current_page: 1,
		last_page: 1,
		total: 0,
		per_page: 20
	};
	
	try {
		const invRes = await fetch(`${config.internalApi}/user/inventory/me?page=${page}&limit=20&show_duplicates=1`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		const data = await invRes.json();
		if (invRes.ok) {
			inventory = data.data || [];
			pagination = {
				current_page: data.current_page || 1,
				last_page: data.last_page || 1,
				total: data.total || 0,
				per_page: data.per_page || 20
			};
		}
	} catch (e) {
		console.error('Failed to load inventory', e);
	}

	return { title: `Your Inventory`, token, inventory, pagination };
};
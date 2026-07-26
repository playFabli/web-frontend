import type { PageServerLoad } from './$types';
import { config } from '$lib/config';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
	const token = cookies.get('token');

	const res = await fetch(`${config.internalApi}/user/${params.id}`, {
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			Authorization: `Bearer ${token}`,
		},
	});

	if (!res.ok) {
		console.log(res)
		error(404, {
				message: 'The requested resource could not be found.'
			});
	}

	const user = await res.json();

	const catRes = await fetch(`${config.internalApi}/marketplace/categories`, {
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		}
	});

	if (!catRes.ok) {
		throw new Error('Failed to fetch categories');
	}

	const categories = await catRes.json();

	return { title: `${user.data.username}'s Inventory`, user: user.data, categories: categories.data, token };
};

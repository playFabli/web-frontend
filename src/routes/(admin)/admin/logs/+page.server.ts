import { error } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
	const token = cookies.get('token') ?? null;
	const page = url.searchParams.get('page') ?? '1';

	const response = await fetch(`${config.internalApi}/admin/logs?page=${page}`, {
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		}
	});

	if (!response.ok) {
		throw error(response.status, 'Failed to load admin logs');
	}

	const json = await response.json();

	return {
		title: 'Admin Logs',
		token,
		logs: json
	};
};
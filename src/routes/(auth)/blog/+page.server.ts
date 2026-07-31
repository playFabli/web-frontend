import type { PageServerLoad } from './$types';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const token = cookies.get('token');

	let posts: any[] = [];
	try {
		const res = await fetch(`${config.internalApi}/blog`, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		});
		if (res.ok) {
			const json = await res.json();
			posts = json.data ?? [];
		} else {
			const json = await res.json();
			console.log(json)
		}
	} catch (e) {
		console.error('Failed to load blog posts', e);
	}

	return { title: 'Blog', token, posts };
};
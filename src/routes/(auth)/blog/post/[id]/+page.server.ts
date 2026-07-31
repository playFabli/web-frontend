import type { PageServerLoad } from './$types';
import { config } from '$lib/config';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
	const token = cookies.get('token');
	const { id } = params;

	let post: any = null;
	try {
		const res = await fetch(`${config.internalApi}/blog/${id}`, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		});
		if (res.ok) {
			const json = await res.json();
			post = json.data ?? null;
		}
	} catch (e) {
		console.error('Failed to load blog post', e);
	}

	if (!post) {
		throw error(404, 'Post not found');
	}

	return { title: post.title, token, post };
};
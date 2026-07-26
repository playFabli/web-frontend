import { config } from '$lib/config';
import { error } from '@sveltejs/kit';

export async function load({ params, fetch, cookies }) {
	const token = cookies.get('token') || null;
	const response = await fetch(`${config.internalApi}/forum/thread/${params.id}`, {
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		}
	});

	
	if (!response.ok) {
		throw error(response.status, 'Failed to load thread');
	}
	
	const thread = await response.json();
	
	console.log(thread);
	return {
		title: thread.data.title,
		thread: thread.data,
		token
	};
}

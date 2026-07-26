import type { PageServerLoad } from './$types';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
	const token = cookies.get('token');

	// Fetch quests
	let quests: any[] = [];
	try {
		const questRes = await fetch(`${config.internalApi}/user/quests`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		quests = await questRes.json();
		if (questRes.ok) {
		} else {
			console.log(quests);
			console.log(questRes);
		}
	} catch (e) {
		console.error('Failed to load quests', e);
	}

	return { title: `Homepage`, token, quests };
};
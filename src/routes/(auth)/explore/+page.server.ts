import type { PageServerLoad } from './$types';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { token } = await parent();

	const response = await fetch(`${config.internalApi}/games`, {
		headers: {
			'Authorization': `Bearer ${token}`,
			'Accept': 'application/json'
		}
	});
	const games = await response.json();

	return { 
		title: `Explore`, 
		games: games
	};
};
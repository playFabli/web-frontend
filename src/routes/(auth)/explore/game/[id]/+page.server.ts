import type { PageServerLoad } from './$types';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ parent, params, fetch }) => {
	const { token } = await parent();
	const gameId = params.id;

	const response = await fetch(`${config.internalApi}/games/${gameId}`, {
		headers: {
			'Authorization': `Bearer ${token}`,
			'Accept': 'application/json'
		}
	});
	const game = await response.json();

	return { 
		title: `Game`, 
		game: game.data || game
	};
};
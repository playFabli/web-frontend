import type { PageServerLoad } from './$types';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ fetch }) => {
	const newestUsersRes = await fetch(`${config.api}/user/newest`);
	console.log(newestUsersRes);
	const newestUsersData = await newestUsersRes.json();

	return {
		newestUsers: newestUsersData.data || []
	};
};
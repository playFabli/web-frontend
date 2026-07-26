import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies }) => {
	const token = cookies.get('token');

	if (token) {
		// User has a token, redirect them to the authenticated area
		throw redirect(307, '/user/homepage');
	}

	return {};
};
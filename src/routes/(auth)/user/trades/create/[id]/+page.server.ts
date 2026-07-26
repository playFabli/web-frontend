import type { PageServerLoad } from './$types';
import {config} from '$lib/config';

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
    return { user: null };
  }

  const user = await res.json();
  return { title: `Trade with ${user.data.username}`, user: user.data, token };
};

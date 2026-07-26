import type { PageServerLoad } from './$types';
import { config } from '$lib/config';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch, cookies, url }) => {
  const token = cookies.get('token');
  const page = url.searchParams.get('page') || '1';

  const res = await fetch(`${config.internalApi}/user/friends/${params.id}?page=${page}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    error(404, {
      message: 'User not found',
    });
  }

  const data = await res.json();

  return {
    friends: data,
    userId: params.id,
    token,
  };
};
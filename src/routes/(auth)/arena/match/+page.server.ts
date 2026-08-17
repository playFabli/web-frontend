import { redirect } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const token = cookies.get('token') ?? null;

  const response = await fetch(`${config.internalApi}/arena/match/active`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  const json = await response.json();

  if (!response.ok || !json?.data) {
    throw redirect(307, '/arena');
  }

  return {
    title: 'Arena Match',
    token,
    match: json.data
  };
};

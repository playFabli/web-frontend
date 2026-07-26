import type { PageServerLoad } from './$types';
import {config} from '$lib/config';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
  const token = cookies.get('token');

  const res = await fetch(`${config.internalApi}/user/transactions`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const json = await res.json();
    console.log(json);
    error(404, {
      message: 'Failed to load transactions.'
    });
  }

  const json = await res.json();

  return { title: 'Transactions', transactions: json.data, token };
};

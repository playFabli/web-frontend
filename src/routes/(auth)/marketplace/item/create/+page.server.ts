import { error, redirect } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const token = cookies.get('token') ?? null;

  const response = await fetch(`${config.internalApi}/marketplace/categories/0`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw error(response.status, 'Failed to load categories');
  }

  const json = await response.json();
  console.log(json);

  return {
    title: 'Create Item',
    token,
    categories: json.data || []
  };
};
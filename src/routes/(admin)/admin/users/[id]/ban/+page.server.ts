import { error } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies, fetch }) => {
  const { id } = params;
  const token = cookies.get('token') ?? null;

  const response = await fetch(`${config.internalApi}/admin/users/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw error(response.status, 'Failed to load user');
  }

  const json = await response.json();

  return {
    title: `Ban ${json.data.username}`,
    token,
    user: json.data
  };
};
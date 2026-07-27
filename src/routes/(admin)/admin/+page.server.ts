import { error } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const token = cookies.get('token') ?? null;

  const response = await fetch(`${config.internalApi}/admin/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
  const json = await response.json();
  console.log(json);

    console.error("Failed to load dashboard")
    throw error(response.status, 'Failed to load dashboard');
  }

  const json = await response.json();
  console.log(json);

  return {
    title: 'Admin Dashboard',
    token,
    stats: json.data
  };
};
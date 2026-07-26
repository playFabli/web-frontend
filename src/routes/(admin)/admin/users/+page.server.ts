import { error } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
  const token = cookies.get('token') ?? null;
  const query = url.searchParams.get('query') ?? '';
  const role = url.searchParams.get('role') ?? '';
  const page = url.searchParams.get('page') ?? '1';

  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (role) params.set('role', role);
  params.set('page', page);

  const response = await fetch(`${config.internalApi}/admin/users?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw error(response.status, 'Failed to load users');
  }

  const json = await response.json();

  return {
    title: 'Manage Users',
    token,
    users: json
  };
};
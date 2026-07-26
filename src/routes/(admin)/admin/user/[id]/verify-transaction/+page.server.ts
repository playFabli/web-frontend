import { error } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const { id } = params;
  const token = cookies.get('token') ?? null;

  const response = await fetch(`${config.internalApi}/admin/user/${id}/pending-transactions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
	let json = await response.json();
	console.log(json);
    throw error(response.status, 'Failed to load pending transactions');
  }

  const json = await response.json();

  return {
    title: `Verify Transactions - ${json.user?.username || 'User'}`,
    token,
    userId: id,
    user: json.user,
    transactions: json.data
  };
};

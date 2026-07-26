import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token') || '';

  if (!token) {
    throw error(400, 'Reset token is required.');
  }

  return {
    token
  };
};
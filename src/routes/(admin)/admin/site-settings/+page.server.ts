import { error } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const token = cookies.get('token') ?? null;

  // Fetch site settings
  const response = await fetch(`${config.internalApi}/admin/site-settings`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    console.error("Failed to load site settings");
    throw error(response.status, 'Failed to load site settings');
  }

  const json = await response.json();

  // Fetch current user to verify admin role
  const userResponse = await fetch(`${config.internalApi}/user/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!userResponse.ok) {
    throw error(307, '/user/login');
  }

  const userJson = await userResponse.json();

  // Only allow admins, not moderators
  if (userJson.data.role !== 'admin') {
    throw error(403, 'Forbidden');
  }

  return {
    title: 'Site Settings',
    token,
    settings: json.data,
    user: userJson.data
  };
};

import { error } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies, fetch }) => {
  const { id } = params;
  const token = cookies.get('token') ?? null;

  // Fetch the item
  const response = await fetch(`${config.internalApi}/marketplace/item/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw error(response.status, 'Failed to load item');
  }

  const json = await response.json();

  // Fetch categories for the dropdown
  const catResponse = await fetch(`${config.internalApi}/marketplace/categories/0`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  let categories = [];
  if (catResponse.ok) {
    const catJson = await catResponse.json();
    categories = catJson.data || [];
  }

  return {
    title: `Edit ${json.data.title}`,
    token,
    item: json.data,
    categories
  };
};
import { error } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies, fetch }) => {
  const { id } = params;
  const token = cookies.get('token') ?? null;

  const response = await fetch(`${config.internalApi}/admin/assets/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw error(response.status, 'Failed to load asset');
  }

  const json = await response.json();

  // also fetch categories for the dropdown
  const catResponse = await fetch(`${config.internalApi}/marketplace/categories`, {
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

  // Fetch collections
  const collectionsResponse = await fetch(`${config.api}/admin/collections`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  let collections = [];
  if (collectionsResponse.ok) {
    const colJson = await collectionsResponse.json();
    collections = colJson.data || [];
  }

  return {
    title: `Edit ${json.data.title}`,
    token,
    item: json.data,
    categories,
    collections
  };
};
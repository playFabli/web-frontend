import { error } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

interface Category {
  id: number;
  title: string;
  is_admin_only: boolean;
  has_model: boolean;
  has_texture: boolean;
  parts_affected: string;
}

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const token = cookies.get('token') ?? null;

  const catResponse = await fetch(`${config.api}/marketplace/categories`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  let categories: Category[] = [];
  if (catResponse.ok) {
    const catJson = await catResponse.json();
    categories = catJson.data || [];
  }

  return {
    title: 'Create Asset',
    token,
    categories
  };
};

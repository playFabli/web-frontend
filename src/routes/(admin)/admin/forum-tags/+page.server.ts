import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  const token = cookies.get('token') ?? null;

  const tagsResponse = await fetch(`${config.api}/admin/forum-tags`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  let tags = [];
  if (tagsResponse.ok) {
    const json = await tagsResponse.json();
    tags = json.data || [];
  }

  return {
    title: 'Forum Tags',
    token,
    tags
  };
};

import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const token = cookies.get('token') ?? null;

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

  const tagsResponse = await fetch(`${config.api}/admin/forum-tags`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  let forumTags = [];
  if (tagsResponse.ok) {
    const tagsJson = await tagsResponse.json();
    forumTags = tagsJson.data || [];
  }

  return {
    title: 'Manage Collections',
    token,
    collections,
    forumTags
  };
};

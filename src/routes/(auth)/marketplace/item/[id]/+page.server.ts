import { error } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies, fetch }) => {
  const { id } = params;
  const token = cookies.get('token') ?? null;

  const response = await fetch(`${config.internalApi}/marketplace/item/${id}`, {
    headers: {
		'Authorization': `Bearer ${token}`,
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	}
  });

  if (!response.ok) {
	console.log(await response.json());
    throw error(response.status, 'Failed to load marketplace item');
  }

  const items = await response.json();

  // check if owns
  const ownsResponse = await fetch(`${config.internalApi}/marketplace/owns/${id}`, {
	headers: {
		'Authorization': `Bearer ${token}`,
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	}
  })

  if (!ownsResponse.ok) {
	throw error(ownsResponse.status, 'Failed to check if owns');
  }

  const owns = await ownsResponse.json();

  return {
    title: items.data.title,
    token,
    item: items.data,
    owns: owns.bool,
    ownerData: owns.data
  };
};

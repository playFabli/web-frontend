import type { PageServerLoad } from './$types';
import {config} from '$lib/config';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
  const token = cookies.get('token');

  const res = await fetch(`${config.internalApi}/user/${params.id}`, {
    headers: {
	  'Content-Type': 'application/json',
	  Accept: 'application/json',
	  Authorization: `Bearer ${token}`,
	},
  });

  if (!res.ok) {
    const user = await res.json();
	  console.log(user)
    error(404, {
          message: 'The requested resource could not be found.'
      });
  }

  const user = await res.json();
  if(user.data != null) {
    return { title: `${user.data.username}'s Profile`, user: user.data, token };
  } else {
    return { title: `Profile`, user: user.data, token };
  }
};

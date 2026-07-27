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

  // Fetch profile customization for the viewed user
  const customizationRes = await fetch(`${config.internalApi}/marketplace/profile-customization`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  let profileCustomization = null;
  if (customizationRes.ok) {
    const customizationJson = await customizationRes.json();
    profileCustomization = customizationJson.data;
  }

  if(user.data != null) {
    return { title: `${user.data.username}'s Profile`, user: user.data, token, profileCustomization };
  } else {
    return { title: `Profile`, user: user.data, token, profileCustomization };
  }
};

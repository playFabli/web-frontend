import type { LayoutServerLoad } from './$types';
import { config } from '$lib/config';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ fetch, cookies, url, depends }) => {
  depends('app:layout-data'); 
  const token = cookies.get('token');

  if (!token) {
    throw redirect(307, '/user/login');
  }

  const response = await fetch(`${config.internalApi}/user/me`, {
    headers: {
	  "Content-Type": "application/json",
	  "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });

  const user = await response.json();
  if (!response.ok) {
  console.log(user);
	return { user: null };
  }

  // Check for active ban (but don't redirect if already on banned page)
  const isOnBannedPage = url.pathname === '/user/banned';
  
  if (!isOnBannedPage) {
    const banResponse = await fetch(`${config.internalApi}/user/ban-status`, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (banResponse.ok) {
      const banData = await banResponse.json();
      if (banData.data?.is_banned) {
        throw redirect(307, '/user/banned');
      }
    }
  }

  return { user: user.data, globalUser: user.data, token };
};
import type { LayoutServerLoad } from './$types';
import { config } from '$lib/config';
import { goto } from '$app/navigation';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ fetch, cookies, depends, url }) => {
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
	throw redirect(307, '/user/homepage');
  }

  const role = user.data.role;
  if (role !== "admin" && role !== "moderator" && role !== "asset_creator") {
	throw redirect(307, '/user/homepage');
  }

  // Asset creators can only access the Assets section of the admin panel
  if (role === "asset_creator" && !url.pathname.startsWith('/admin/assets')) {
	throw redirect(307, '/admin/assets');
  }

  return { user: user.data, globalUser: user.data, token };
};

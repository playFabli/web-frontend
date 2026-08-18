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

  // Global site settings for the announcement bar (configurable in the
  // admin panel's site settings).
  let bannerMessage: string | null = null;
  const settingsResponse = await fetch(`${config.internalApi}/site-settings`, {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });
  if (settingsResponse.ok) {
    const settingsJson = await settingsResponse.json();
    bannerMessage = settingsJson.data?.banner_message || null;
  }

  // Cached unread mailbox count for the nav badge. The backend caches this
  // per user and resets the cache when a notification is created or read.
  let mailboxUnread = 0;
  const unreadResponse = await fetch(`${config.internalApi}/user/mailbox/unread-count`, {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (unreadResponse.ok) {
    const unreadJson = await unreadResponse.json();
    mailboxUnread = unreadJson.data?.unread_count ?? 0;
  }

  // Cached pending friend-request count for the nav badge. The backend caches
  // this per user and resets the cache when a request is sent or resolved.
  let friendRequestCount = 0;
  const friendRequestResponse = await fetch(`${config.internalApi}/user/friend/requests/count`, {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (friendRequestResponse.ok) {
    const friendRequestJson = await friendRequestResponse.json();
    friendRequestCount = friendRequestJson.data?.count ?? 0;
  }

  return { user: user.data, globalUser: user.data, token, bannerMessage, mailboxUnread, friendRequestCount };
};
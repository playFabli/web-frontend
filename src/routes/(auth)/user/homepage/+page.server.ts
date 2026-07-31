import type { PageServerLoad } from './$types';
import { config } from '$lib/config';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const token = cookies.get('token');

	let quests: any[] = [];
	let activities: any[] = [];
	let newestItems: any[] = [];
	let newestPosts: any[] = [];
	let newestBlogPosts: any[] = [];
	let frameCss: Record<string, string> = {};

	try {
		const [questRes, activityRes, itemsRes, postsRes, blogRes] = await Promise.all([
			fetch(`${config.internalApi}/user/quests`, {
				headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
			}),
			fetch(`${config.internalApi}/user/activity-feed`, {
				headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
			}),
			fetch(`${config.internalApi}/user/newest-items`, {
				headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
			}),
			fetch(`${config.internalApi}/user/newest-posts`, {
				headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
			}),
			fetch(`${config.internalApi}/user/newest-blog-posts`, {
				headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
			}),
		]);

		if (questRes.ok) {
			const json = await questRes.json();
			quests = json.data ?? [];
		}
		if (activityRes.ok) {
			const json = await activityRes.json();
			activities = json.data ?? [];
		}
		if (itemsRes.ok) {
			const json = await itemsRes.json();
			newestItems = json.data ?? [];
		}
		if (postsRes.ok) {
			const json = await postsRes.json();
			newestPosts = json.data ?? [];
		}
		if (blogRes.ok) {
			const json = await blogRes.json();
			newestBlogPosts = json.data ?? [];
		}
	} catch (e) {
		console.error('Failed to load homepage data', e);
	}

	// Collect unique avatar frame IDs from the current user and activity feed users.
	const frameIds = new Set<number>();
	if (activities?.length) {
		for (const activity of activities) {
			if (activity.user?.avatar_frame_id) {
				frameIds.add(activity.user.avatar_frame_id);
			}
		}
	}

	if (frameIds.size > 0) {
		try {
			const res = await fetch(`${config.internalApi}/user/avatar/frames?ids=${Array.from(frameIds).join(',')}`, {
				headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
			});
			if (res.ok) {
				const json = await res.json();
				frameCss = json.data ?? {};
			}
		} catch (e) {
			console.error('Failed to load avatar frames', e);
		}
	}

	return {
		title: `Homepage`,
		token,
		quests,
		activities,
		frameCss,
		newestItems,
		newestPosts,
		newestBlogPosts,
	};
};
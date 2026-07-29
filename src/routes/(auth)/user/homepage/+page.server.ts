import type { PageServerLoad } from './$types';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
	const token = cookies.get('token');

	// Fetch quests
	let quests: any[] = [];
	try {
		const questRes = await fetch(`${config.internalApi}/user/quests`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		quests = await questRes.json();
		if (questRes.ok) {
		} else {
			console.log(quests);
			console.log(questRes);
		}
	} catch (e) {
		console.error('Failed to load quests', e);
	}

	// Fetch activity feed
	let activities: any[] = [];
	try {
		const activityRes = await fetch(`${config.internalApi}/user/activity-feed`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		const activityJson = await activityRes.json();
		if (activityRes.ok) {
			activities = activityJson.data ?? [];
		}
	} catch (e) {
		console.error('Failed to load activity feed', e);
	}

	// Fetch newest items (admin_only category)
	let newestItems: any[] = [];
	try {
		const newestItemsRes = await fetch(`${config.internalApi}/user/newest-items`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		if (newestItemsRes.ok) {
			const newestItemsJson = await newestItemsRes.json();
			newestItems = newestItemsJson.data ?? [];
		}
	} catch (e) {
		console.error('Failed to load newest items', e);
	}

	// Fetch newest forum posts
	let newestPosts: any[] = [];
	try {
		const newestPostsRes = await fetch(`${config.internalApi}/user/newest-posts`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		if (newestPostsRes.ok) {
			const newestPostsJson = await newestPostsRes.json();
			newestPosts = newestPostsJson.data ?? [];
		} else {
			const newestPostsJson = await newestPostsRes.json();
			console.log(newestPostsJson);
		}
	} catch (e) {
		console.error('Failed to load newest posts', e);
	}

	// Collect unique avatar frame IDs from the current user and activity feed users.
	// We deduplicate so we only fetch each frame stylesheet once (performance).
	// The global user's avatar_frame_id is available via page.data in the component,
	// but we also need it here for server-side CSS fetching.
	let globalUserAvatarFrameId = 0;
	try {
		const meRes = await fetch(`${config.internalApi}/user/me`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
		});
		if (meRes.ok) {
			const meJson = await meRes.json();
			globalUserAvatarFrameId = meJson.data?.avatar_frame_id ?? 0;
		}
	} catch (e) {
		console.error('Failed to load user data for frame CSS', e);
	}

	const frameIds = Array.from(
		new Set(
			[
				globalUserAvatarFrameId,
				...activities.map((a) => a.user?.avatar_frame_id),
				...newestItems.map((item) => item.user?.avatar_frame_id),
				...newestPosts.map((post) => post.user?.avatar_frame_id),
			].filter((id) => id && id > 0)
		)
	);

	// Fetch each frame's CSS server-side (no CORS issues), scope .avatar-frame to
	// a unique class (.avatar-frame-{id}) so multiple frames don't collide, and
	// accumulate into a single string.
	let frameCss = '';
	for (const frameId of frameIds) {
		try {
			const cssRes = await fetch(`${config.storage}/stylesheets/${frameId}.css`);
			if (cssRes.ok) {
				const css = await cssRes.text();
				const scoped = css.replace(/\.avatar-frame\b/g, `.avatar-frame-${frameId}`);
				frameCss += scoped + '\n';
			}
		} catch (e) {
			console.error(`Failed to load frame CSS ${frameId}`, e);
		}
	}

	return { title: `Homepage`, token, quests, activities, frameCss, newestItems, newestPosts };
};
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
			quests = json ?? [];
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
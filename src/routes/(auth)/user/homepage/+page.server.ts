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
	// 1. Change Promise.all to Promise.allSettled
	const results = await Promise.allSettled([
		fetch(`${config.internalApi}/user/quests`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }),
		fetch(`${config.internalApi}/user/activity-feed`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }),
		fetch(`${config.internalApi}/user/newest-items`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }),
		fetch(`${config.internalApi}/user/newest-posts`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }),
		fetch(`${config.internalApi}/user/newest-blog-posts`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }),
	]);

	// 2. Map results back to variables (destructuring)
	const [questRes, activityRes, itemsRes, postsRes, blogRes] = results;

	// 3. Helper function to safely parse JSON and log errors
	const handleResponse = async (result, endpointName) => {
		if (result.status === 'rejected') {
			console.error(`Network request failed for ${endpointName}:`, result.reason);
			return null;
		}
		
		const response = result.value;
		if (!response.ok) {
			console.error(`HTTP Error ${response.status} on ${endpointName}`);
			return null;
		}

		try {
			return await response.json();
		} catch (parseError) {
			// This will catch the exact endpoint throwing the SyntaxError
			const text = await response.text().catch(() => 'Could not read text');
			console.error(`JSON Parsing failed for [${endpointName}]. Server returned:`, text);
			return null;
		}
	};

	// 4. Safely process each response
	const questJson = await handleResponse(questRes, 'quests');
	if (questJson) quests = questJson ?? [];

	const activityJson = await handleResponse(activityRes, 'activity-feed');
	if (activityJson) activities = activityJson.data ?? [];

	const itemsJson = await handleResponse(itemsRes, 'newest-items');
	if (itemsJson) newestItems = itemsJson.data ?? [];

	const postsJson = await handleResponse(postsRes, 'newest-posts');
	if (postsJson) newestPosts = postsJson.data ?? [];

	const blogJson = await handleResponse(blogRes, 'newest-blog-posts');
	if (blogJson) newestBlogPosts = blogJson.data ?? [];

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
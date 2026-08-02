import type { PageServerLoad } from './$types';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ url, fetch }) => {
	const search = url.searchParams.get('search') ?? '';
	const sortBy = url.searchParams.get('sort_by') ?? 'newest';
	const page = parseInt(url.searchParams.get('page') ?? '1', 10) || 1;

	let users: any[] = [];
	let pagination = {
		current_page: 1,
		last_page: 1,
		total: 0,
		from: 0,
		to: 0,
		prev_page_url: null as string | null,
		next_page_url: null as string | null
	};
	let error = '';

	try {
		const res = await fetch(
			`${config.internalApi}/users?search=${encodeURIComponent(search)}&sort_by=${sortBy}&page=${page}`,
			{ headers: { Accept: 'application/json' } }
		);
		const json = await res.json();

		if (res.ok) {
			users = json.data || [];
			pagination = {
				current_page: json.current_page,
				last_page: json.last_page,
				total: json.total,
				from: json.from,
				to: json.to,
				prev_page_url: json.prev_page_url,
				next_page_url: json.next_page_url
			};
		} else {
			error = 'Failed to load users.';
		}
	} catch (e) {
		console.error('Failed to load users', e);
		error = 'Failed to load users.';
	}

	// Collect unique avatar frame IDs and fetch each frame's CSS server-side
	// (avoids CORS issues with client-side fetch to storage paths). Each frame's
	// .avatar-frame selector is rewritten to .avatar-frame-{id} so frames don't
	// collide.
	const frameIds = Array.from(
		new Set(
			users
				.map((u) => u.avatar_frame_id)
				.filter((id) => typeof id === 'number' && id > 0)
		)
	);

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
		title: 'Browse Users',
		users,
		pagination,
		frameCss,
		search,
		sortBy,
		currentPage: page,
		error
	};
};
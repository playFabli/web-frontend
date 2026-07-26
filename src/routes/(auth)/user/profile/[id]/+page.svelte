<script>
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { config } from '$lib/config.js';
	import { timeSince } from '$lib/timeAgo';
	let { data } = $props();
	
	function formatJoined(dateStr) {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		if (isNaN(d)) return dateStr;
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	let user = page.data.globalUser;
	
	// Check if profile is hidden (profile_visible is false and viewer is not owner or friend)
	// This is computed inline in the template
	
	async function fetchWall(page=1) {
		const res = await fetch(`${config.api}/user/wall/${data.user.id}?page=${page}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${data.token}`
			}
		});

		const json = await res.json();
		if (!res.ok) {
			console.error(json?.message || 'Failed to fetch wall.');
			return [];
		}

		return json || [];
	}
	let wallPromise = $state(fetchWall())

	let content = $state();
	let loading = $state(false);
	let error = $state('');
	async function postToWall() {
		try {
			loading = true;
			const res = await fetch(`${config.api}/user/wall/${data.user.id}/post`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({ content: content })
			});
			const json = await res.json();
			if (!res.ok) {
				error = json?.message || 'Failed to post to wall.';
				return;
			}

			content = ''
			wallPromise = fetchWall();
			error = ''
		} catch (err) {
			console.error(err);
			error = 'An error occurred';
		} finally {
			loading = false;
		}
	}

	async function fetchInventory() {
		const res = await fetch(`${config.api}/user/inventory/${data.user.id}?limit=5&pagination=0`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${data.token}`
			}
		});

		const json = await res.json();
		if (!res.ok) {
			console.error(json?.message || 'Failed to fetch inventory.');
			return [];
		}

		return json || [];
	}
	let inventoryPromise = $derived(fetchInventory());

	let friendLoading = $state(false);
	async function sendFriendRequest() {
		try {
			friendLoading = true;
			const res = await fetch(`${config.api}/user/friend/${data.user.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});
			const json = await res.json();
			if (!res.ok) {
				console.error(json?.message || 'Failed to send friend request.');
				return;
			}

			invalidateAll();
		} catch (err) {
			console.error(err);
		} finally {
			friendLoading = false;
		}
	}

	let formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}) 

	async function unfriend() {
		try {
			friendLoading = true;
			const res = await fetch(`${config.api}/user/unfriend/${data.user.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});
			const json = await res.json();
			if (!res.ok) {
				console.error(json?.message || 'Failed to unfriend.');
				return;
			}

			invalidateAll();
		} catch (err) {
			console.error(err);
		} finally {
			friendLoading = false;
		}
	}

</script>

{#if data.user && !data.user.privacy?.profile_visible && data.user.id !== user?.id && data.user.friend_status !== "friends"}
<div class="max-w-container mx-auto px-4 py-6">
	<div class="max-w-md mx-auto border border-gray-200 rounded p-6 bg-white text-center">
		<p class="text-4xl mb-3"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-10 inline mb-1 text-gray-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></p>
		<h1 class="text-xl font-bold text-gray-900 mb-2">Profile Hidden</h1>
		<p class="text-sm text-gray-600">
			This user's profile is hidden. You must be friends with them to view their profile.
		</p>
	</div>
</div>
{:else}
<main class="py-6">
	<div class="max-w-container mx-auto px-4">
		<div class="flex flex-col md:flex-row gap-5">
			<aside class="w-full md:w-52 flex-shrink-0">
				<div class="border border-gray-200 rounded p-3 text-center bg-white">
					<img src={config.avatarStorage + "/" + data.user.id + ".png?t=" + Date.now()} alt="BuilderJoe" class="w-full border border-gray-300" loading="lazy">
					<h1 class="text-lg font-bold text-gray-900 mt-2 flex items-center justify-center gap-1">
						{data.user.username}
						<span class="text-xs {data.user.is_online ? 'text-green-600' : 'text-gray-400'}">●</span>
					</h1>
					{#if data.user.is_online}
					<p class="text-xs text-gray-500 mt-0.5">Online now</p>
					{:else}
					<p class="text-xs text-gray-500 mt-0.5">Offline</p>
					{/if}
					<div class="mt-2 flex justify-center">
						<span class="bubble-message">"{data.user.bubble}"</span>
					</div>

					<div class="mt-3 flex gap-2">
						{#if data.user.id != user.id}
						<a href={`/user/trades/create/${data.user.id}`} class="btn-secondary flex-1 py-1 text-xs">Trade</a>
							{#if data.user.friend_status == "none"}
								<button onclick={sendFriendRequest} disabled={friendLoading} class="btn-secondary flex-1 py-1 text-xs">
									{#if friendLoading}
										Friending...
									{:else}
										Friend
									{/if}
								</button>
							{:else if data.user.friend_status == "sent" || data.user.friend_status == "received"}
								<button disabled class="btn-secondary flex-1 py-1 text-xs">Pending</button>
							{:else if data.user.friend_status == "friends"}
								<button  onclick={unfriend} disabled={friendLoading} class="btn-secondary flex-1 py-1 text-xs">
									{#if friendLoading}
										Unfriending...
									{:else}
										Unfriend
									{/if}
								</button>
							{/if}
						{/if}
					</div>

					<div class="mt-3 text-left text-xs text-gray-600 space-y-1">
						<p><span class="font-medium">ID:</span> #{data.user.id}</p>
						<p><span class="font-medium">Joined:</span> {formatJoined(data.user.created_at)}</p>
						{#if data.user.privacy.show_last_online_time}
						<p><span class="font-medium">Last Online:</span> {timeSince(data.user.last_seen_at)} ago</p>
						{/if}
					</div>
					<!-- RAP & Leaderboard -->
					{#if data.user.privacy.show_rap}
					<div class="mt-3 border-t border-gray-100 pt-3 text-left">
						<p class="text-xs font-semibold text-gray-700">VAL: <span class="text-primary font-bold text-sm">{formatter.format(data.user.final_rap)}</span></p>
						<p class="text-xs text-gray-600">Leaderboard: <span class="font-medium text-accent">#{formatter.format(data.user.leaderboard_rank)}</span></p>
						<div class="w-full h-1.5 bg-gray-200 rounded-full mt-1">
							<div class="h-full bg-accent rounded-full" style="width: {data.user.leaderboard_percentile}%;"></div>
						</div>
						<p class="text-xs text-gray-400 mt-0.5">Top {data.user.leaderboard_percentile}% of all players</p>
					</div>
					{/if}
				</div>
			</aside>

			<div class="flex-1">
				<div class="border border-gray-200 rounded p-3 mb-4 bg-white">
					<h2 class="text-sm font-semibold text-accent mb-1">About</h2>
					<p class="text-sm text-gray-700">{data.user.description}</p>
				</div>

				<div class="border border-gray-200 rounded p-3 mb-4 bg-white">
					<h2 class="text-sm font-semibold text-accent mb-2">Badges</h2>
					<div class="flex flex-wrap gap-2">
						{#if data.user.id < 102}
						<img title="This user is a member of the Founder's Programme!" src="/badges/FounderBadge.png" class="w-18 h-18" alt="">
						{/if}
					</div>
				</div>

				<div class="border border-gray-200 rounded p-3 mb-4 bg-white">
					<div class="flex items-center justify-between mb-2">
						<h2 class="text-sm font-semibold text-accent">Friends ({data.user.friends_count})</h2>
						<a href={`/user/friends/${data.user.id}`} class="text-xs text-primary hover:underline">View All →</a>
					</div>
					{#if data.user.friends.length === 0}
					<p class="text-sm text-neutral-500">No friends yet...</p>
					{:else}
					<div class="flex flex-wrap gap-3">
						{#each data.user.friends as friend}
						<a href={`/user/profile/${friend.id}`} class="flex flex-col items-center gap-1 w-16">
							<img src={config.avatarStorage + "/" + friend.id + ".png?t=" + Date.now()} alt={friend.username} class="w-12 h-12 rounded-full border border-gray-200" loading="lazy">
							<span class="text-xs text-gray-700 truncate w-full text-center">{friend.username}</span>
						</a>
						{/each}
					</div>
					{/if}
				</div>

				{#if data.user.privacy.who_can_see_inventory == 2 && data.user.id !== user?.id && data.user.friend_status !== "friends" || data.user.privacy.who_can_see_inventory == 0 || data.user.id == page.data.globalUser.id}
				<div class="border border-gray-200 rounded p-3 mb-4 bg-white">
					<div class="flex items-center justify-between mb-2">
						<h2 class="text-sm font-semibold text-accent">Inventory</h2>
						<a href={`/user/inventory/${data.user.id}`} class="text-xs text-primary hover:underline">View All →</a>
					</div>
					<div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
						{#await inventoryPromise}
							<p class="text-neutral-500 text-sm">Loading inventory...</p>
						{:then inventory}
							{#if inventory.length === 0}
							<p class="text-neutral-500 text-sm">No items yet...</p>
							{/if}
							{#each inventory as invObj}
							<div class="inventory-item">
								<img src={`${config.storage}/items/${invObj.item_id}.png?t=${Date.now()}`} alt="Retro Cap" loading="lazy">
								<p class="text-xs mt-1 truncate">{invObj.item.title}</p>
							</div>
							{/each}
						{/await}
					</div>
				</div>
				{/if}

				<div class="border border-gray-200 rounded p-3 bg-white">
					{#await wallPromise}
						<h2 class="text-sm font-semibold text-accent mb-2">Wall (...)</h2>
						<p class="text-sm text-gray-700">Loading wall...</p>
						<div class="mt-4 pt-3 flex items-center justify-between text-xs text-gray-600">
							<span>Page .. of ..</span>
							<div class="flex items-center gap-1">
								<button class="btn-secondary px-2 py-1 text-[11px]" disabled>Prev</button>
								<button class="btn-secondary px-2 py-1 text-[11px]" disabled>Next</button>
							</div>
						</div>		
					{:then wall}
						<h2 class="text-sm font-semibold text-accent mb-2">Wall ({wall.total})</h2>
						{#each wall.data as post}
						<div class="wall-comment flex gap-2">
							<img src={config.avatarStorage + "/" + post.author.id + ".png?t=" + Date.now()} alt="avatar" class="w-18 h-18 rounded-full">
							<div>
								<span class="text-xs font-semibold">{post.author.username}</span>
								<span class="text-xs text-gray-500 ml-1">{timeSince(post.created_at)} ago</span>
								<p class="text-sm text-gray-700">{post.content}</p>
							</div>
						</div>
						{/each}
						{#if wall.data.length == 0}
						<p class="text-sm text-neutral-500">No posts yet...</p>
						{/if}
						<div class="mt-4 pt-3 flex items-center justify-between text-xs text-gray-600">
							<span>Page {wall.current_page} of {wall.last_page}</span>
							<div class="flex items-center gap-1">
								{#if wall.prev_page_url == null}
								<button class="btn-secondary px-2 py-1 text-[11px]" disabled>Prev</button>
								{:else}
								<button class="btn-secondary px-2 py-1 text-[11px]" onclick={() => wallPromise = fetchWall(wall.current_page - 1)}>Prev</button>
								{/if}
								{#if wall.next_page_url == null}
								<button class="btn-secondary px-2 py-1 text-[11px]" disabled>Next</button>
								{:else}
								<button class="btn-secondary px-2 py-1 text-[11px]" onclick={() => wallPromise = fetchWall(wall.current_page + 1)}>Next</button>
								{/if}
							</div>
						</div>					
					{/await}
					<div class="mt-3 pt-2 flex gap-2 items-start">
						<img src={config.avatarStorage + "/" + page.data.globalUser.id + ".png?t=" + Date.now()} alt="avatar" class="w-18 h-18 rounded-full mt-1">
						<textarea bind:value={content} placeholder="Write on {data.user.username}'s wall..." rows="2" class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm resize-none"></textarea>
						<button disabled={loading || !content || (data.user.id != user.id && data.user.privacy.who_can_post_on_wall == 2)} onclick={postToWall} class="btn-secondary px-3 py-1 text-xs self-end">
							{#if loading}
								Posting...
							{:else}
								Post
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>
{/if}

<style>
	.bubble-message {
		position: relative;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		padding: 0.4rem 0.75rem;
		font-size: 0.8rem;
		color: #374151;
		display: inline-block;
		margin-left: 0.5rem;
		font-style: italic;
		vertical-align: middle;
		box-shadow: 0 1px 2px rgba(0,0,0,0.03);
	}
	.bubble-message::after {
		content: '';
		position: absolute;
		left: -5px;
		top: 50%;
		transform: translateY(-50%);
		border-width: 5px 6px 5px 0;
		border-style: solid;
		border-color: transparent #e5e7eb transparent transparent;
	}
	.inventory-item {
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 0.3rem;
		text-align: center;
		background: white;
	}
	.inventory-item img {
		width: 100%;
		height: auto;
		background: #f9fafb;
		display: block;
	}
	.wall-comment {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.6rem 0;
	}
	.wall-comment:last-child {
		border-bottom: none;
	}
</style>
<script>
	import { page } from '$app/state';
	import { config } from '$lib/config.js';
	import { timeSince } from '$lib/timeAgo';
	let { data } = $props();

	let currentPage = $state(data.friends.current_page);
	let friendsData = $state(data.friends);
	let loading = $state(false);

	async function goToPage(newPage) {
		if (newPage < 1 || newPage > friendsData.last_page || loading) return;
		loading = true;
		try {
			const res = await fetch(`${config.api}/user/friends/${data.userId}?page=${newPage}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});
			const json = await res.json();
			if (res.ok) {
				friendsData = json;
				currentPage = newPage;
			}
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
	<a href={`/user/profile/${data.user.id}`} class="block mb-4 text-xs text-gray-500 hover:text-primary"
				>← Back to profile</a
			>
		<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
			<h1 class="text-lg font-bold text-gray-900 mb-4">Friends ({friendsData.total})</h1>

			{#if friendsData.data.length === 0}
			<p class="text-sm text-neutral-500">No friends yet...</p>
			{:else}
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
				{#each friendsData.data as friend}
				<a href={`/user/profile/${friend.id}`} class="flex flex-col items-center gap-2 p-4 border border-[#EFE6E2] rounded-lg hover:bg-gray-50 transition">
					<img src={config.headshotStorage + "/" + friend.id + ".png?t=" + Date.now()} alt={friend.username} class="w-16 h-16 rounded-full border border-[#EFE6E2]" loading="lazy">
					<span class="text-sm font-bold text-gray-800 truncate w-full text-center">{friend.username}</span>
					<span class="text-xs {friend.is_online ? 'text-green-600' : 'text-gray-400'}">
						{friend.is_online ? 'Online' : 'Offline'}
					</span>
				</a>
				{/each}
			</div>

			<div class="mt-6 flex items-center justify-between text-sm text-gray-600">
				<span>Page {friendsData.current_page} of {friendsData.last_page}</span>
				<div class="flex items-center gap-2">
					<button
						onclick={() => goToPage(friendsData.current_page - 1)}
						disabled={!friendsData.prev_page_url || loading}
						class="btn-secondary px-3 py-1 text-xs"
					>
						{loading ? 'Loading...' : 'Prev'}
					</button>
					<button
						onclick={() => goToPage(friendsData.current_page + 1)}
						disabled={!friendsData.next_page_url || loading}
						class="btn-secondary px-3 py-1 text-xs"
					>
						{loading ? 'Loading...' : 'Next'}
					</button>
				</div>
			</div>
			{/if}
		</div>
	</div>
</main>
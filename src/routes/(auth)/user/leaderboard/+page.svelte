<script>
	import { config } from '$lib/config';
	import { onMount } from 'svelte';

	let { data } = $props();
	let token = data.token;

	let allUsers = $state([]);
	let loading = $state(true);
	let error = $state('');

	let searchQuery = $state('');
	let currentPage = $state(1);
	const perPage = 9;

	let pagination = $state({
		current_page: 1,
		last_page: 1,
		total: 0,
		from: 0,
		to: 0
	});

	async function fetchLeaderboard(page = 1) {
		loading = true;
		try {
			const res = await fetch(`${config.api}/user/leaderboard?page=${page}&per_page=50`, {
				headers: {
					'Authorization': `Bearer ${token}`,
					'Accept': 'application/json'
				}
			});
			const json = await res.json();
			allUsers = json.data || [];
			pagination = {
				current_page: json.current_page,
				last_page: json.last_page,
				total: json.total,
				from: json.from,
				to: json.to
			};
		} catch (e) {
			error = 'Failed to load leaderboard data.';
		} finally {
			loading = false;
		}
	}

	onMount(() => fetchLeaderboard());

	let top3 = $derived(allUsers.slice(0, 3));

	let filteredUsers = $derived(
		searchQuery
			? allUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
			: allUsers
	);

	let rowsForTable = $derived(filteredUsers.slice(3));

	let totalPages = $derived(Math.ceil(rowsForTable.length / perPage));
	let currentTablePage = $state(1);

	// Reset table page when search changes
	$effect(() => {
		if (searchQuery) currentTablePage = 1;
	});

	let visibleUsers = $derived(
		rowsForTable.slice((currentTablePage - 1) * perPage, currentTablePage * perPage)
	);

	let showingFrom = $derived(currentTablePage === 1 ? 4 : (currentTablePage - 1) * perPage + 4);
	let showingTo = $derived(Math.min(currentTablePage * perPage + 3, filteredUsers.length));

	function goToPage(page) {
		if (page >= 1 && page <= totalPages) {
			currentTablePage = page;
		}
	}

	function formatRap(value) {
		return Number(value).toLocaleString();
	}

	function getPodiumBorder(rank) {
		if (rank === 1) return 'border-yellow-500';
		if (rank === 2) return 'border-gray-300';
		return 'border-orange-400';
	}

	function getPodiumBg(rank) {
		if (rank === 1) return 'border-yellow-500 border-2';
		if (rank === 2) return 'border-gray-500 border-2';
		return 'border-orange-500 border-2';
	}

	function getRankBadgeClass(rank) {
		if (rank <= 3) return 'rank-badge rank-top3';
		return 'rank-badge';
	}

	function getPodiumEmoji(rank) {
		if (rank === 1) return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="inline size-4 mb-1 text-yellow-600"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/></svg>`;
		if (rank === 2) return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="inline size-4 mb-1 text-gray-400"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/></svg>`;
		return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="inline size-4 mb-1 text-orange-700"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/></svg>';
	}

	function getPodiumLabel(rank) {
		if (rank === 1) return 'text-yellow-600';
		if (rank === 2) return 'text-gray-500';
		return 'text-orange-700';
	}

	function getPodiumSize(rank) {
		if (rank === 1) return 'w-16 h-16';
		return 'w-14 h-14';
	}

	function getPodiumOrder(rank) {
		if (rank === 1) return 'order-0';
		if (rank === 2) return 'order-1';
		return 'order-2';
	}
</script>

<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
			<div>
				<h1 class="text-xl font-bold text-gray-900">VAL Leaderboard</h1>
				<p class="text-xs text-gray-500 mt-0.5">Top traders ranked by VALue</p>
			</div>
			<div class="flex gap-2 w-full sm:w-auto">
				<input
					type="text"
					placeholder="Search username..."
					class="border border-gray-300 rounded-lg px-3 py-1 text-sm flex-1 sm:w-48"
					bind:value={searchQuery}
				>
			</div>
		</div>

		{#if loading}
			<div class="text-center py-12">
				<p class="text-gray-500">Loading leaderboard...</p>
			</div>
		{:else if error}
			<div class="text-center py-12">
				<p class="text-red-500">{error}</p>
			</div>
		{:else if allUsers.length === 0}
			<div class="text-center py-12">
				<p class="text-gray-500">No users found on the leaderboard yet.</p>
			</div>
		{:else}
			<!-- Top 3 Podium -->
			<div class="grid grid-cols-3 gap-4 mb-5">
				{#each top3 as user, i}
					{@const displayRank = i === 0 ? 1 : i === 1 ? 2 : 3}
					<div class="podium-card {getPodiumBg(displayRank)} {getPodiumOrder(displayRank)}">
						<p class="text-xs font-bold {getPodiumLabel(displayRank)} mb-1">
							{@html getPodiumEmoji(displayRank)} #{displayRank}
						</p>
						<img
							src={config.headshotStorage + "/" + user.id + ".png"}
							alt={user.username}
							class="{getPodiumSize(displayRank)} mx-auto border-2 {getPodiumBorder(displayRank)} rounded-lg"
							loading="lazy"
						>
						<p class="text-sm font-semibold text-gray-900 mt-1 truncate max-w-full px-1">{user.username}</p>
						<p class="text-primary font-bold text-sm mt-0.5">{formatRap(user.final_rap)} VAL</p>
						<p class="text-xs text-gray-500">{user.item_count} items</p>
					</div>
				{/each}
			</div>

			<!-- Full Leaderboard Table -->
			<div class="border border-[#EFE6E2] rounded-lg overflow-hidden">
				<table class="leaderboard-table">
					<thead>
						<tr>
							<th class="w-12 text-center">Rank</th>
							<th>Player</th>
							<th class="text-right">VAL</th>
							<th class="text-right hidden sm:table-cell">Items</th>
							<th class="text-center hidden sm:table-cell">Status</th>
						</tr>
					</thead>
					<tbody>
						{#if visibleUsers.length === 0}
							<tr>
								<td colspan="5" class="text-center py-8 text-gray-500">No users match your search.</td>
							</tr>
						{:else}
							{#each visibleUsers as user}
								<tr>
									<td class="text-center">
										<span class={getRankBadgeClass(user.rank)}>{user.rank}</span>
									</td>
									<td>
										<a href="/user/profile/{user.id}" class="flex items-center gap-2 hover:opacity-80">
											<img
												src={config.headshotStorage + "/" + user.id + ".png"}
												alt={user.username}
												class="w-7 h-7 rounded-lg"
											>
											<span class="font-medium text-gray-900">{user.username}</span>
										</a>
									</td>
									<td class="text-right font-semibold text-primary">{formatRap(user.final_rap)} VAL</td>
									<td class="text-right text-gray-600 hidden sm:table-cell">{user.item_count}</td>
									<td class="text-center hidden sm:table-cell">
										{#if user.is_online}
											<span class="inline-flex items-center gap-1 text-xs text-green-600">
												<span class="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
												Online
											</span>
										{:else}
											<span class="text-xs text-gray-400">Offline</span>
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="flex items-center justify-between mt-4">
					<span class="text-sm text-gray-600">
						Showing {showingFrom}–{showingTo} of {filteredUsers.length} player{filteredUsers.length !== 1 ? 's' : ''}
					</span>
					<div class="flex gap-1">
						<button
							class="btn-secondary px-3 py-1 text-sm"
							disabled={currentTablePage === 1}
							onclick={() => goToPage(currentTablePage - 1)}
						>← Previous</button>
						<button
							class="btn-secondary px-3 py-1 text-sm"
							disabled={currentTablePage === totalPages}
							onclick={() => goToPage(currentTablePage + 1)}
						>Next →</button>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</main>
<script lang="ts">
	import { config } from '$lib/config';
	import { onMount } from 'svelte';

	let { data } = $props();
	let token = data.token;
	
	let games: any[] = $state(data.games?.data || []);
	let pagination = $state(data.games || { current_page: 1, last_page: 1, prev_page_url: null, next_page_url: null });
	let loading = $state(false);
	let error = $state('');
	
	let searchQuery = $state('');
	let selectedGenre = $state('');
	let selectedSort = $state('popular');
	let currentPage = $state(1);

	function getGenreLabel(genre: string) {
		const labels: Record<string, string> = {
			adventure: 'Adventure',
			obby: 'Obby',
			tycoon: 'Tycoon',
			rpg: 'RPG',
			showcase: 'Showcase'
		};
		return labels[genre] || 'Unknown';
	}
	
	function capitalizeFirst(str: string) {
		if (!str) return '';
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
	
	function formatPlays(plays: number) {
		if (plays >= 1000) {
			return (plays / 1000).toFixed(1) + 'k';
		}
		return plays.toString();
	}

	async function fetchGames(page: number = 1) {
		loading = true;
		currentPage = page;
		try {
			const res = await fetch(`${config.api}/games?page=${page}&query=${searchQuery}&genre=${selectedGenre}&sort=${selectedSort}`, {
				headers: {
					'Authorization': `Bearer ${token}`,
					'Accept': 'application/json'
				}
			});
			const json = await res.json();
			games = json.data || [];
			pagination = {
				current_page: json.current_page || 1,
				last_page: json.last_page || 1,
				prev_page_url: json.prev_page_url || null,
				next_page_url: json.next_page_url || null
			};
		} catch (e) {
			error = 'Failed to load games.';
		} finally {
			loading = false;
		}
	}
	
	function goToPage(page: number) {
		if (page < 1 || page > pagination.last_page) return;
		fetchGames(page);
	}
	
	function onFilterChange() {
		fetchGames(1);
	}
</script>

<style>
	.game-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
		transition: box-shadow 0.15s ease;
		cursor: pointer;
		text-decoration: none;
		color: inherit;
		display: block;
	}
	.game-card:hover {
		box-shadow: 0 4px 8px rgba(0,0,0,0.07);
	}
	.game-card img {
		width: 100%;
		height: auto;
		display: block;
		background: #f9fafb;
	}
	.game-card .info {
		padding: 0.5rem 0.75rem;
	}
	.game-title {
		font-weight: 600;
		font-size: 0.9rem;
		color: #1f2937;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.game-meta {
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.15rem;
		display: flex;
		justify-content: space-between;
	}
	.filter-section {
		border-bottom: 1px solid #e5e7eb;
		padding-bottom: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.filter-section:last-child {
		border-bottom: none;
		margin-bottom: 0;
	}
</style>
<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<!-- Search and Title -->
		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
			<h1 class="text-xl font-bold text-gray-900">Discover Games</h1>
			<div class="flex gap-2 w-full sm:w-auto">
				<input type="text" placeholder="Search games..." bind:value={searchQuery} oninput={onFilterChange} class="border border-gray-300 rounded-lg px-3 py-1 text-sm flex-1 sm:w-48">
			</div>
		</div>

		<div class="flex flex-col md:flex-row gap-4">
			<!-- Sidebar Filters -->
			<aside class="w-full md:w-44 flex-shrink-0">
				<!-- <a href="/explore/game/create" class="btn-glossy px-4 py-1 mb-3 w-full">Create</a> -->
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-gray-50/30">
					<h3 class="text-sm font-bold text-gray-900 mb-3">Filters</h3>

					<!-- Sort Filter -->
					<div class="filter-section">
						<h4 class="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Sort By</h4>
						<select bind:value={selectedSort} onchange={onFilterChange} class="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm">
							<option value="popular">Most Popular</option>
							<option value="newest">Newest</option>
							<option value="rated">Highest Rated</option>
							<option value="played">Most Played</option>
						</select>
					</div>

					<!-- Genre Filter -->
					<div class="filter-section">
						<h4 class="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Genre</h4>
						<div class="space-y-1.5">
							<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
								<input type="radio" bind:group={selectedGenre} value="" checked onchange={onFilterChange} class="rounded-lg border-gray-300 text-primary focus:ring-primary"> All
							</label>
							<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
								<input type="radio" bind:group={selectedGenre} value="adventure" onchange={onFilterChange} class="rounded-lg border-gray-300 text-primary focus:ring-primary"> Adventure
							</label>
							<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
								<input type="radio" bind:group={selectedGenre} value="obby" onchange={onFilterChange} class="rounded-lg border-gray-300 text-primary focus:ring-primary"> Obby
							</label>
							<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
								<input type="radio" bind:group={selectedGenre} value="tycoon" onchange={onFilterChange} class="rounded-lg border-gray-300 text-primary focus:ring-primary"> Tycoon
							</label>
							<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
								<input type="radio" bind:group={selectedGenre} value="rpg" onchange={onFilterChange} class="rounded-lg border-gray-300 text-primary focus:ring-primary"> RPG
							</label>
							<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
								<input type="radio" bind:group={selectedGenre} value="showcase" onchange={onFilterChange} class="rounded-lg border-gray-300 text-primary focus:ring-primary"> Showcase
							</label>
						</div>
					</div>
				</div>
			</aside>

			<!-- Main Grid of Games -->
			<div class="flex-1">
				{#if loading}
					<div class="text-center py-12">
						<p class="text-gray-500">Loading games...</p>
					</div>
				{:else if error}
					<div class="text-center py-12">
						<p class="text-red-500">{error}</p>
					</div>
				{:else}
					<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
						{#if games && games.length > 0}
							{#each games as game}
								<a href={`/explore/game/${game.id}`} class="game-card card-shadow">
									<img src={game.thumbnail_url || `https://placehold.co/200x120/D9C5B2/1A4D4F?text=${encodeURIComponent(getGenreLabel(game.genre))}`} alt={game.title} loading="lazy">
									<div class="info">
										<div class="game-title">{game.title}</div>
										<div class="game-meta">
											<span>by {game.creator?.username || 'Unknown'}</span>
											<span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="inline size-3 mb-1"><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/><path d="M7 10v12"/></svg> {game.like_ratio}%</span>
										</div>
										<div class="game-meta mt-0.5">
											<span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="inline size-3.5 mb-1"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> {formatPlays(game.plays_count)} playing</span>
										</div>
									</div>
								</a>
							{/each}
						{:else}
							<p class="text-gray-500 col-span-full text-center py-8">No games found. Be the first to create one!</p>
						{/if}
					</div>

					<!-- Pagination -->
					<div class="flex items-center justify-between mt-5 pt-3 border-t border-[#EFE6E2]">
						<span class="text-sm text-gray-600">Page {pagination.current_page} of {pagination.last_page}</span>
						<div class="flex gap-1">
							{#if pagination.prev_page_url}
								<button class="btn-secondary px-3 py-1 text-sm cursor-pointer" onclick={() => goToPage(pagination.current_page - 1)}>← Previous</button>
							{:else}
								<button class="btn-secondary px-3 py-1 text-sm opacity-50 cursor-not-allowed" disabled>← Previous</button>
							{/if}
							{#if pagination.next_page_url}
								<button class="btn-secondary px-3 py-1 text-sm cursor-pointer" onclick={() => goToPage(pagination.current_page + 1)}>Next →</button>
							{:else}
								<button class="btn-secondary px-3 py-1 text-sm opacity-50 cursor-not-allowed" disabled>Next →</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</main>
<script>
	import { config } from '$lib/config';
	import { timeSince } from '$lib/timeAgo.js';

	let { data } = $props();
	const token = data.token;

	async function fetchThreads(categoryId,page=1,query="") {
		const response = await fetch(`${config.api}/forum/threads/${categoryId}?page=${page}&query=${encodeURIComponent(query)}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${token}`
			}
		});

		const data = await response.json();
		if (!response.ok) {
			console.error(data?.message || 'Failed to fetch threads.');
			return [];
		}

		return data || [];
	}

	function goToPage(page){
		if(page < 1) return;
		threadsPromise = fetchThreads(categoryId,page);
	}

	let category = $state({});
	function selectCategory(categoryObj) {
		categoryId = categoryObj.id;
		category = categoryObj;

		threadsPromise = fetchThreads(categoryId);
	}

	let categoryId = $state(0);
	let threadsPromise = $state(fetchThreads(categoryId,1));

	let query = $state("");
</script>

<main class="py-6">
	<div class="max-w-container mx-auto px-4">
		<div class="flex flex-col md:flex-row gap-6">
			<aside class="w-full md:w-44 flex-shrink-0">
				<div class="border border-gray-200 rounded p-3 bg-gray-50/30">
					<h3 class="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
					<div class="space-y-1.5">
						<a
							onclick={() => selectCategory({ id: 0, name: 'All' })}
							class="cursor-pointer block text-sm text-primary font-medium">All</a
						>
						{#each data.categories as category}
							<a
								onclick={() => selectCategory(category)}
								class="cursor-pointer block text-sm text-primary font-medium">{category.name}</a
							>
						{/each}
					</div>
					<div class="mt-3 pt-3 border-t border-gray-200">
						<a href="/forum/create" class="btn-glossy w-full text-center px-3 py-1 text-sm"
							>+ New Thread</a
						>
					</div>
				</div>
			</aside>

			<div class="flex-1">
				<div class="flex items-center justify-between mb-4">
					<h1 class="text-xl font-bold text-gray-900">Forums</h1>
					<div class="flex gap-2">
						<input
							type="text"
							placeholder="Search threads..."
							class="border border-gray-300 rounded px-2 py-1 text-sm w-40"
							bind:value={query}
						/>
						<button onclick={() => threadsPromise = fetchThreads(categoryId, 1, query)} class="btn-secondary px-3 py-1 text-sm">Search</button>
					</div>
				</div>

				<div
					class="border border-gray-200 rounded p-3 mb-4 bg-white flex items-center justify-between"
				>
					<div>
						<span class="text-xs text-gray-500"
							>{#if categoryId == 0}All{:else}{category.name}{/if}</span
						>
						<h2 class="text-sm font-semibold text-gray-900">Latest threads</h2>
					</div>
					<div class="flex items-center gap-2 text-xs text-gray-500">
						<span>Sort by:</span>
						<select class="border border-gray-300 rounded px-1 py-0.5 text-xs">
							<option>Recent</option>
							<option>Popular</option>
						</select>
					</div>
				</div>

				<div class="border border-gray-200 rounded overflow-hidden">
					<table class="forum-table">
						<thead>
							<tr>
								<th class="w-8"></th>
								<th>Thread</th>
								<th class="hidden sm:table-cell text-center">Replies</th>
								<th class="hidden sm:table-cell text-center">Views</th>
								<th class="hidden md:table-cell">Last Post</th>
							</tr>
						</thead>
						<tbody>
							{#await threadsPromise}
								<tr>
									<td colspan="5" class="text-center text-sm text-gray-500 py-4"
										>Loading threads...</td
									>
								</tr>
							{:then threads}
								{#each threads.data as thread}
									<tr class={thread.is_pinned ? 'sticky-thread' : ''}>
										{#if thread.is_locked}
											<td class="text-center text-yellow-500 text-xs"
												>
												<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="inline size-5 mb-1 text-neutral-500"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
												</td
											>
										{:else}
											<td></td>
										{/if}
										<td>
											<div class="flex flex-col">
												<a href="/forum/thread/{thread.id}" class="thread-title text-sm">{thread.title}</a>
												<span class="text-xs text-gray-500 mt-0.5"
													>by <a href={`/user/profile/${thread.user.id}`} class="text-primary">{thread.user.username}</a> ·
													<span class="category-tag">{thread.category.name}</span></span
												>
											</div>
										</td>
										<td class="text-center text-gray-600 hidden sm:table-cell">{thread.reply_count}</td>
										<td class="text-center text-gray-600 hidden sm:table-cell">{thread.view_count}</td>
										{#if thread.last_post}
											<td class="text-xs text-gray-500 hidden md:table-cell">
												<div>by <a href={`/user/profile/${thread.last_post.user.id}`} class="text-primary">{thread.last_post.user.username}</a></div>
												<div>{timeSince(new Date(thread.last_post.created_at))} ago</div>
											</td>
										{:else}
											<td class="text-xs text-gray-500 hidden md:table-cell">
												<div>No replies yet</div>
											</td>
										{/if}
									</tr>
								{/each}
							{/await}
						</tbody>
					</table>
				</div>
				{#await threadsPromise}
					<div class="flex items-center justify-between mt-4">
						<span class="text-sm text-gray-600">Page .. of ..</span>
						<div class="flex gap-1">
							<button class="btn-secondary px-3 py-1 text-sm opacity-50 cursor-not-allowed" disabled
								>← Previous</button
							>
							<button class="btn-secondary px-3 py-1 text-sm opacity-50 cursor-not-allowed" disabled
								>Next →</button
							>
						</div>
					</div>
				{:then threads}
					<div class="flex items-center justify-between mt-4">
						<span class="text-sm text-gray-600">Page {threads.current_page} of {threads.last_page}</span
						>
						<div class="flex gap-1">
							{#if threads.prev_page_url != null}
							<button onclick={() => goToPage(threads.current_page - 1)} class="btn-secondary px-3 py-1 text-sm"
								>← Previous</button
							>
							{:else}
							<button class="btn-secondary px-3 py-1 text-sm opacity-50 cursor-not-allowed" disabled
								>← Previous</button
							>
							{/if}
							{#if threads.next_page_url != null}
							<button onclick={() => goToPage(threads.current_page + 1)} class="btn-secondary px-3 py-1 text-sm">Next →</button>
							{:else}
							<button class="btn-secondary px-3 py-1 text-sm opacity-50 cursor-not-allowed" disabled>Next →</button>
							{/if}
						</div>
					</div>
				{/await}
			</div>
		</div>
	</div>
</main>

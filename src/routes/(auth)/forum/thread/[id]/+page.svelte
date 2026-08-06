<script>
	import { invalidate } from '$app/navigation';
	import { config } from '$lib/config.js';
	import { timeSince } from '$lib/timeAgo.js';
	import { Loader, Send } from 'lucide-svelte';

	let { data } = $props();
	let user = $derived(data.user); 

	async function fetchReplies(page=1) {
		let response = await fetch(`${config.api}/forum/replies/${data.thread.id}?page=${page}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${data.token}`
			}
		});

		const json = await response.json();
		if (!response.ok) {
			console.error(json?.message || 'Failed to fetch replies.');
			return [];
		}

		return json || [];
	}

	let content = $state('');
	let error = $state('');
	let loading = $state(false);
	async function reply() {
		try {
			let response = await fetch(`${config.api}/forum/reply/${data.thread.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				},
				body: JSON.stringify({ content })
			});
			
			const json = await response.json();
			loading = false;

			if (!response.ok) {
				error = json?.message || 'Failed to post reply.';
				return;
			}

			if(response.status === 201) {
				content = '';
				repliesPromise = fetchReplies();
			}

			content = '';
			repliesPromise = fetchReplies();
			invalidate("app:layout-data");
		} catch (err) {
			console.log(err);
		} finally {
			loading = false;
		}
	}

	// Admin/Moderator actions
	async function scrubThread() {
		if (!confirm('Are you sure you want to scrub this thread?')) return;
		try {
			const res = await fetch(`${config.api}/forum/thread/${data.thread.id}/scrub`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			if (res.ok) {
				invalidate("app:layout-data");
			}
		} catch (e) {
			console.error('Failed to scrub thread', e);
		}
	}

	async function deleteThread() {
		if (!confirm('Are you sure you want to delete this thread?')) return;
		try {
			const res = await fetch(`${config.api}/forum/thread/${data.thread.id}/delete`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			if (res.ok) {
				window.location.href = '/forum';
			}
		} catch (e) {
			console.error('Failed to delete thread', e);
		}
	}

	async function pinThread() {
		if (!confirm('Are you sure you want to pin this thread?')) return;
		try {
			const res = await fetch(`${config.api}/forum/thread/${data.thread.id}/pin`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			if (res.ok) {
				invalidate("app:layout-data");
			}
		} catch (e) {
			console.error('Failed to pin thread', e);
		}
	}

	async function lockThread() {
		if (!confirm('Are you sure you want to lock this thread?')) return;
		try {
			const res = await fetch(`${config.api}/forum/thread/${data.thread.id}/lock`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			if (res.ok) {
				invalidate("app:layout-data");
			}
		} catch (e) {
			console.error('Failed to lock thread', e);
		}
	}

	async function scrubReply(replyId) {
		if (!confirm('Are you sure you want to scrub this reply?')) return;
		try {
			const res = await fetch(`${config.api}/forum/reply/${replyId}/scrub`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			if (res.ok) {
				repliesPromise = fetchReplies();
			}
		} catch (e) {
			console.error('Failed to scrub reply', e);
		}
	}

	async function deleteReply(replyId) {
		if (!confirm('Are you sure you want to delete this reply?')) return;
		try {
			const res = await fetch(`${config.api}/forum/reply/${replyId}/delete`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			if (res.ok) {
				repliesPromise = fetchReplies();
			}
		} catch (e) {
			console.error('Failed to delete reply', e);
		}
	}

	let repliesPromise = $state(fetchReplies());
	function goToPage(page) {
		repliesPromise = fetchReplies(page);
	}
</script>
<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/forum" class="hover:text-primary">Forums</a> вЂє
			<span class="text-gray-700">{data.thread.title}</span>
		</div>

		<div class="border border-[#EFE6E2] rounded-lg overflow-hidden">
			<div class="bg-gray-50/50 border-b border-[#EFE6E2] px-4 py-3 flex items-center justify-between">
				<h1 class="text-lg font-bold text-gray-900">{data.thread.title.length > 60 ? data.thread.title.slice(0, 60) + '...' : data.thread.title}</h1>
				<a href="/forum/create" class="btn-secondary px-4 py-1 text-sm">+ New Thread</a>
			</div>

			<div class="p-4">
				<div class="post">
					<div class="flex gap-4">
						<img src={config.avatarStorage  + "/" + data.thread.user.id + ".png"} alt="BuilderJoe avatar" class="rounded-full w-32 h-32">
						<div class="flex-1">
							<div class="flex items-center gap-2 flex-wrap">
								<a href={`/user/profile/${data.thread.user.id}`} class="post-author">{data.thread.user.username}</a>
								{#if data.thread.user.selected_forum_tag}
									<span style={data.thread.user.selected_forum_tag.style}>{data.thread.user.selected_forum_tag.name}</span>
								{/if}
								<span class="post-time">Posted {timeSince(new Date(data.thread.created_at))} ago</span>
							</div>
							<p class="post-content">
								{data.thread.content}
							</p>
							<div class="mt-2 flex gap-4 text-xs">
								<button class="text-link">Report</button>
								{#if user.role == "admin" || user.role == "moderator"}
									<button onclick={scrubThread} class="text-link !text-red-600">Scrub</button>
									<button onclick={deleteThread} class="text-link !text-red-600">Delete</button>
									<button onclick={pinThread} class="text-link !text-red-600">Pin</button>
									<button onclick={lockThread} class="text-link !text-red-600">Lock</button>
								{/if}
							</div>
						</div>
					</div>
				</div>

				{#await repliesPromise}
					<div class="mb-3"></div>
					<p class="text-sm text-gray-500">Loading replies...</p>
				{:then replies}
					{#each replies.data as reply}
						<div class="post">
							<div class="flex gap-4">
								<img src={config.avatarStorage  + "/" + reply.user.id + ".png"} alt="{reply.user.username} avatar" class="rounded-full w-32 h-32">
								<div class="flex-1">
									<div class="flex items-center gap-2 flex-wrap">
									<a href={`/user/profile/${reply.user.id}`} class="post-author">{reply.user.username}</a>
									{#if reply.user.selected_forum_tag}
										<span style={reply.user.selected_forum_tag.style}>{reply.user.selected_forum_tag.name}</span>
									{/if}
									<span class="post-time">Posted {timeSince(new Date(reply.created_at))} ago</span>
									</div>
									<p class="post-content">
										{reply.content}
									</p>
									<div class="mt-2 flex gap-4 text-xs">
										<button class="text-link">Report</button>
										{#if user.role == "admin" || user.role == "moderator"}
											<button onclick={() => scrubReply(reply.id)} class="text-link !text-red-600">Scrub</button>
											<button onclick={() => deleteReply(reply.id)} class="text-link !text-red-600">Delete</button>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{/each}
				{:catch error}
					<div class="mb-3"></div>
					<p class="text-sm text-red-600">Failed to load replies.</p>
				{/await}
			</div>

			{#await repliesPromise}
			<div class="border-t border-[#EFE6E2] px-4 py-3 flex items-center justify-between">
				<span class="text-sm text-gray-600">Page .. of ..</span>
				<div class="pagination flex gap-1">
					<a href="#" class="opacity-50 cursor-not-allowed">Previous в†ђ</a>
					<a href="#" class="opacity-50 cursor-not-allowed">Next в†’</a>
				</div>
			</div>
			{:then replies}
			<div class="border-t border-[#EFE6E2] px-4 py-3 flex items-center justify-between">
				<span class="text-sm text-gray-600">Page {replies.current_page} of {replies.last_page}</span>
				<div class="pagination flex gap-1">
					{#if replies.prev_page_url != null}
						<a class="cursor-pointer" onclick={() => goToPage(replies.current_page - 1)}>Previous в†ђ</a>
					{:else}
						<a class="opacity-50 cursor-not-allowed">Previous в†ђ</a>
					{/if}
					{#if replies.next_page_url != null}
						<a class="cursor-pointer" onclick={() => goToPage(replies.current_page + 1)}>Next в†’</a>
					{:else}
						<a class="opacity-50 cursor-not-allowed">Next в†’</a>
					{/if}
				</div>
			</div>
			{/await}
		</div>

		{#if data.thread.is_locked}
			<div class="mt-5 border border-[#EFE6E2] rounded-lg p-4">
				<p class="text-sm text-gray-500">This thread is locked. You cannot post new replies.</p>
			</div>
		{:else}
		<div class="mt-5 border border-[#EFE6E2] rounded-lg p-4">
			{#if error}
				<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{error}
				</div>
			{/if}
			<h2 class="text-sm font-bold mb-2">Post a Reply</h2>
			<textarea bind:value={content} rows="4" placeholder="Write your reply..." class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mb-3"></textarea>
			<div class="flex gap-2">
				<button onclick={reply} class="btn-glossy px-4 py-1 text-sm" disabled={loading}>
					{#if loading}
						<Loader strokeWidth="3" class="size-3.5 inline mb-0.5"/> Posting...
					{:else}
						<Send strokeWidth="3" class="size-3.5 inline mb-0.5"/> Post
					{/if}
				</button>
			</div>
		</div>
		{/if}
	</div>
</main>
<style>
	.post {
            border-bottom: 1px solid #e5e7eb;
            padding: 1rem 0;
        }
        .post:last-child {
            border-bottom: none;
        }
        .post-author {
            font-weight: 600;
            color: #1f2937;
            font-size: 0.9rem;
        }
        .post-time {
            font-size: 0.75rem;
            color: #6b7280;
        }
        .post-content {
            font-size: 0.875rem;
            line-height: 1.6;
            color: #374151;
            margin-top: 0.5rem;
			white-space: pre-wrap;
        }
        .pagination a {
            padding: 0.25rem 0.6rem;
            border: 1px solid #d1d5db;
            border-radius: 3px;
            color: #374151;
            font-size: 0.8rem;
            text-decoration: none;
            background: #fff;
            transition: background 0.1s;
        }
        .pagination a:hover {
            background: #f3f4f6;
        }
	.pagination a.active-page {
            background: #f3f4f6;
            border-color: #9ca3af;
            font-weight: 600;
        }
	.forum-tag-badge {
		display: inline-flex;
		align-items: center;
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.1rem 0.5rem;
		border-radius: 3px;
		border: 1px solid currentColor;
		line-height: 1;
	}
</style>

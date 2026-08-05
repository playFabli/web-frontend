<script>
	import { config } from '$lib/config';
	import { page } from '$app/state';

	let { data } = $props();
	let posts = $state(data.posts ?? []);

	let featured = $derived(posts.find((p) => p.is_featured));
	let others = $derived(posts.filter((p) => !p.is_featured));

	let user = page.data.globalUser;
	let isAdmin = $derived(user?.role === 'admin' || user?.role === 'moderator');

	// Admin state
	let showCreateModal = $state(false);
	let editingPost = $state(null);
	let createTitle = $state('');
	let createBody = $state('');
	let createBannerFile = $state(null);
	let createBannerPreview = $state(null);
	let saving = $state(false);

	function handleBannerSelect(e) {
		const file = e.target.files?.[0];
		if (file) {
			createBannerFile = file;
			createBannerPreview = URL.createObjectURL(file);
		}
	}

	async function createPost() {
		if (!createTitle.trim() || !createBody.trim()) return;
		saving = true;
		try {
			const formData = new FormData();
			formData.append('title', createTitle);
			formData.append('body', createBody);
			formData.append('is_published', String(true));
			if (createBannerFile) {
				formData.append('banner', createBannerFile);
			}

			const res = await fetch(`${config.api}/admin/blog`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${data.token}`,
					Accept: 'application/json',
				},
				body: formData,
			});
			if (res.ok) {
				createTitle = '';
				createBody = '';
				createBannerFile = null;
				createBannerPreview = null;
				showCreateModal = false;
				// Reload
				const reloadRes = await fetch(`${config.api}/blog`, {
					headers: { Authorization: `Bearer ${data.token}`, Accept: 'application/json' },
				});
				if (reloadRes.ok) {
					const json = await reloadRes.json();
					posts = json.data ?? [];
				}
			} else {
				const json = await res.json();
				alert(json.message || 'Failed to create post');
			}
		} catch (e) {
			alert('Failed to create post');
		} finally {
			saving = false;
		}
	}

	async function togglePublish(postId) {
		try {
			const res = await fetch(`${config.api}/admin/blog/${postId}/publish`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${data.token}`, Accept: 'application/json' },
			});
			if (res.ok) {
				posts = posts.map((p) => (p.id === postId ? { ...p, is_published: !p.is_published } : p));
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function toggleFeature(postId) {
		try {
			const res = await fetch(`${config.api}/admin/blog/${postId}/feature`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${data.token}`, Accept: 'application/json' },
			});
			if (res.ok) {
				const reloadRes = await fetch(`${config.api}/blog`, {
					headers: { Authorization: `Bearer ${data.token}`, Accept: 'application/json' },
				});
				if (reloadRes.ok) {
					const json = await reloadRes.json();
					posts = json.data ?? [];
				}
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function deletePost(postId) {
		if (!confirm('Delete this post?')) return;
		try {
			const res = await fetch(`${config.api}/admin/blog/${postId}/delete`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${data.token}`, Accept: 'application/json' },
			});
			if (res.ok) {
				posts = posts.filter((p) => p.id !== postId);
			}
		} catch (e) {
			console.error(e);
		}
	}

	function formatDate(dateStr) {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		if (isNaN(d)) return dateStr;
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<div class="flex items-center justify-between mb-5">
			<h1 class="text-xl font-bold">Blog</h1>
			{#if isAdmin}
				<button class="btn-glossy px-3 py-1 text-xs" onclick={() => (showCreateModal = true)}>New Post</button>
			{/if}
		</div>

		{#if featured}
			<a
				href="/blog/post/{featured.id}"
				class="block border border-[#EFE6E2] rounded-lg overflow-hidden mb-6 hover:shadow-md transition-shadow bg-white"
			>
				{#if featured.banner_path}
					<img src="{config.storage}/{featured.banner_path}" alt="" class="w-full h-48 object-cover" />
				{:else}
					<div class="w-full h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
						<span class="text-4xl font-bold text-primary/30">{featured.title.charAt(0)}</span>
					</div>
				{/if}
				<div class="p-4">
					<div class="flex items-center gap-2 mb-2">
						<span class="text-[10px] font-bold text-primary uppercase tracking-wide">Featured</span>
						<span class="text-xs text-gray-400">{formatDate(featured.created_at)}</span>
					</div>
					<h2 class="text-lg font-bold text-gray-900 mb-1">{featured.title}</h2>
					<p class="text-sm text-gray-600 line-clamp-2">{featured.short_body}</p>
					<div class="flex items-center gap-2 mt-3">
						<img
							src="{config.headshotStorage}/{featured.user?.id}.png"
							alt=""
							class="w-6 h-6 border border-[#EFE6E2] rounded-full"
						/>
						<span class="text-xs text-gray-500">{featured.user?.username}</span>
					</div>
				</div>
			</a>
		{/if}

		{#if others.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each others as post}
					<a
						href="/blog/post/{post.id}"
						class="border border-[#EFE6E2] rounded-lg overflow-hidden hover:shadow-sm transition-shadow bg-white flex flex-col"
					>
						{#if post.banner_path}
							<img src="{config.storage}/{post.banner_path}" alt="" class="w-full h-32 object-cover" />
						{:else}
							<div class="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
								<span class="text-2xl font-bold text-gray-300">{post.title.charAt(0)}</span>
							</div>
						{/if}
						<div class="p-4 flex-1 flex flex-col">
							<h3 class="text-sm font-bold text-gray-900 mb-1 truncate">{post.title}</h3>
							<p class="text-xs text-gray-600 flex-1 line-clamp-2">{post.short_body}</p>
							<div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
								<div class="flex items-center gap-1.5">
									<img
										src="{config.headshotStorage}/{post.user?.id}.png"
										alt=""
										class="w-5 h-5 border border-[#EFE6E2] rounded-full"
									/>
									<span class="text-[11px] text-gray-500">{post.user?.username}</span>
								</div>
								<span class="text-[11px] text-gray-400">{formatDate(post.created_at)}</span>
							</div>
							{#if isAdmin}
								<div class="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
									<button
										class="text-[10px] px-2 py-0.5 rounded-lg border border-[#EFE6E2] hover:bg-gray-50"
										onclick={() => togglePublish(post.id)}
									>
										{post.is_published ? 'Unpublish' : 'Publish'}
									</button>
									<button
										class="text-[10px] px-2 py-0.5 rounded-lg border border-[#EFE6E2] hover:bg-gray-50"
										onclick={() => toggleFeature(post.id)}
									>
										{post.is_featured ? 'Unfeature' : 'Feature'}
									</button>
									<button
										class="text-[10px] px-2 py-0.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
										onclick={() => deletePost(post.id)}
									>
										Delete
									</button>
								</div>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{:else if !featured}
			<div class="text-center py-12 text-gray-500">
				<p class="text-sm">No blog posts yet. Check back later!</p>
			</div>
		{/if}
	</div>
</main>

<!-- Create Post Modal -->
{#if showCreateModal}
	<div
		class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
		onclick={() => (showCreateModal = false)}
	>
		<div
			class="bg-white border border-[#EFE6E2] rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
			onclick={(e)=>{e.stopPropagation();}}
		>
			<div class="p-4 border-b border-[#EFE6E2]">
				<h2 class="text-base font-bold text-gray-900">New Blog Post</h2>
			</div>
			<div class="p-4 space-y-3">
				<div>
					<label class="block text-xs font-bold text-gray-700 mb-1">Title</label>
					<input
						type="text"
						bind:value={createTitle}
						class="w-full border border-[#EFE6E2] rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-primary"
						placeholder="Post title"
					/>
				</div>
				<div>
					<label class="block text-xs font-bold text-gray-700 mb-1">Banner Image (optional)</label>
					{#if createBannerPreview}
						<div class="mb-2 rounded-lg overflow-hidden border border-[#EFE6E2]">
							<img src="{createBannerPreview}" alt="Banner preview" class="w-full h-32 object-cover" />
						</div>
					{/if}
					<input
						type="file"
						accept="image/*"
						onchange={handleBannerSelect}
						class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold !btn-glossy file:bg-[#A2574F] file:text-white hover:file:bg-[#8E4A43] cursor-pointer"
					/>
					<p class="text-xs text-gray-500 mt-1">Upload a banner image. Max 5MB.</p>
				</div>
				<div>
					<label class="block text-xs font-bold text-gray-700 mb-1">Body (BBCode supported)</label>
					<textarea
						bind:value={createBody}
						class="w-full border border-[#EFE6E2] rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-primary min-h-[200px]"
						placeholder="Write your post content here... [b]bold[/b], [i]italic[/i], [img]url[/img], [url=link]text[/url]"
					></textarea>
				</div>
			</div>
			<div class="p-4 border-t border-[#EFE6E2] flex justify-end gap-2">
				<button class="btn-secondary px-3 py-1 text-xs" onclick={() => (showCreateModal = false)}>Cancel</button>
				<button class="btn-glossy px-3 py-1 text-xs" onclick={createPost} disabled={saving}>
					{saving ? 'Saving...' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}

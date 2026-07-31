<script>
	import { config } from '$lib/config';
	import { page } from '$app/state';

	let { data } = $props();
	let post = data.post;

	let user = page.data.globalUser;
	let isAdmin = $derived(user?.role === 'admin' || user?.role === 'moderator');

	// Edit state
	let showEditModal = $state(false);
	let editTitle = $state(post.title);
	let editBody = $state(post.body);
	let editBannerFile = $state(null);
	let editBannerPreview = $state(null);
	let removeBanner = $state(false);
	let saving = $state(false);

	function handleBannerSelect(e) {
		const file = e.target.files?.[0];
		if (file) {
			editBannerFile = file;
			editBannerPreview = URL.createObjectURL(file);
			removeBanner = false;
		}
	}

	/**
	 * Convert BBCode to HTML for rendering.
	 * Supports: [b], [i], [u], [img], [url], [quote], [code], [center]
	 */
	function bbcodeToHtml(text) {
		if (!text) return '';
		let html = text;

		// Escape HTML entities first
		html = html
			.replace(/&/g, '&')
			.replace(/</g, '<')
			.replace(/>/g, '>')
			.replace(/"/g, '"');

		// [b]bold[/b]
		html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>');
		// [i]italic[/i]
		html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>');
		// [u]underline[/u]
		html = html.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>');
		// [center]text[/center]
		html = html.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div class="text-center">$1</div>');
		// [quote]text[/quote]
		html = html.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<blockquote class="border-l-4 border-gray-300 pl-3 py-1 my-2 text-sm text-gray-600 italic bg-gray-50 rounded">$1</blockquote>');
		// [code]text[/code]
		html = html.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, '<pre class="bg-gray-100 border border-gray-200 rounded p-3 my-2 text-xs overflow-x-auto font-mono">$1</pre>');
		// [img]url[/img]
		html = html.replace(/\[img\]([\s\S]*?)\[\/img\]/gi, '<img src="$1" alt="" class="max-w-full h-auto my-3 rounded border border-gray-200" loading="lazy" />');
		// [url=link]text[/url]
		html = html.replace(/\[url=([\s\S]*?)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" class="text-primary hover:underline" target="_blank" rel="noopener">$2</a>');
		// [url]link[/url]
		html = html.replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '<a href="$1" class="text-primary hover:underline" target="_blank" rel="noopener">$1</a>');

		// Convert newlines to <br>
		html = html.replace(/\n/g, '<br />');

		return html;
	}

	async function saveEdit() {
		if (!editTitle.trim() || !editBody.trim()) return;
		saving = true;
		try {
			const formData = new FormData();
			formData.append('title', editTitle);
			formData.append('body', editBody);
			if (removeBanner) {
				formData.append('remove_banner', '1');
			}
			if (editBannerFile) {
				formData.append('banner', editBannerFile);
			}

			const res = await fetch(`${config.api}/admin/blog/${post.id}`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${data.token}`,
					Accept: 'application/json',
				},
				body: formData,
			});
			if (res.ok) {
				const json = await res.json();
				post = json.data;
				showEditModal = false;
			} else {
				const json = await res.json();
				alert(json.message || 'Failed to update post');
			}
		} catch (e) {
			alert('Failed to update post');
		} finally {
			saving = false;
		}
	}

	async function togglePublish() {
		try {
			const res = await fetch(`${config.api}/admin/blog/${post.id}/publish`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${data.token}`, Accept: 'application/json' },
			});
			if (res.ok) {
				const json = await res.json();
				post = { ...post, is_published: json.data.is_published };
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function toggleFeature() {
		try {
			const res = await fetch(`${config.api}/admin/blog/${post.id}/feature`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${data.token}`, Accept: 'application/json' },
			});
			if (res.ok) {
				const json = await res.json();
				post = { ...post, is_featured: json.data.is_featured };
			}
		} catch (e) {
			console.error(e);
		}
	}

	function formatDate(dateStr) {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		if (isNaN(d)) return dateStr;
		return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
	}
</script>

<main class="py-6">
	<div class="max-w-container mx-auto px-4">
		<a href="/blog" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="m15 18-6-6 6-6"/></svg>
			Back to Blog
		</a>

		<article class="bg-white border border-gray-200 rounded overflow-hidden">
			{#if post.banner_path}
				<img src="{config.storage}/{post.banner_path}" alt="" class="w-full h-64 object-cover" />
			{/if}

			<div class="p-6 md:p-8">
				<div class="flex items-center gap-3 mb-4">
					<img
						src="{config.headshotStorage}/{post.user?.id}.png"
						alt=""
						class="w-10 h-10 border border-gray-200 rounded-full"
					/>
					<div>
						<p class="text-sm font-medium text-gray-900">{post.user?.username}</p>
						<p class="text-xs text-gray-400">{formatDate(post.created_at)}</p>
					</div>
					{#if post.is_featured}
						<span class="ml-auto text-[10px] font-semibold text-primary uppercase tracking-wide">Featured</span>
					{/if}
				</div>

				<h1 class="text-2xl font-bold text-gray-900 mb-6">{post.title}</h1>

				<div class="prose prose-sm max-w-none text-gray-800 leading-relaxed">
					{@html bbcodeToHtml(post.body)}
				</div>

				{#if isAdmin}
					<div class="mt-8 pt-4 border-t border-gray-200 flex items-center gap-2">
						<button class="btn-secondary px-3 py-1 text-xs" onclick={() => (showEditModal = true)}>Edit</button>
						<button class="btn-secondary px-3 py-1 text-xs" onclick={togglePublish}>
							{post.is_published ? 'Unpublish' : 'Publish'}
						</button>
						<button class="btn-secondary px-3 py-1 text-xs" onclick={toggleFeature}>
							{post.is_featured ? 'Unfeature' : 'Feature'}
						</button>
					</div>
				{/if}
			</div>
		</article>
	</div>
</main>

<!-- Edit Post Modal -->
{#if showEditModal}
	<div
		class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
		onclick={() => (showEditModal = false)}
	>
		<div
			class="bg-white border border-gray-200 rounded shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
			onclick={(e)=>{e.stopPropagation()}}
		>
			<div class="p-4 border-b border-gray-200">
				<h2 class="text-base font-semibold text-gray-900">Edit Post</h2>
			</div>
			<div class="p-4 space-y-3">
				<div>
					<label class="block text-xs font-medium text-gray-700 mb-1">Title</label>
					<input
						type="text"
						bind:value={editTitle}
						class="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-700 mb-1">Banner Image</label>
					{#if editBannerPreview}
						<div class="mb-2 rounded overflow-hidden border border-gray-200">
							<img src="{editBannerPreview}" alt="Banner preview" class="w-full h-32 object-cover" />
						</div>
					{:else if post.banner_path}
						<div class="mb-2 rounded overflow-hidden border border-gray-200">
							<img src="{config.storage}/{post.banner_path}" alt="Current banner" class="w-full h-32 object-cover" />
						</div>
					{/if}
					<input
						type="file"
						accept="image/*"
						onchange={handleBannerSelect}
						class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold !btn-glossy file:bg-[#A2574F] file:text-white hover:file:bg-[#8E4A43] cursor-pointer mb-2"
					/>
					<p class="text-xs text-gray-500 mt-1">Upload a new banner image to replace the current one. Max 5MB.</p>
					{#if post.banner_path}
						<label class="flex items-center gap-2 text-xs text-gray-600 mt-2">
							<input type="checkbox" bind:checked={removeBanner} class="w-4 h-4 rounded border-gray-300" />
							Remove current banner
						</label>
					{/if}
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-700 mb-1">Body (BBCode)</label>
					<textarea
						bind:value={editBody}
						class="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary min-h-[300px]"
					></textarea>
				</div>
			</div>
			<div class="p-4 border-t border-gray-200 flex justify-end gap-2">
				<button class="btn-secondary px-3 py-1 text-xs" onclick={() => (showEditModal = false)}>Cancel</button>
				<button class="btn-glossy px-3 py-1 text-xs" onclick={saveEdit} disabled={saving}>
					{saving ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}

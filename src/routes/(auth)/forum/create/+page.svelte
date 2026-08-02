<script>
	import { config } from '$lib/config';
	import { goto, invalidate } from '$app/navigation';
	let { data } = $props();
	let selectedCategory = $state(1);

	let title = $state('');
	let content = $state('');
	let error = $state('');
	let loading = $state(false);

	async function createThread() {
		error = '';
		loading = true;

		try {
			invalidate("app:layout-data");
			let response = await fetch(`${config.api}/forum/thread/${selectedCategory}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				},
				body: JSON.stringify({
					title: title,
					content: content
				})
			});
	
			let json = await response.json();
			if (response.status === 422) {
				error = json?.message || 'Failed to create thread.';
				return;
			} else if(response.status === 201) {
				goto(`/forum/thread/${json.data.id}`);
			}
		} catch(err) {
			console.error('Failed to create thread.', err);
		} finally {
			loading = false;
		}
	}
</script>
<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/forum" class="hover:text-primary">Forums</a> ›
			<span class="text-gray-700">New Thread</span>
		</div>

		<div class="max-w-2xl mx-auto">
			<h1 class="text-xl font-bold text-gray-900 mb-5">Create New Thread</h1>

			<div class="border border-[#EFE6E2] rounded-lg p-5 bg-white">
				{#if error}
					<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{error}
					</div>
				{/if}
				<form>
					<div class="mb-3">
						<label class="form-label" for="threadCategory">Category</label>
						<select id="threadCategory" class="form-input" bind:value={selectedCategory}>
							{#each data.categories as category}
								<option value={category.id}>{category.name}</option>
							{/each}
						</select>
					</div>
					<div class="mb-3">
						<label class="form-label" for="threadTitle">Title</label>
						<input bind:value={title} type="text" id="threadTitle" class="form-input" placeholder="A clear, descriptive title" required>
					</div>
					<div class="mb-4">
						<label class="form-label" for="threadBody">Body</label>
						<textarea bind:value={content} id="threadBody" rows="8" class="form-input" placeholder="Write your post..."></textarea>
					</div>
					<div class="flex gap-2 justify-end">
						<button onclick={createThread} class="btn-glossy px-4 py-1 text-sm" disabled={loading}>
							{#if loading}
								Posting...
							{:else}
								Post Thread
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</main>
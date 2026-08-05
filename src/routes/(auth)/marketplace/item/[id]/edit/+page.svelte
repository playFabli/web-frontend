<script>
	import { config } from '$lib/config';
	import { goto } from '$app/navigation';
	import TexturePreview from '$lib/components/marketplace/TexturePreview.svelte';

	let { data } = $props();

	let title = $state(data.item.title);
	let description = $state(data.item.description);
	let categoryId = $state(data.item.category_id);
	let price = $state(data.item.price);
	let textureFile = $state(null);

	let error = $state('');
	let success = $state('');
	let loading = $state(false);

	async function saveItem() {
		error = '';
		success = '';
		loading = true;

		try {
			const formData = new FormData();
			formData.append('title', title);
			formData.append('description', description);
			formData.append('category_id', String(categoryId));
			formData.append('price', String(price));

			if (textureFile) {
				formData.append('texture', textureFile);
			}

			let response = await fetch(`${config.api}/marketplace/item/update/${data.item.id}`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				},
				body: formData
			});

			let json = await response.json();
			if (!response.ok) {
				if (response.status === 422 && json.errors) {
					const messages = Object.values(json.errors).flat();
					error = messages.join(', ');
				} else {
					error = json?.message || json?.error || 'Failed to save item.';
				}
				return;
			}

			success = 'Item updated successfully.';
		} catch (err) {
			console.error('Failed to save item.', err);
			error = 'Failed to save item.';
		} finally {
			loading = false;
		}
	}

	function handleFileSelect(e) {
		const file = e.target.files?.[0];
		if (file) {
			textureFile = file;
		}
	}
</script>

<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/marketplace" class="hover:text-primary">Marketplace</a> ›
			<a href="/marketplace/item/{data.item.id}" class="hover:text-primary">{data.item.title}</a> ›
			<span class="text-gray-700">Edit</span>
		</div>

		<div class="flex items-center justify-between mb-5">
			<h1 class="text-xl font-bold text-gray-900">Edit Item</h1>
			<a href="/marketplace/item/{data.item.id}" class="btn-secondary px-4 py-1 text-sm">← Back to Item</a>
		</div>

		{#if error}
			<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
		{/if}
		{#if success}
			<div class="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
			<div class="md:col-span-1">
				{#if textureFile}
					<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white text-center">
						<TexturePreview {textureFile} categoryId={categoryId} token={data.token} />
						<p class="text-sm text-gray-600 mt-2">New Texture Preview</p>
					</div>
				{:else}
					<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white text-center">
						<img src={config.storage + "/items/" + data.item.id + ".png"} alt={data.item.title} class="w-full border border-gray-300 rounded-lg" loading="lazy">
						<p class="text-sm text-gray-600 mt-2">Current Render</p>
					</div>
				{/if}
			</div>

			<div class="md:col-span-2 space-y-4">
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-bold mb-3">Basic Information</h2>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label class="form-label" for="name">Name</label>
							<input bind:value={title} type="text" id="name" class="form-input">
						</div>
						<div>
							<label class="form-label" for="type">Category</label>
							<select bind:value={categoryId} id="type" class="form-input">
								{#each data.categories as cat}
									<option value={cat.id}>{cat.title}</option>
								{/each}
							</select>
						</div>
						<div class="sm:col-span-2">
							<label class="form-label" for="description">Description</label>
							<textarea bind:value={description} id="description" rows="3" class="form-input"></textarea>
						</div>
						<div>
							<label class="form-label" for="price">Price</label>
							<input bind:value={price} type="number" id="price" class="form-input" min="0">
						</div>
						<div>
							<label class="form-label" for="texture">Texture (optional)</label>
							<input onchange={handleFileSelect} type="file" id="texture" class="form-input" accept="image/png,image/jpg,image/jpeg,image/gif,image/svg+xml">
							<p class="text-xs text-gray-500 mt-1">Leave empty to keep current texture.</p>
						</div>
					</div>
				</div>

				<div class="flex justify-end gap-4">
					<a href="/marketplace/item/{data.item.id}" class="btn-secondary px-4 py-1 text-sm">Cancel</a>
					<button onclick={saveItem} disabled={loading} class="btn-glossy px-4 py-1 text-sm">
						{#if loading}Saving...{:else}Save Changes{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
</main>
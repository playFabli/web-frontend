<script>
	import { config } from '$lib/config';
	import { goto } from '$app/navigation';
	import TexturePreview from '$lib/components/marketplace/TexturePreview.svelte';
	let { data } = $props();

	let categoryId = $state(data.categories[0].id);
	let title = $state('');
	let description = $state('');
	let price = $state(0);
	let textureFile = $state(null);
	let error = $state('');
	let loading = $state(false);

	let selectedCategory = $derived(
		data.categories.find((c) => c.id === categoryId)
	);
	let categoryTitle = $derived(selectedCategory?.title ?? '');

	async function createItem() {
		error = '';
		loading = true;

		try {
			const formData = new FormData();
			formData.append('category_id', String(categoryId));
			formData.append('title', title);
			formData.append('description', description);
			formData.append('price', String(price));

			if (textureFile) {
				formData.append('texture', textureFile);
			}

			let response = await fetch(`${config.api}/marketplace/item/create`, {
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
					error = json?.message || 'Failed to create item.';
				}
				return;
			}

			if (response.status === 201) {
				goto(`/marketplace/item/${json.data.id}`);
			}
		} catch (err) {
			console.error('Failed to create item.', err);
			error = 'Failed to create item.';
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
	<div class="max-w-container mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/marketplace" class="hover:text-primary">Marketplace</a> ›
			<span class="text-gray-700">Create Item</span>
		</div>

		<div class="max-w-2xl mx-auto">
			<h1 class="text-xl font-bold text-gray-900 mb-5">Create New Item</h1>

			<div class="grid grid-cols-1 md:grid-cols-5 gap-5">
				<div class="md:col-span-3 border border-gray-200 rounded p-5 bg-white">
				{#if error}
					<div class="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{error}
					</div>
				{/if}
				<form>
					<div class="mb-3">
						<label class="form-label" for="itemCategory">Category</label>
						<select id="itemCategory" class="form-input" bind:value={categoryId}>
							{#each data.categories as category}
								<option value={category.id}>{category.title}</option>
							{/each}
						</select>
					</div>

					<div class="mb-3">
						<label class="form-label" for="itemTitle">Title</label>
						<input bind:value={title} type="text" id="itemTitle" class="form-input" placeholder="Item name" required>
					</div>

					<div class="mb-3">
						<label class="form-label" for="itemDescription">Description</label>
						<textarea bind:value={description} id="itemDescription" rows="4" class="form-input" placeholder="Describe your item..."></textarea>
					</div>

					<div class="mb-3">
						<label class="form-label" for="itemTexture">Texture</label>
						<input onchange={handleFileSelect} type="file" id="itemTexture" class="form-input" accept="image/png,image/jpg,image/jpeg,image/gif,image/svg+xml">
						<p class="text-xs text-gray-500 mt-1">PNG or JPG. Max 2MB.</p>
					</div>

					<div class="mb-3">
						<div>
							<label class="form-label" for="itemPrice">Price</label>
							<input bind:value={price} type="number" id="itemPrice" class="form-input" min="0" required>
						</div>
					</div>

					<div class="flex gap-2 justify-end">
						{#if categoryTitle == "Shirts"}
						<a href="/templates/TemplateShirt.png" class="btn-glossy px-4 py-1 text-sm">Download Shirt Template</a>
						{:else if categoryTitle == "Pants"}
						<a href="/templates/TemplatePants.png" class="btn-glossy px-4 py-1 text-sm">Download Pants Template</a>
						{/if}
						<button onclick={createItem} class="btn-glossy px-4 py-1 text-sm" disabled={loading}>
							{#if loading}
								Creating...
							{:else}
								Create Item
							{/if}
						</button>
					</div>
				</form>
			</div>

	<div class="md:col-span-2 border border-gray-200 rounded p-5 bg-white">
		<TexturePreview {textureFile} categoryId={categoryId} token={data.token} />
	</div>
		</div>
		</div>
	</div>
</main>

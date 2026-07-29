<script>
	import { config } from '$lib/config';
	import { goto, invalidateAll } from '$app/navigation';
	let { data } = $props();

	let title = $state('');
	let description = $state('');
	let categoryId = $state('');
	let price = $state(0);
	let rap = $state(0);
	let rarity = $state('none');
	let isLimited = $state(false);
	let stockCount = $state(0);
	let stockLeft = $state(0);
	let isOffsale = $state(false);
	let moderationStatus = $state('pending');
	let collectionId = $state('');
	
	let textureFile = $state(null);
	let modelFile = $state(null);
	let displayImageFile = $state(null);
	let stylesheetFile = $state(null);
	let definition = $state('');

	let error = $state('');
	let success = $state('');
	let loading = $state(false);

	// Get the selected category to check if it has model/texture
	let selectedCategory = $derived(
		data.categories.find(cat => cat.id == categoryId) 
	);
	async function createAsset() {
		error = '';
		success = '';
		loading = true;

		try {
			const formData = new FormData();
			formData.append('title', title);
			formData.append('description', description);
			formData.append('category_id', String(categoryId));
			formData.append('price', String(price));
			formData.append('rap', String(rap));
			formData.append('rarity', rarity);
			formData.append('limited', String(isLimited));
			formData.append('stock_count', String(stockCount));
			formData.append('stock_left', String(stockLeft));
			formData.append('offsale', String(isOffsale));
			formData.append('moderation_status', moderationStatus);

			if (textureFile) {
				formData.append('texture', textureFile);
			}

			if (modelFile) {
				formData.append('model', modelFile);
			}

			if (displayImageFile) {
				formData.append('display_image', displayImageFile);
			}

			if (stylesheetFile) {
				formData.append('stylesheet', stylesheetFile);
			}

			if (definition) {
				formData.append('definition', definition);
			}

			const response = await fetch(`${config.api}/admin/assets`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				},
				body: formData
			});

			const json = await response.json();
			if (!response.ok) {
				error = json?.message || 'Failed to create asset.';
				if (json?.errors) {
					error = Object.values(json.errors).flat().join(', ');
				}
				return;
			}

			success = 'Asset created successfully.';
			setTimeout(() => {invalidateAll(); goto('/admin/assets')}, 800);
		} catch (err) {
			console.error('Failed to create asset.', err);
			error = 'Failed to create asset.';
		} finally {
			loading = false;
		}
	}

		function handleTextureSelect(e) {
			const file = e.target.files?.[0];
			if (file) {
				textureFile = file;
			}
		}

		function handleModelSelect(e) {
			const file = e.target.files?.[0];
			if (file) {
				modelFile = file;
			}
		}

		function handleDisplayImageSelect(e) {
			const file = e.target.files?.[0];
			if (file) {
				displayImageFile = file;
			}
		}

		function handleStylesheetSelect(e) {
			const file = e.target.files?.[0];
			if (file) {
				stylesheetFile = file;
			}
		}
</script>

<main class="py-6">
	<div class="max-w-container mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> ›
			<a href="/admin/assets" class="hover:text-primary">Assets</a> ›
			<span class="text-gray-700">Create</span>
		</div>

		<div class="flex items-center justify-between mb-5">
			<h1 class="text-xl font-bold text-gray-900">Create Asset</h1>
			<a href="/admin/assets" class="btn-secondary px-4 py-1.5 text-sm">← Back to Assets</a>
		</div>

		{#if error}
			<div class="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
		{/if}
		{#if success}
			<div class="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
		{/if}

		<div class="border border-gray-200 rounded p-4 bg-white card-shadow space-y-4">
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label class="form-label" for="name">Name</label>
					<input bind:value={title} type="text" id="name" class="form-input" placeholder="Asset name">
				</div>
				<div>
					<label class="form-label" for="type">Category</label>
					<select onselect={()=>console.log(selectedCategory)} bind:value={categoryId} id="type" class="form-input">
						<option value="">Select category</option>
						{#each data.categories as cat}
							<option value={cat.id}>{cat.title}</option>
						{/each}
					</select>
				</div>
				<div class="sm:col-span-2">
					<label class="form-label" for="description">Description</label>
					<textarea bind:value={description} id="description" rows="2" class="form-input"></textarea>
				</div>
				<div>
					<label class="form-label" for="price">Price</label>
					<input bind:value={price} type="number" id="price" class="form-input" min="0">
				</div>
				<div>
					<label class="form-label" for="rap">VAL</label>
					<input bind:value={rap} type="number" id="rap" class="form-input" min="0">
				</div>
				<div>
					<label class="form-label" for="rarity">Rarity</label>
					<select bind:value={rarity} id="rarity" class="form-input">
						<option value="none">None</option>
						<option value="uncommon">Uncommon</option>
						<option value="rare">Rare</option>
						<option value="epic">Epic</option>
						<option value="legendary">Legendary</option>
					</select>
				</div>
				<div>
					<label class="form-label" for="status">Moderation Status</label>
					<select bind:value={moderationStatus} id="status" class="form-input">
						<option value="pending">Pending</option>
						<option value="approved">Approved</option>
						<option value="unapproved">Unapproved</option>
					</select>
				</div>
				<div>
					<label class="flex items-center gap-2 text-sm cursor-pointer mt-5">
						<input type="checkbox" bind:checked={isLimited} class="w-4 h-4 rounded border-gray-300 text-primary">
						<span class="font-medium text-gray-700">Limited</span>
					</label>
				</div>
				<div>
					<label class="flex items-center gap-2 text-sm cursor-pointer mt-5">
						<input type="checkbox" bind:checked={isOffsale} class="w-4 h-4 rounded border-gray-300 text-primary">
						<span class="font-medium text-gray-700">Offsale</span>
					</label>
				</div>
				{#if isLimited}
					<div>
						<label class="form-label" for="stockCount">Stock Count</label>
						<input bind:value={stockCount} type="number" id="stockCount" class="form-input" min="0">
					</div>
					<div>
						<label class="form-label" for="stockLeft">Stock Left</label>
						<input bind:value={stockLeft} type="number" id="stockLeft" class="form-input" min="0">
					</div>
				{/if}
			</div>

			{#if data.collections && data.collections.length > 0}
				<div class="border-t border-gray-200 pt-4 mt-4">
					<div class="mb-3">
						<label class="form-label" for="collection">Collection</label>
						<select bind:value={collectionId} id="collection" class="form-input">
							<option value="">No collection</option>
							{#each data.collections as col}
								<option value={col.id}>{col.name}</option>
							{/each}
						</select>
						<p class="text-xs text-gray-500 mt-1">Assign this item to a collection. Can be changed later.</p>
					</div>
				</div>
			{/if}

			{#if selectedCategory && selectedCategory.has_model}
				<div class="border-t border-gray-200 pt-4 mt-4">
					<div class="mb-3">
						<label class="form-label" for="itemModel">3D Model (.obj)</label>
						<input onchange={handleModelSelect} type="file" id="itemModel" class="form-input" accept=".obj">
						<p class="text-xs text-gray-500 mt-1">OBJ file for 3D model rendering. Required for categories with 3D models.</p>
					</div>
				</div>
			{/if}

			{#if selectedCategory && selectedCategory.has_texture}
				<div class="border-t border-gray-200 pt-4 mt-4">
					<div class="mb-3">
						<label class="form-label" for="itemTexture">Texture</label>
						<input onchange={handleTextureSelect} type="file" id="itemTexture" class="form-input" accept="image/png,image/jpg,image/jpeg,image/gif,image/svg+xml">
						<p class="text-xs text-gray-500 mt-1">PNG or JPG. Max 2MB. Used for texture-based items.</p>
					</div>
				</div>
			{/if}

			{#if selectedCategory && !selectedCategory.needs_rendering}
				<div class="border-t border-gray-200 pt-4 mt-4">
					<div class="mb-3">
						<label class="form-label" for="displayImage">Display Image</label>
						<input onchange={handleDisplayImageSelect} type="file" id="displayImage" class="form-input" accept="image/png,image/jpg,image/jpeg,image/gif,image/svg+xml">
						<p class="text-xs text-gray-500 mt-1">Required for categories without rendering. Will be saved as items/id.png</p>
					</div>
				</div>
			{/if}

			<!-- Avatar Pose Definition (only for Avatar Poses) -->
			{#if selectedCategory && selectedCategory.title === 'Avatar Poses'}
				<div class="border-t border-gray-200 pt-4 mt-4">
					<div class="mb-3">
						<label class="form-label" for="definition">Pose Definition</label>
						<textarea bind:value={definition} id="definition" rows="6" class="form-input font-mono text-xs" placeholder="Paste pose definition here..."></textarea>
						<p class="text-xs text-gray-500 mt-1">Paste the avatar pose definition data. This will be stored in the avatar_pose_definitions table.</p>
					</div>
				</div>
			{/if}

			<!-- Stylesheet Upload (only for Profile Themes or Avatar Frames) -->
			{#if selectedCategory && (selectedCategory.title === 'Profile Themes' || selectedCategory.title === 'Avatar Frames')}
				<div class="border-t border-gray-200 pt-4 mt-4">
					<div class="mb-3">
						<label class="form-label" for="stylesheet">Stylesheet (.css)</label>
						<input onchange={handleStylesheetSelect} type="file" id="stylesheet" class="form-input" accept=".css">
						<p class="text-xs text-gray-500 mt-1">CSS file for profile theme styling. Optional. Will be served at /storage/stylesheets/id.css</p>
					</div>
				</div>
			{/if}

			<div class="flex justify-end gap-3 pt-2">
				<a href="/admin/assets" class="btn-secondary px-6 py-1 text-sm">Cancel</a>
				<button onclick={createAsset} disabled={loading} class="btn-glossy px-6 py-1 text-sm">
					{#if loading}Creating...{:else}Create Asset{/if}
				</button>
			</div>
		</div>
	</div>
</main>
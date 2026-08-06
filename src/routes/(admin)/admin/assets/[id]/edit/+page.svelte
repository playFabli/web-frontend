<script>
	import { config } from '$lib/config';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	let title = $state(data.item.title);
	let description = $state(data.item.description);
	let categoryId = $state(data.item.category_id);
	let price = $state(data.item.price);
	let rap = $state(data.item.rap);
	let rarity = $state(data.item.rarity);
	let isLimited = $state(data.item.is_limited);
	let stockCount = $state(data.item.stock_count);
	let stockLeft = $state(data.item.stock_left);
	let isOffsale = $state(data.item.is_offsale);
	let isTimed = $state(data.item.is_timed ?? false);
	let timedEndAt = $state(data.item.timed_end_at ? data.item.timed_end_at.slice(0, 16) : '');
	let moderationStatus = $state(data.item.moderation_status);
	let collectionId = $state(data.item.collections?.[0]?.id || '');

	let error = $state('');
	let success = $state('');
	let loading = $state(false);

	let grantUserId = $state('');
	let grantLoading = $state(false);
	let grantError = $state('');
	let grantSuccess = $state('');

	let stylesheetFile = $state(null);
	let modelFile = $state(null);
	let textureFile = $state(null);
	let renderLoading = $state(false);
	let renderMessage = $state('');
	let imageVersion = $state(0);
	let poseDefinition = $state(data.item.pose_definition ?? '');

	let selectedCategory = $derived(data.categories.find(c => String(c.id) === String(categoryId)));

	let templateLoading = $state(false);
	let templateError = $state('');
	let templateImageUrl = $state('');

	async function requestTemplate() {
		templateError = '';
		templateImageUrl = '';

		try {
			const response = await fetch(`${config.api}/admin/assets/${data.item.id}/request-template`, {
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Accept': 'application/json'
				}
			});

			if (!response.ok) {
				const json = await response.json();
				templateError = json?.message || 'Failed to load template.';
				return;
			}

			const blob = await response.blob();
			templateImageUrl = URL.createObjectURL(blob);
		} catch (err) {
			console.error('Failed to request template.', err);
			templateError = 'Failed to request template.';
		}
	}

	let collectionLoading = $state(false);
	let collectionError = $state('');

		function handleStylesheetSelect(e) {
			const file = e.target.files?.[0];
			if (file) {
				stylesheetFile = file;
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

	async function rerenderItem() {
			renderMessage = '';

			try {
				renderLoading = true;
				const response = await fetch(`${config.api}/admin/assets/${data.item.id}/rerender`, {
					method: 'POST',
					headers: {
						'Accept': 'application/json',
						'Authorization': `Bearer ${data.token}`
					}
				});

				const json = await response.json();
				if (!response.ok) {
					renderMessage = `Render failed: ${json?.message || 'Unknown error'}`;
					return;
				}

				renderMessage = 'Render complete.';
				imageVersion++;
			} catch (err) {
				console.error('Failed to rerender item.', err);
				renderMessage = 'Render failed.';
			} finally {
				renderLoading = false;
			}
		}

	async function saveAsset() {
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
				formData.append('is_limited', String(isLimited));
				formData.append('stock_count', String(stockCount));
				formData.append('stock_left', String(stockLeft));
				formData.append('is_offsale', String(isOffsale));
				formData.append('is_timed', String(isTimed));
				if (isTimed && timedEndAt) {
					formData.append('timed_end_at', new Date(timedEndAt).toISOString());
				}
				formData.append('moderation_status', moderationStatus);

				if (stylesheetFile) {
					formData.append('stylesheet', stylesheetFile);
				}

				if (textureFile) {
					formData.append('texture', textureFile);
				}

				if (modelFile) {
					formData.append('model', modelFile);
				}

				if (selectedCategory?.title === 'Avatar Poses') {
					formData.append('definition', poseDefinition ?? '');
				}

				const response = await fetch(`${config.api}/admin/assets/${data.item.id}`, {
					method: 'POST',
					headers: {
						'Accept': 'application/json',
						'Authorization': `Bearer ${data.token}`
					},
					body: formData
				});

			const json = await response.json();
			if (!response.ok) {
				error = json?.message || 'Failed to save asset.';
				return;
			}

			// Handle collection assignment
			if (collectionId) {
				// First remove from any existing collections
				if (data.item.collections && data.item.collections.length > 0) {
					for (const col of data.item.collections) {
						await fetch(`${config.api}/admin/collections/${col.id}/remove-item/${data.item.id}`, {
							method: 'POST',
							headers: {
								'Accept': 'application/json',
								'Authorization': `Bearer ${data.token}`
							}
						});
					}
				}
				// Add to selected collection
				await fetch(`${config.api}/admin/collections/${collectionId}/add-item/${data.item.id}`, {
					method: 'POST',
					headers: {
						'Accept': 'application/json',
						'Authorization': `Bearer ${data.token}`
					}
				});
			} else if (data.item.collections && data.item.collections.length > 0) {
				// Remove from all collections if "No collection" selected
				for (const col of data.item.collections) {
					await fetch(`${config.api}/admin/collections/${col.id}/remove-item/${data.item.id}`, {
						method: 'POST',
						headers: {
							'Accept': 'application/json',
							'Authorization': `Bearer ${data.token}`
						}
					});
				}
			}

			success = 'Asset updated successfully.';
		} catch (err) {
			console.error('Failed to save asset.', err);
			error = 'Failed to save asset.';
		} finally {
			loading = false;
		}
	}

	async function grantItem() {
		grantError = '';
		grantSuccess = '';
		grantLoading = true;

		try {
			const response = await fetch(`${config.api}/admin/assets/${data.item.id}/grant`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				},
				body: JSON.stringify({ user_id: grantUserId })
			});

			const json = await response.json();
			if (!response.ok) {
				grantError = json?.message || 'Failed to grant item.';
				return;
			}

			grantSuccess = 'Item granted successfully.';
			grantUserId = '';
		} catch (err) {
			console.error('Failed to grant item.', err);
			grantError = 'Failed to grant item.';
		} finally {
			grantLoading = false;
		}
	}
</script>

<style>
	.loot-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.loot-table th {
		background-color: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		padding: 0.5rem 0.75rem;
		text-align: left;
		font-weight: 600;
		color: #4b5563;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.loot-table td {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.5rem 0.75rem;
		vertical-align: middle;
	}
</style>

<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> вЂє
			<a href="/admin/assets" class="hover:text-primary">Assets</a> вЂє
			<span class="text-gray-700">Edit {data.item.title}</span>
		</div>

		<div class="flex items-center justify-between mb-5">
			<h1 class="text-xl font-bold text-gray-900">Edit Asset</h1>
			<a href="/admin/assets" class="btn-secondary px-4 py-1 text-sm">в†ђ Back to Assets</a>
		</div>

		{#if error}
			<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
		{/if}
		{#if success}
			<div class="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
			<div class="md:col-span-1">
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white text-center">
					<img src={config.storage + "/items/" + data.item.id + ".png?v=" + imageVersion} alt={data.item.title} class="w-full border border-gray-300 rounded-lg" loading="lazy">
					<p class="text-sm text-gray-600 mt-2">Creator: {data.item.user?.username || 'N/A'}</p>
					{#if data.item.category.title === "Shirts" || data.item.category.title === "Pants"}
						<button onclick={requestTemplate} class="btn-secondary px-4 py-1 text-sm mt-3 w-full">
							Request Template
						</button>
						{#if templateError}
							<div class="mt-2 text-sm text-red-700">{templateError}</div>
						{/if}
					{/if}
				</div>
			</div>

			{#if templateImageUrl}
				<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => { templateImageUrl = ''; }}>
					<div class="bg-white rounded-lg-lg p-4 max-w-lg w-full mx-4" onclick={(e) => e.stopPropagation()}>
						<div class="flex items-center justify-between mb-3">
							<h3 class="text-lg font-bold text-gray-900">Texture Template</h3>
							<button onclick={() => { templateImageUrl = ''; }} class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
						</div>
						<img src={templateImageUrl} alt="Texture template" class="w-full border border-gray-300 rounded-lg">
					</div>
				</div>
			{/if}

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
								<option value="unapproved">Removed</option>
							</select>
						</div>
						<div>
							<label class="flex items-center gap-2 text-sm cursor-pointer mt-5">
								<input type="checkbox" bind:checked={isLimited} class="w-4 h-4 rounded-lg border-gray-300 text-primary">
								<span class="font-bold text-gray-700">Limited</span>
							</label>
						</div>
						<div>
							<label class="flex items-center gap-2 text-sm cursor-pointer mt-5">
								<input type="checkbox" bind:checked={isOffsale} class="w-4 h-4 rounded-lg border-gray-300 text-primary">
								<span class="font-bold text-gray-700">Offsale</span>
							</label>
						</div>
						<div>
							<label class="flex items-center gap-2 text-sm cursor-pointer mt-5">
								<input type="checkbox" bind:checked={isTimed} class="w-4 h-4 rounded-lg border-gray-300 text-primary">
								<span class="font-bold text-gray-700">Timed (auto offsale)</span>
							</label>
						</div>
						{#if isTimed}
						<div class="sm:col-span-2">
							<label class="form-label" for="timedEndAt">End Date & Time</label>
							<input bind:value={timedEndAt} type="datetime-local" id="timedEndAt" class="form-input">
							<p class="text-xs text-gray-500 mt-1">The item will automatically go offsale at this date and time.</p>
						</div>
						{/if}
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
				</div>

				{#if categoryId && (data.item.category.title === 'Profile Themes' || data.item.category.title === 'Avatar Frames')}
				<div class="border-t border-[#EFE6E2] pt-4 mt-4">
					<div class="mb-3">
						<label class="form-label" for="stylesheet">Stylesheet (.css)</label>
						<input onchange={handleStylesheetSelect} type="file" id="stylesheet" class="form-input" accept=".css">
						<p class="text-xs text-gray-500 mt-1">CSS file for styling. Optional. Will be served at /storage/stylesheets/{data.item.id}.css</p>
					</div>
				</div>
			{/if}

				{#if selectedCategory && (selectedCategory.has_model || selectedCategory.has_texture)}
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-bold mb-3">Model & Texture</h2>
					{#if selectedCategory.has_texture}
						<div class="mb-3">
							<label class="form-label" for="texture">Texture (.png)</label>
							<input onchange={handleTextureSelect} type="file" id="texture" class="form-input" accept=".png,image/png">
							<p class="text-xs text-gray-500 mt-1">Replaces the current texture. Leave empty to keep the current one.</p>
						</div>
					{/if}
					{#if selectedCategory.has_model}
						<div class="mb-3">
							<label class="form-label" for="model">Model (.obj)</label>
							<input onchange={handleModelSelect} type="file" id="model" class="form-input" accept=".obj">
							<p class="text-xs text-gray-500 mt-1">Replaces the current 3D model. Leave empty to keep the current one.</p>
						</div>
					{/if}
				</div>
			{/if}
			

				{#if selectedCategory && selectedCategory.title === 'Avatar Poses'}
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-bold mb-3">Avatar Pose Definition</h2>
					<div class="mb-3">
						<label class="form-label" for="definition">Pose Definition</label>
						<textarea bind:value={poseDefinition} id="definition" rows="6" class="form-input font-mono text-xs" placeholder="Paste pose definition here..."></textarea>
						<p class="text-xs text-gray-500 mt-1">Paste the avatar pose definition data. This will be stored in the avatar_pose_definitions table.</p>
					</div>
				</div>
			{/if}

				{#if data.collections && data.collections.length > 0}
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-bold mb-3">Collection Assignment</h2>
					<div class="mb-3">
						<label class="form-label" for="collection">Collection</label>
						<select bind:value={collectionId} id="collection" class="form-input">
							<option value="">No collection</option>
							{#each data.collections as col}
								<option value={col.id}>{col.name} ({col.items_count} items)</option>
							{/each}
						</select>
						<p class="text-xs text-gray-500 mt-1">Assign this item to a collection. Save the asset to apply changes.</p>
					</div>
				</div>
				{/if}

				<div class="flex justify-end gap-2">
					<a href="/admin/assets" class="btn-secondary px-4 py-1 text-sm">Back</a>
					<button onclick={saveAsset} disabled={loading} class="btn-glossy px-4 py-1 text-sm">
						{#if loading}Saving...{:else}Save Changes{/if}
					</button>
					<button onclick={rerenderItem} disabled={renderLoading} class="btn-secondary px-4 py-1 text-sm">
						{renderLoading ? 'Rendering...' : 'Rerender Item'}
					</button>
					{#if renderMessage}
						<span class="text-sm text-gray-600">{renderMessage}</span>
					{/if}
				</div>
				{#if page.data.globalUser.role == "admin"}
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-bold mb-2">Grant Item to User</h2>
					<p class="text-sm text-gray-600 mb-3">Give this item to a user by ID.</p>
					<div class="flex gap-2">
						<input bind:value={grantUserId} type="number" placeholder="User ID" class="form-input" min="1">
						<button onclick={grantItem} disabled={grantLoading} class="btn-glossy px-4 py-1 text-sm">
							{grantLoading ? 'Granting...' : 'Grant'}
						</button>
					</div>
					{#if grantError}
						<div class="mt-2 text-sm text-red-700">{grantError}</div>
					{/if}
					{#if grantSuccess}
						<div class="mt-2 text-sm text-green-700">{grantSuccess}</div>
					{/if}
				</div>
				{/if}
			</div>
		</div>
	</div>
</main>
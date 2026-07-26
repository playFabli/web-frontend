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
	let moderationStatus = $state(data.item.moderation_status);

	let error = $state('');
	let success = $state('');
	let loading = $state(false);

	let grantUserId = $state('');
	let grantLoading = $state(false);
	let grantError = $state('');
	let grantSuccess = $state('');

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

	async function saveAsset() {
		error = '';
		success = '';
		loading = true;

		try {
			const body = {
				title,
				description,
				category_id: categoryId,
				price,
				rap,
				rarity,
				is_limited: isLimited,
				stock_count: stockCount,
				stock_left: stockLeft,
				is_offsale: isOffsale,
				moderation_status: moderationStatus
			};

			const response = await fetch(`${config.api}/admin/assets/${data.item.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				},
				body: JSON.stringify(body)
			});

			const json = await response.json();
			if (!response.ok) {
				error = json?.message || 'Failed to save asset.';
				return;
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
	<div class="max-w-container mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> ›
			<a href="/admin/assets" class="hover:text-primary">Assets</a> ›
			<span class="text-gray-700">Edit {data.item.title}</span>
		</div>

		<div class="flex items-center justify-between mb-5">
			<h1 class="text-xl font-bold text-gray-900">Edit Asset</h1>
			<a href="/admin/assets" class="btn-secondary px-4 py-1 text-sm">← Back to Assets</a>
		</div>

		{#if error}
			<div class="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
		{/if}
		{#if success}
			<div class="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
			<div class="md:col-span-1">
				<div class="border border-gray-200 rounded p-4 bg-white text-center">
					<img src={config.storage + "/items/" + data.item.id + ".png"} alt={data.item.title} class="w-full border border-gray-300 rounded" loading="lazy">
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
					<div class="bg-white rounded-lg p-4 max-w-lg w-full mx-4" onclick={(e) => e.stopPropagation()}>
						<div class="flex items-center justify-between mb-3">
							<h3 class="text-lg font-semibold text-gray-900">Texture Template</h3>
							<button onclick={() => { templateImageUrl = ''; }} class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
						</div>
						<img src={templateImageUrl} alt="Texture template" class="w-full border border-gray-300 rounded">
					</div>
				</div>
			{/if}

			<div class="md:col-span-2 space-y-4">
				<div class="border border-gray-200 rounded p-4 bg-white">
					<h2 class="text-lg font-semibold text-accent mb-3">Basic Information</h2>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
				</div>

				<div class="flex justify-end gap-3">
					<a href="/admin/assets" class="btn-secondary px-4 py-1 text-sm">Back</a>
					<button onclick={saveAsset} disabled={loading} class="btn-glossy px-4 py-1 text-sm">
						{#if loading}Saving...{:else}Save Changes{/if}
					</button>
				</div>
				{#if page.data.globalUser.role == "admin"}
				<div class="border border-gray-200 rounded p-4 bg-white">
					<h2 class="text-lg font-semibold text-accent mb-2">Grant Item to User</h2>
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
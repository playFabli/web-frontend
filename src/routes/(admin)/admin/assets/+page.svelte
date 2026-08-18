<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { config } from '$lib/config.js';

	let { data } = $props();

	let searchQuery = $state('');
	let selectedStatus = $state('');
	let assetsPromise = $state(Promise.resolve(data.assets));

	const formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	async function fetchAssets(page = 1) {
		const params = new URLSearchParams();
		if (searchQuery) params.set('query', searchQuery);
		if (selectedStatus) params.set('status', selectedStatus);
		params.set('page', page.toString());

		const response = await fetch(`${config.api}/admin/assets?${params.toString()}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			}
		});

		const json = await response.json();
		if (!response.ok) {
			console.error(json?.message || 'Failed to fetch assets.');
			return data.assets;
		}

		return json || data.assets;
	}

	function applyFilters() {
		assetsPromise = fetchAssets(1);
	}

	async function approveAsset(id) {
		const response = await fetch(`${config.api}/admin/items/${id}/approve`, {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			}
		});
		if (response.ok) assetsPromise = fetchAssets(1);
	}

	async function rejectAsset(id) {
		const response = await fetch(`${config.api}/admin/items/${id}/reject`, {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			}
		});
		if (response.ok) assetsPromise = fetchAssets(1);
	}

	async function deleteAsset(id) {
		if (!confirm('Are you sure you want to remove this asset?')) return;
		const response = await fetch(`${config.api}/admin/assets/${id}`, {
			method: 'DELETE',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			}
		});
		if (response.ok) assetsPromise = fetchAssets(1);
	}

	function getStatusClass(status) {
		if (status === 'approved') return 'status-approved';
		if (status === 'pending') return 'status-pending';
		return 'status-removed';
	}

	function formatDate(dateStr) {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}
</script>

<style>
	.assets-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.assets-table th {
		background-color: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		padding: 0.6rem 0.75rem;
		text-align: left;
		font-weight: 600;
		color: #4b5563;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.assets-table td {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.6rem 0.75rem;
		vertical-align: middle;
	}
	.assets-table tr:hover td {
		background-color: #fafafa;
	}

	.status-badge {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.1rem 0.5rem;
		border-radius: 3px;
		border: 1px solid;
	}
	.status-approved {
		background: #dcfce7;
		color: #166534;
		border-color: #bbf7d0;
	}
	.status-pending {
		background: #fef9c3;
		color: #854d0e;
		border-color: #fde68a;
	}
	.status-removed {
		background: #fee2e2;
		color: #991b1b;
		border-color: #fecaca;
	}
</style>
<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> вЂє
			<span class="text-gray-700">Assets</span>
		</div>
		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
		<h1 class="text-xl font-bold text-gray-900">Manage Assets</h1>
		{#if page.data.globalUser.role == "admin" || page.data.globalUser.role == "asset_creator"}
			<div class="flex gap-2 w-full sm:w-auto">
				<a href="/admin/assets/create" class="btn-glossy px-4 py-1">Create</a>
			</div>
		{/if}
		</div>

		<div class="border border-[#EFE6E2] rounded-lg p-4 mb-4 bg-white flex flex-wrap gap-4 items-end">
			<div class="flex-1 min-w-[200px]">
				<label class="block text-xs font-bold text-gray-600 mb-1">Search</label>
				<input bind:value={searchQuery} type="text" placeholder="Asset name..." class="form-input">
			</div>
			<div>
				<label class="block text-xs font-bold text-gray-600 mb-1">Status</label>
				<select bind:value={selectedStatus} class="form-input">
					<option value="">All</option>
					<option value="approved">Approved</option>
					<option value="pending">Pending</option>
					<option value="unapproved">Unapproved</option>
				</select>
			</div>
			<button onclick={applyFilters} class="btn-secondary px-4 py-1 text-sm">Apply Filters</button>
		</div>

		<div class="border border-[#EFE6E2] rounded-lg overflow-x-auto">
			<table class="assets-table">
				<thead>
					<tr>
						<th class="w-12">ID</th>
						<th>Name</th>
						<th>Type</th>
						<th>Creator</th>
						<th>Status</th>
						<th>Created</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#await assetsPromise then assets}
						{#each assets.data as item}
							<tr>
								<td class="text-xs text-gray-500">#{item.id}</td>
								<td><span class="font-bold text-gray-900">{item.title}</span></td>
								<td class="text-sm">{item.category?.title || 'N/A'}</td>
								<td class="text-sm">{item.user?.username || 'N/A'}</td>
								{#if !item.is_deleted}
								<td><span class="status-badge {getStatusClass(item.moderation_status)}">{item.moderation_status}</span></td>
								{:else}
								<td><span class="status-badge status-removed">removed</span></td>

								{/if}
								<td class="text-sm text-gray-500">{formatDate(item.created_at)}</td>
								<td class="text-right">
									<div class="flex gap-1 justify-end">
										{#if item.moderation_status === 'pending'}
											<button onclick={() => approveAsset(item.id)} class="btn-glossy px-2 py-1 text-xs">Approve</button>
											<button onclick={() => rejectAsset(item.id)} class="btn-danger px-2 py-1 text-xs">Reject</button>
										{:else if item.moderation_status === 'unapproved'}
											<button onclick={() => approveAsset(item.id)} class="btn-glossy px-2 py-1 text-xs">Restore</button>
										{/if}
											<button onclick={() => goto(`/admin/assets/${item.id}/edit`)} class="btn-glossy px-2 py-1 text-xs">Edit</button>
										<button onclick={() => deleteAsset(item.id)} class="btn-danger px-2 py-1 text-xs">Remove</button>
									</div>
								</td>
							</tr>
						{/each}
						{#if assets.data.length === 0}
							<tr>
								<td colspan="7" class="text-center text-gray-500 py-4">No assets found.</td>
							</tr>
						{/if}
					{/await}
				</tbody>
			</table>
		</div>

		{#await assetsPromise then assets}
		<div class="flex items-center justify-between mt-4">
			<span class="text-sm text-gray-600">Showing {((assets.current_page - 1) * assets.per_page) + 1}-{Math.min(assets.current_page * assets.per_page, assets.total)} of {formatter.format(assets.total)} assets</span>
			<div class="flex gap-1">
				{#if assets.prev_page_url}
					<button onclick={() => assetsPromise = fetchAssets(assets.current_page - 1)} class="btn-secondary px-3 py-1 text-sm">← Previous</button>
				{:else}
					<button class="btn-secondary px-3 py-1 text-sm opacity-50 cursor-not-allowed" disabled>← Previous</button>
				{/if}
				{#if assets.next_page_url}
					<button onclick={() => assetsPromise = fetchAssets(assets.current_page + 1)} class="btn-secondary px-3 py-1 text-sm">Next →</button>
				{:else}
					<button class="btn-secondary px-3 py-1 text-sm opacity-50 cursor-not-allowed" disabled>Next →</button>
				{/if}
			</div>
		</div>
		{/await}
	</div>
</main>
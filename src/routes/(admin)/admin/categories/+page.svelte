<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { config } from '$lib/config.js';

	let { data } = $props();

	let categories = $state(data.categories);
	let showModal = $state(false);
	let editingCategory = $state(null);
	let formTitle = $state('');
	let formSortIndex = $state(0);
	let formIsAdminOnly = $state(true);
	let formHasModel = $state(false);
	let formHasTexture = $state(false);
	let formPartsAffected = $state('');
	let formNeedsRendering = $state(false);

	function openModal(category = null) {
		if (category) {
			editingCategory = category;
			formTitle = category.title;
			formSortIndex = category.sort_index;
			formIsAdminOnly = category.is_admin_only;
			formHasModel = category.has_model;
			formHasTexture = category.has_texture;
			formPartsAffected = category.parts_affected || '';
			formNeedsRendering = category.needs_rendering;
		} else {
			editingCategory = null;
			formTitle = '';
			formSortIndex = categories.length > 0 ? Math.max(...categories.map(c => c.sort_index)) + 1 : 0;
			formIsAdminOnly = true;
			formHasModel = false;
			formHasTexture = false;
			formPartsAffected = '';
			formNeedsRendering = false;
		}
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingCategory = null;
	}

	async function saveCategory() {
		const url = editingCategory
			? `${config.api}/admin/categories/${editingCategory.id}`
			: `${config.api}/admin/categories`;

		const method = editingCategory ? 'POST' : 'POST';

		const body = {
			title: formTitle,
			sort_index: formSortIndex,
			is_admin_only: formIsAdminOnly,
			has_model: formHasModel,
			has_texture: formHasTexture,
			parts_affected: formPartsAffected || null,
			needs_rendering: formNeedsRendering
		};

		const response = await fetch(url, {
			method: method,
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			},
			body: JSON.stringify(body)
		});

		if (response.ok) {
			await loadCategories();
			closeModal();
		} else {
			console.error('Failed to save category');
		}
	}

	async function deleteCategory(category) {
		if (!confirm(`Are you sure you want to delete "${category.title}"?`)) return;

		const response = await fetch(`${config.api}/admin/categories/${category.id}`, {
			method: 'DELETE',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			}
		});

		if (response.ok) {
			categories = categories.filter(c => c.id !== category.id);
		} else {
			console.error('Failed to delete category');
		}
	}

	async function loadCategories() {
		const response = await fetch(`${config.api}/admin/categories`, {
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			}
		});

		if (response.ok) {
			const json = await response.json();
			categories = json.data;
		}
	}
</script>

<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> ›
			<span class="text-gray-700">Categories</span>
		</div>

		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
			<h1 class="text-xl font-bold text-gray-900">Manage Categories</h1>
			<button onclick={() => openModal()} class="text-sm btn-glossy px-4 py-1">Create Category</button>
		</div>

		<div class="border border-[#EFE6E2] rounded-lg overflow-hidden">
			<table class="categories-table">
				<thead>
					<tr>
						<th class="w-16">Sort</th>
						<th class="w-20">ID</th>
						<th>Title</th>
						<th>Admin Only</th>
						<th>Model</th>
						<th>Texture</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each categories as category}
						<tr>
							<td class="text-sm text-gray-600">{category.sort_index}</td>
							<td class="text-xs text-gray-500">#{category.id}</td>
							<td><span class="font-bold text-gray-900">{category.title}</span></td>
							<td class="text-sm">
								{#if category.is_admin_only}
									<span class="status-badge status-pending">Yes</span>
								{:else}
									<span class="status-badge status-approved">No</span>
								{/if}
							</td>
							<td class="text-sm">
								{#if category.has_model}
									<span class="status-badge status-approved">Yes</span>
								{:else}
									<span class="text-gray-400">No</span>
								{/if}
							</td>
							<td class="text-sm">
								{#if category.has_texture}
									<span class="status-badge status-approved">Yes</span>
								{:else}
									<span class="text-gray-400">No</span>
								{/if}
							</td>
							<td class="text-right">
									<div class="flex gap-1 justify-end">
										<button onclick={() => openModal(category)} class="btn-glossy px-2 py-1 text-xs">Edit</button>
										<button onclick={() => deleteCategory(category)} class="btn-danger px-2 py-1 text-xs">Delete</button>
									</div>
							</td>
						</tr>
					{/each}
					{#if categories.length === 0}
						<tr>
							<td colspan="7" class="text-center text-gray-500 py-4">No categories found.</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</main>

{#if showModal}
	<div class="modal-overlay" onclick={closeModal}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<h2 class="text-lg font-bold text-gray-900 mb-4">
				{editingCategory ? 'Edit Category' : 'Create Category'}
			</h2>

			<div class="space-y-3">
				<div>
					<label class="block text-xs font-bold text-gray-600 mb-1">Title</label>
					<input bind:value={formTitle} type="text" class="form-input" placeholder="Category title">
				</div>

				<div>
					<label class="block text-xs font-bold text-gray-600 mb-1">Sort Index</label>
					<input bind:value={formSortIndex} type="number" class="form-input" min="0">
				</div>

				<div class="flex flex-wrap gap-4">
					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={formIsAdminOnly} class="form-checkbox">
						<span class="text-sm text-gray-700">Admin Only</span>
					</label>
					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={formHasModel} class="form-checkbox">
						<span class="text-sm text-gray-700">Has Model</span>
					</label>
					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={formHasTexture} class="form-checkbox">
						<span class="text-sm text-gray-700">Has Texture</span>
					</label>
					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={formNeedsRendering} class="form-checkbox">
						<span class="text-sm text-gray-700">Needs Rendering</span>
					</label>
				</div>

				<div>
					<label class="block text-xs font-bold text-gray-600 mb-1">Parts Affected (comma-separated)</label>
					<input bind:value={formPartsAffected} type="text" class="form-input" placeholder="head, torso, left_arm">
				</div>
			</div>

			<div class="flex gap-2 justify-end mt-5">
				<button onclick={closeModal} class="btn-secondary px-4 py-1 text-sm">Cancel</button>
				<button onclick={saveCategory} class="btn-glossy px-4 py-1 text-sm">Save</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.modal-content {
		background: white;
		border-radius: 6px;
		padding: 1.5rem;
		width: 90%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
	}
	.categories-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.categories-table th {
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
	.categories-table td {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.6rem 0.75rem;
		vertical-align: middle;
	}
	.categories-table tr:hover td {
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

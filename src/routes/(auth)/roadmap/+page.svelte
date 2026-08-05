<script lang="ts">
	import { config } from '$lib/config';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	interface RoadmapItem {
		id: number;
		title: string;
		description: string;
		status: 'planned' | 'wip' | 'done';
		phase: string;
		sort_order: number;
	}

	let items: RoadmapItem[] = $state([]);
	let loading = $state(true);
	let error = $state('');
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let editingItem: RoadmapItem | null = $state(null);
	let newTitle = $state('');
	let newDescription = $state('');
	let newStatus: 'planned' | 'wip' | 'done' = $state('planned');
	let newPhase = $state('planned');
	let newSortOrder = $state(0);

	async function fetchRoadmap() {
		loading = true;
		error = '';
		try {
			const res = await fetch(`${config.api}/user/roadmap`, {
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token}`
				}
			});
			const json = await res.json();
			
			if (!res.ok) {
				error = 'Failed to load roadmap.';
				return;
			}

			items = json || [];
		} catch (e) {
			error = 'Failed to load roadmap.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchRoadmap();
	});

	function getStatusClass(status: string) {
		return `status-${status}`;
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case 'done': return 'Done';
			case 'wip': return 'In Progress';
			case 'planned': return 'Planned';
			default: return status;
		}
	}

	function getPhaseLabel(phase: string) {
		switch (phase) {
			case 'alpha': return 'Alpha';
			case 'beta': return 'Beta';
			case 'planned': return 'Planned';
			default: return phase;
		}
	}

	function getPhaseStatus(phase: string) {
		switch (phase) {
			case 'alpha': return 'done';
			case 'beta': return 'wip';
			case 'planned': return 'planned';
			default: return 'planned';
		}
	}

	async function createItem() {
		if (!newTitle.trim() || !newDescription.trim()) return;

		try {
			const res = await fetch(`${config.api}/user/roadmap`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token}`
				},
				body: JSON.stringify({
					title: newTitle,
					description: newDescription,
					status: newStatus,
					phase: newPhase,
					sort_order: newSortOrder
				})
			});

			if (res.ok) {
				newTitle = '';
				newDescription = '';
				newStatus = 'planned';
				newPhase = 'planned';
				newSortOrder = 0;
				showCreateModal = false;
				fetchRoadmap();
			}
		} catch (e) {
			console.error('Failed to create item');
		}
	}

	async function updateItem() {
		if (!editingItem) return;

		try {
			const res = await fetch(`${config.api}/user/roadmap/${editingItem.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token}`
				},
				body: JSON.stringify({
					title: editingItem.title,
					description: editingItem.description,
					status: editingItem.status,
					phase: editingItem.phase,
					sort_order: editingItem.sort_order
				})
			});

			if (res.ok) {
				editingItem = null;
				showEditModal = false;
				fetchRoadmap();
			}
		} catch (e) {
			console.error('Failed to update item');
		}
	}

	async function deleteItem(id: number) {
		if (!confirm('Are you sure you want to delete this item?')) return;

		try {
			const res = await fetch(`${config.api}/user/roadmap/${id}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token}`
				}
			});

			if (res.ok) {
				fetchRoadmap();
			}
		} catch (e) {
			console.error('Failed to delete item');
		}
	}

	function openEditModal(item: RoadmapItem) {
		editingItem = { ...item };
		showEditModal = true;
	}
</script>

<style>
	.roadmap-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 1rem;
		margin-bottom: 0.75rem;
		transition: box-shadow 0.15s ease;
	}
	.roadmap-card:hover {
		box-shadow: 0 4px 8px rgba(0,0,0,0.07);
	}
	.status-badge {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.1rem 0.5rem;
		border-radius: 3px;
		border: 1px solid;
		white-space: nowrap;
	}
	.status-done { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
	.status-wip { background: #fef9c3; color: #854d0e; border-color: #fde68a; }
	.status-planned { background: #e0f2fe; color: #075985; border-color: #bae6fd; }
	.btn-glossy {
		background: linear-gradient(180deg, #b5685f 0%, #A2574F 100%);
		border: 1px solid #8c453e;
		border-radius: 4px;
		box-shadow: inset 0 1px 0 rgba(255,255,255,0.22), 0 1px 2px rgba(0,0,0,0.10);
		color: #ffffff;
		font-weight: 700;
		text-shadow: 0 1px 1px rgba(0,0,0,0.18);
		cursor: pointer;
		transition: all 0.15s ease;
		display: inline-block;
		text-align: center;
		text-decoration: none;
	}
	.btn-glossy:hover {
		background: linear-gradient(180deg, #9e4d44 0%, #8c3f38 100%);
		border-color: #7a3630;
		box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 3px 8px rgba(0,0,0,0.16);
	}
	.btn-secondary {
		background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
		border: 1px solid #9ca3af;
		border-radius: 4px;
		color: #374151;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		text-decoration: none;
		display: inline-block;
	}
	.btn-secondary:hover {
		background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
		border-color: #6b7280;
		color: #1f2937;
	}
	.modal-overlay {
		position: fixed;
		top: 0; left: 0;
		width: 100%; height: 100%;
		background: rgba(0,0,0,0.45);
		display: flex; align-items: center; justify-content: center;
		z-index: 100;
	}
	.modal {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08);
		width: 90%;
		max-width: 480px;
	}
	.modal-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e5e7eb;
		display: flex; align-items: center; justify-content: space-between;
	}
	.modal-body { padding: 1rem; }
	.close-btn {
		background: none; border: none;
		font-size: 1.25rem; color: #6b7280; cursor: pointer;
		line-height: 1; padding: 0 0.25rem;
	}
	.close-btn:hover { color: #1f2937; }
	.form-input {
		width: 100%;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		color: #1f2937;
		background: #fff;
		transition: border-color 0.15s ease;
		box-sizing: border-box;
	}
	.form-input:focus {
		outline: none;
		border-color: #A2574F;
		box-shadow: 0 0 0 2px rgba(162,87,79,0.2);
	}
	.form-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #4b5563;
		margin-bottom: 0.25rem;
		display: block;
	}
	.form-select {
		width: 100%;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		color: #1f2937;
		background: #fff;
	}
</style>

<!-- Roadmap Content -->
<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<div class="flex items-center justify-between mb-5">
			<h1 class="text-xl font-bold text-gray-900">Development Roadmap</h1>
			{#if page.data.user.role === 'admin'}
				<button class="btn-glossy px-4 py-1 text-sm" onclick={() => showCreateModal = true}>Add Item</button>
			{/if}
		</div>

		{#if loading}
			<div class="text-center py-12">
				<p class="text-gray-500">Loading roadmap...</p>
			</div>
		{:else if error}
			<div class="text-center py-12">
				<p class="text-red-500">{error}</p>
			</div>
		{:else}
			{#each ['alpha', 'beta', 'planned'] as phase}
				{@const phaseItems = items.filter(i => i.phase === phase)}
				{#if phaseItems.length > 0}
					<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white mb-5">
						<div class="flex items-center gap-2 mb-3">
							<span class="text-lg font-bold">{getPhaseLabel(phase)}</span>
							<!-- <span class="status-badge {getStatusClass(getPhaseStatus(phase))}">{getStatusLabel(getPhaseStatus(phase))}</span> -->
						</div>
						<div class="space-y-2">
							{#each phaseItems as item}
								<div class="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
									<div class="flex-1">
										<p class="text-sm font-bold text-gray-900">{item.title}</p>
										<p class="text-xs text-gray-600">{item.description}</p>
									</div>
									<div class="flex items-center gap-2">
										<span class="status-badge {getStatusClass(item.status)}">{getStatusLabel(item.status)}</span>
										{#if page.data.user.role === 'admin'}
											<button 
												class="btn-secondary px-2 py-1 text-xs"
												onclick={() => openEditModal(item)}
												title="Edit"
											>
												✏️
											</button>
											<button 
												class="btn-secondary px-2 py-1 text-xs"
												onclick={() => deleteItem(item.id)}
												title="Delete"
											>
												🗑️
											</button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		{/if}
	</div>
</main>

{#if showCreateModal}
<div class="modal-overlay" onclick={() => { if (showCreateModal) showCreateModal = false; }}>
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<h2 class="text-base font-bold text-gray-900">New Roadmap Item</h2>
			<button class="close-btn" onclick={() => showCreateModal = false}>&times;</button>
		</div>
		<div class="modal-body">
			<div class="mb-3">
				<label class="form-label" for="itemTitle">Title</label>
				<input type="text" id="itemTitle" class="form-input" placeholder="Feature title" bind:value={newTitle}>
			</div>
			<div class="mb-3">
				<label class="form-label" for="itemDescription">Description</label>
				<textarea id="itemDescription" rows="3" class="form-input" placeholder="Feature description..." bind:value={newDescription}></textarea>
			</div>
			<div class="mb-3">
				<label class="form-label" for="itemPhase">Phase</label>
				<select id="itemPhase" class="form-select" bind:value={newPhase}>
					<option value="alpha">Alpha</option>
					<option value="beta">Beta</option>
					<option value="planned">Planned</option>
				</select>
			</div>
			<div class="mb-3">
				<label class="form-label" for="itemStatus">Status</label>
				<select id="itemStatus" class="form-select" bind:value={newStatus}>
					<option value="planned">Planned</option>
					<option value="wip">In Progress</option>
					<option value="done">Done</option>
				</select>
			</div>
			<div class="mb-4">
				<label class="form-label" for="itemSort">Sort Order</label>
				<input type="number" id="itemSort" class="form-input" bind:value={newSortOrder}>
			</div>
			<div class="flex justify-end gap-4">
				<button type="button" class="btn-secondary px-4 py-1 text-sm" onclick={() => showCreateModal = false}>Cancel</button>
				<button type="button" class="btn-glossy px-4 py-1 text-sm" onclick={createItem}>Create</button>
			</div>
		</div>
	</div>
</div>
{/if}

{#if showEditModal && editingItem}
<div class="modal-overlay" onclick={() => { if (showEditModal) showEditModal = false; }}>
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<h2 class="text-base font-bold text-gray-900">Edit Roadmap Item</h2>
			<button class="close-btn" onclick={() => showEditModal = false}>&times;</button>
		</div>
		<div class="modal-body">
			<div class="mb-3">
				<label class="form-label" for="editTitle">Title</label>
				<input type="text" id="editTitle" class="form-input" bind:value={editingItem.title}>
			</div>
			<div class="mb-3">
				<label class="form-label" for="editDescription">Description</label>
				<textarea id="editDescription" rows="3" class="form-input" bind:value={editingItem.description}></textarea>
			</div>
			<div class="mb-3">
				<label class="form-label" for="editPhase">Phase</label>
				<select id="editPhase" class="form-select" bind:value={editingItem.phase}>
					<option value="alpha">Alpha</option>
					<option value="beta">Beta</option>
					<option value="planned">Planned</option>
				</select>
			</div>
			<div class="mb-3">
				<label class="form-label" for="editStatus">Status</label>
				<select id="editStatus" class="form-select" bind:value={editingItem.status}>
					<option value="planned">Planned</option>
					<option value="wip">In Progress</option>
					<option value="done">Done</option>
				</select>
			</div>
			<div class="mb-4">
				<label class="form-label" for="editSort">Sort Order</label>
				<input type="number" id="editSort" class="form-input" bind:value={editingItem.sort_order}>
			</div>
			<div class="flex justify-end gap-4">
				<button type="button" class="btn-secondary px-4 py-1 text-sm" onclick={() => showEditModal = false}>Cancel</button>
				<button type="button" class="btn-glossy px-4 py-1 text-sm" onclick={updateItem}>Save</button>
			</div>
		</div>
	</div>
</div>
{/if}
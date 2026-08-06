<script>
	import { config } from '$lib/config';
	import { page } from '$app/state';

	let { data } = $props();

	let collectionsPromise = $state(Promise.resolve(data.collections));
	let forumTags = data.forumTags;

	let showCreateModal = $state(false);
	let createName = $state('');
	let createDescription = $state('');
	let createImage = $state('');
	let createForumTagId = $state(null);
	let createCoinReward = $state(0);
	let createXpReward = $state(0);
	let createError = $state('');

	let editModal = $state(null);
	let editName = $state('');
	let editDescription = $state('');
	let editImage = $state('');
	let editForumTagId = $state(null);
	let editCoinReward = $state(0);
	let editXpReward = $state(0);

	let addItemModal = $state(null);
	let addItemId = $state('');

	async function fetchCollections() {
		const res = await fetch(`${config.api}/admin/collections`, {
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			}
		});
		const json = await res.json();
		return json?.data || [];
	}

	async function createCollection() {
		createError = '';
		try {
			const res = await fetch(`${config.api}/admin/collections`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				},
				body: JSON.stringify({
					name: createName,
					description: createDescription,
					image: createImage || null,
					forum_tag_id: createForumTagId || null,
					coin_reward: createCoinReward || 0,
					xp_reward: createXpReward || 0
				})
			});
			const json = await res.json();
			if (!res.ok) {
				createError = json?.message || 'Failed to create collection.';
				return;
			}
			showCreateModal = false;
			createName = '';
			createDescription = '';
			createImage = '';
			createForumTagId = null;
			createCoinReward = 0;
			createXpReward = 0;
			collectionsPromise = fetchCollections();
		} catch (err) {
			createError = 'Failed to create collection.';
		}
	}

	async function saveEdit() {
		if (!editModal) return;
		try {
			const res = await fetch(`${config.api}/admin/collections/${editModal.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				},
				body: JSON.stringify({
					name: editName,
					description: editDescription,
					image: editImage || null,
					forum_tag_id: editForumTagId || null,
					coin_reward: editCoinReward || 0,
					xp_reward: editXpReward || 0
				})
			});
			if (!res.ok) return;
			editModal = null;
			collectionsPromise = fetchCollections();
		} catch (err) {
			console.error('Failed to update collection.');
		}
	}

	async function deleteCollection(id) {
		if (!confirm('Are you sure you want to delete this collection?')) return;
		try {
			await fetch(`${config.api}/admin/collections/${id}`, {
				method: 'DELETE',
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				}
			});
			collectionsPromise = fetchCollections();
		} catch (err) {
			console.error('Failed to delete collection.');
		}
	}

	async function addItemToCollection(collectionId) {
		if (!addItemId) return;
		try {
			const res = await fetch(`${config.api}/admin/collections/${collectionId}/add-item/${addItemId}`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				}
			});
			if (!res.ok) {
				const json = await res.json();
				alert(json?.message || 'Failed to add item.');
				return;
			}
			addItemId = '';
			addItemModal = null;
			collectionsPromise = fetchCollections();
		} catch (err) {
			console.error('Failed to add item.');
		}
	}

	async function removeItemFromCollection(collectionId, itemId) {
		if (!confirm('Remove this item from the collection?')) return;
		try {
			await fetch(`${config.api}/admin/collections/${collectionId}/remove-item/${itemId}`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				}
			});
			collectionsPromise = fetchCollections();
		} catch (err) {
			console.error('Failed to remove item.');
		}
	}
</script>

<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> вЂє
			<span class="text-gray-700">Collections</span>
		</div>

		<div class="flex items-center justify-between mb-5">
			<h1 class="text-xl font-bold text-gray-900">Manage Collections</h1>
			<button onclick={() => showCreateModal = true} class="btn-glossy px-4 py-1 text-sm">Create Collection</button>
		</div>

		{#await collectionsPromise then collections}
			{#if collections.length === 0}
				<div class="border border-[#EFE6E2] rounded-lg p-8 text-center">
					<p class="text-gray-500">No collections yet. Create one to get started.</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each collections as collection}
						<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
							<div class="flex items-center justify-between mb-2">
								<div class="flex-1">
									<h3 class="text-base font-bold text-gray-900">{collection.name}</h3>
									<p class="text-sm text-gray-500">{collection.description || 'No description'}</p>
									<div class="mt-1 flex flex-wrap gap-4 text-xs text-gray-600">
										<span><strong>Forum Tag:</strong> {collection.forum_tag?.name || 'None'}</span>
										<span><strong>Reward:</strong> {collection.coin_reward} coins / {collection.xp_reward} XP</span>
									</div>
								</div>
								<div class="flex gap-2">
									<button onclick={() => { editModal = collection; editName = collection.name; editDescription = collection.description || ''; editImage = collection.image || ''; editForumTagId = collection.forum_tag_id || null; editCoinReward = collection.coin_reward || 0; editXpReward = collection.xp_reward || 0; }} class="btn-secondary px-3 py-1 text-xs">Edit</button>
									<button onclick={() => { addItemModal = collection.id; }} class="btn-secondary px-3 py-1 text-xs">Add Item</button>
									<button onclick={() => deleteCollection(collection.id)} class="btn-danger px-3 py-1 text-xs">Delete</button>
								</div>
							</div>
							<p class="text-xs text-gray-400">{collection.items_count || 0} items</p>
						</div>
					{/each}
				</div>
			{/if}
		{/await}
	</div>
</main>

<!-- Create Modal -->
{#if showCreateModal}
<div class="modal-overlay" onclick={() => showCreateModal = false}>
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<h2 class="text-base font-bold text-gray-900">Create Collection</h2>
			<button onclick={() => showCreateModal = false} class="close-btn">&times;</button>
		</div>
		<div class="modal-body">
			{#if createError}
				<div class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</div>
			{/if}
			<div class="mb-3">
				<label class="form-label" for="createName">Name</label>
				<input bind:value={createName} type="text" id="createName" class="form-input" placeholder="Collection name">
			</div>
			<div class="mb-3">
				<label class="form-label" for="createDesc">Description</label>
				<textarea bind:value={createDescription} id="createDesc" rows="2" class="form-input" placeholder="Optional description"></textarea>
			</div>
			<div class="mb-3">
				<label class="form-label" for="createImage">Image URL</label>
				<input bind:value={createImage} type="text" id="createImage" class="form-input" placeholder="Optional image URL">
			</div>
			<div class="mb-3">
				<label class="form-label" for="createForumTag">Reward Forum Tag</label>
				<select bind:value={createForumTagId} id="createForumTag" class="form-input">
					<option value={null}>None</option>
					{#each forumTags as tag}
						<option value={tag.id}>{tag.name}</option>
					{/each}
				</select>
			</div>
			<div class="mb-3">
				<label class="form-label" for="createCoinReward">Coin Reward</label>
				<input bind:value={createCoinReward} type="number" id="createCoinReward" class="form-input" placeholder="0" min="0">
			</div>
			<div class="mb-3">
				<label class="form-label" for="createXpReward">XP Reward</label>
				<input bind:value={createXpReward} type="number" id="createXpReward" class="form-input" placeholder="0" min="0">
			</div>
		</div>
		<div class="modal-footer">
			<button onclick={() => showCreateModal = false} class="btn-secondary px-4 py-1 text-sm">Cancel</button>
			<button onclick={createCollection} class="btn-glossy px-4 py-1 text-sm">Create</button>
		</div>
	</div>
</div>
{/if}

<!-- Edit Modal -->
{#if editModal}
<div class="modal-overlay" onclick={() => editModal = null}>
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<h2 class="text-base font-bold text-gray-900">Edit Collection</h2>
			<button onclick={() => editModal = null} class="close-btn">&times;</button>
		</div>
		<div class="modal-body">
			<div class="mb-3">
				<label class="form-label" for="editName">Name</label>
				<input bind:value={editName} type="text" id="editName" class="form-input">
			</div>
			<div class="mb-3">
				<label class="form-label" for="editDesc">Description</label>
				<textarea bind:value={editDescription} id="editDesc" rows="2" class="form-input"></textarea>
			</div>
			<div class="mb-3">
				<label class="form-label" for="editImage">Image URL</label>
				<input bind:value={editImage} type="text" id="editImage" class="form-input" placeholder="Optional image URL">
			</div>
			<div class="mb-3">
				<label class="form-label" for="editForumTag">Reward Forum Tag</label>
				<select bind:value={editForumTagId} id="editForumTag" class="form-input">
					<option value={null}>None</option>
					{#each forumTags as tag}
						<option value={tag.id}>{tag.name}</option>
					{/each}
				</select>
			</div>
			<div class="mb-3">
				<label class="form-label" for="editCoinReward">Coin Reward</label>
				<input bind:value={editCoinReward} type="number" id="editCoinReward" class="form-input" min="0">
			</div>
			<div class="mb-3">
				<label class="form-label" for="editXpReward">XP Reward</label>
				<input bind:value={editXpReward} type="number" id="editXpReward" class="form-input" min="0">
			</div>
		</div>
		<div class="modal-footer">
			<button onclick={() => editModal = null} class="btn-secondary px-4 py-1 text-sm">Cancel</button>
			<button onclick={saveEdit} class="btn-glossy px-4 py-1 text-sm">Save</button>
		</div>
	</div>
</div>
{/if}

<!-- Add Item Modal -->
{#if addItemModal}
<div class="modal-overlay" onclick={() => addItemModal = null}>
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<h2 class="text-base font-bold text-gray-900">Add Item to Collection</h2>
			<button onclick={() => addItemModal = null} class="close-btn">&times;</button>
		</div>
		<div class="modal-body">
			<div class="mb-3">
				<label class="form-label" for="addItemId">Item ID</label>
				<input bind:value={addItemId} type="number" id="addItemId" class="form-input" placeholder="Enter item ID" min="1">
			</div>
		</div>
		<div class="modal-footer">
			<button onclick={() => addItemModal = null} class="btn-secondary px-4 py-1 text-sm">Cancel</button>
			<button onclick={() => addItemToCollection(addItemModal)} class="btn-glossy px-4 py-1 text-sm">Add</button>
		</div>
	</div>
</div>
{/if}

<!-- Remove Item Confirmation is done inline -->

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.modal {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
		width: 90%;
		max-width: 480px;
	}
	.modal-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.modal-body {
		padding: 1rem;
		font-size: 0.9rem;
		color: #374151;
	}
	.modal-footer {
		padding: 0.75rem 1rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}
	.close-btn {
		background: none;
		border: none;
		font-size: 1.25rem;
		color: #6b7280;
		cursor: pointer;
		line-height: 1;
		padding: 0 0.25rem;
	}
	.close-btn:hover {
		color: #1f2937;
	}
</style>

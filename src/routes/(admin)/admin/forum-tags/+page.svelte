<script>
	import { config } from '$lib/config';
	import { page } from '$app/state';

	let { data } = $props();

	let tagsPromise = $state(Promise.resolve(data.tags));

	let showModal = $state(false);
	let editingTag = $state(null);
	let formName = $state('');
	let formStyle = $state('');

	function openModal(tag = null) {
		if (tag) {
			editingTag = tag;
			formName = tag.name;
			formStyle = tag.style || '';
		} else {
			editingTag = null;
			formName = '';
			formStyle = '';
		}
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingTag = null;
	}

	async function fetchTags() {
		const res = await fetch(`${config.api}/admin/forum-tags`, {
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			}
		});
		const json = await res.json();
		return json?.data || [];
	}

	async function saveTag() {
		const url = editingTag
			? `${config.api}/admin/forum-tags/${editingTag.id}`
			: `${config.api}/admin/forum-tags`;

		const body = {
			name: formName,
			style: formStyle || null
		};

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			},
			body: JSON.stringify(body)
		});

		if (response.ok) {
			await loadTags();
			closeModal();
		} else {
			console.error('Failed to save forum tag');
		}
	}

	async function deleteTag(tag) {
		if (!confirm(`Are you sure you want to delete "${tag.name}"?`)) return;

		const response = await fetch(`${config.api}/admin/forum-tags/${tag.id}`, {
			method: 'DELETE',
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			}
		});

		if (response.ok) {
			await loadTags();
		} else {
			console.error('Failed to delete forum tag');
		}
	}

	async function loadTags() {
		tagsPromise = fetchTags();
	}
</script>

<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> вЂє
			<span class="text-gray-700">Forum Tags</span>
		</div>

		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
			<h1 class="text-xl font-bold text-gray-900">Manage Forum Tags</h1>
			<button onclick={() => openModal()} class="text-sm btn-glossy px-4 py-1">Create Tag</button>
		</div>

		{#await tagsPromise then tags}
			<div class="border border-[#EFE6E2] rounded-lg overflow-x-auto">
				<table class="forum-tags-table">
					<thead>
						<tr>
							<th class="w-12">ID</th>
							<th>Name</th>
							<th class="w-32">Style</th>
							<th class="w-24">Inventories</th>
							<th class="w-24">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each tags as tag}
							<tr>
								<td class="text-xs text-gray-500">#{tag.id}</td>
								<td><span class="font-bold text-gray-900">{tag.name}</span></td>
								<td class="text-xs text-gray-600">{tag.style || `<span class="text-gray-400">None</span>`}</td>
								<td class="text-sm text-gray-600">{tag.inventories_count || 0}</td>
								<td class="text-right">
									<div class="flex gap-1 justify-end">
										<button onclick={() => openModal(tag)} class="btn-glossy px-2 py-1 text-xs">Edit</button>
										<button onclick={() => deleteTag(tag)} class="btn-danger px-2 py-1 text-xs">Delete</button>
									</div>
								</td>
							</tr>
						{/each}
						{#if tags.length === 0}
							<tr>
								<td colspan="5" class="text-center text-gray-500 py-4">No forum tags found.</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		{/await}
	</div>
</main>

{#if showModal}
<div class="modal-overlay" onclick={closeModal}>
	<div class="modal-content" onclick={(e) => e.stopPropagation()}>
		<h2 class="text-lg font-bold text-gray-900 mb-4">
			{editingTag ? 'Edit Forum Tag' : 'Create Forum Tag'}
		</h2>

		<div class="space-y-3">
			<div>
				<label class="block text-xs font-bold text-gray-600 mb-1">Name</label>
				<input bind:value={formName} type="text" class="form-input" placeholder="Tag name">
			</div>

			<div>
				<label class="block text-xs font-bold text-gray-600 mb-1">Style</label>
				<input bind:value={formStyle} type="text" class="form-input" placeholder="Optional CSS style">
			</div>
		</div>

		<div class="flex gap-2 justify-end mt-5">
			<button onclick={closeModal} class="btn-secondary px-4 py-1 text-sm">Cancel</button>
			<button onclick={saveTag} class="btn-glossy px-4 py-1 text-sm">Save</button>
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
	.forum-tags-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.forum-tags-table th {
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
	.forum-tags-table td {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.6rem 0.75rem;
		vertical-align: middle;
	}
	.forum-tags-table tr:hover td {
		background-color: #fafafa;
	}
</style>

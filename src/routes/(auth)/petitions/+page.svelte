<script lang="ts">
	import { config } from '$lib/config';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	interface Petition {
		id: number;
		title: string;
		description: string;
		type: 'add' | 'remove' | 'change';
		upvotes: number;
		downvotes: number;
		approved: boolean;
		user_vote: 'upvote' | 'downvote' | null;
		user: {
			id: number;
			username: string;
		};
	}

	interface Pagination {
		current_page: number;
		last_page: number;
		total: number;
		from: number;
		to: number;
		prev_page_url: string | null;
		next_page_url: string | null;
	}

	let petitions: Petition[] = $state([]);
	let pagination: Pagination = $state({
		current_page: 1,
		last_page: 1,
		total: 0,
		from: 0,
		to: 0,
		prev_page_url: null,
		next_page_url: null
	});
	let loading = $state(true);
	let error = $state('');
	let showCreateModal = $state(false);
	let newTitle = $state('');
	let newDescription = $state('');
	let newType = $state<'add' | 'remove' | 'change'>('add');

	async function fetchPetitions(pageNum = 1) {
		loading = true;
		error = '';
		try {
			const res = await fetch(`${config.api}/user/petitions?page=${pageNum}`, {
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token}`
				}
			});
			const json = await res.json();
			
			if (!res.ok) {
				error = 'Failed to load petitions.';
				return;
			}

			petitions = json.data || [];
			pagination = {
				current_page: json.current_page,
				last_page: json.last_page,
				total: json.total,
				from: json.from,
				to: json.to,
				prev_page_url: json.prev_page_url,
				next_page_url: json.next_page_url
			};
		} catch (e) {
			error = 'Failed to load petitions.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchPetitions();
	});

	function goToPage(pageNum: number) {
		fetchPetitions(pageNum);
	}

	function getTypeClass(type: string) {
		return `type-${type}`;
	}

	function getTypeLabel(type: string) {
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	async function vote(petitionId: number, voteType: 'upvote' | 'downvote') {
		const petition = petitions.find(p => p.id === petitionId);
		if (!petition) return;

		try {
			const res = await fetch(`${config.api}/user/petitions/${petitionId}/vote`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token}`
				},
				body: JSON.stringify({ vote: voteType })
			});

			if (res.ok) {
				fetchPetitions();
			}
		} catch (e) {
			console.error('Failed to vote');
		}
	}

	async function approvePetition(petitionId: number) {
		try {
			const res = await fetch(`${config.api}/user/petitions/${petitionId}/approve`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token}`
				}
			});

			if (res.ok) {
				fetchPetitions();
			}
		} catch (e) {
			console.error('Failed to approve');
		}
	}

	async function createPetition() {
		if (!newTitle.trim() || !newDescription.trim()) return;

		try {
			const res = await fetch(`${config.api}/user/petitions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token}`
				},
				body: JSON.stringify({
					title: newTitle,
					description: newDescription,
					type: newType
				})
			});

			if (res.ok) {
				newTitle = '';
				newDescription = '';
				newType = 'add';
				showCreateModal = false;
				fetchPetitions();
			}
		} catch (e) {
			console.error('Failed to create petition');
		}
	}
</script>

<style>
	.petition-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 1rem;
		margin-bottom: 0.75rem;
		transition: box-shadow 0.15s ease;
	}
	.type-badge {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.1rem 0.5rem;
		border-radius: 3px;
		border: 1px solid;
	}
	.type-add { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
	.type-remove { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
	.type-change { background: #e0f2fe; color: #075985; border-color: #bae6fd; }
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
</style>

<!-- Petitions Content -->
<main class="py-6">
	<div class="max-w-container mx-auto px-4">
		<div class="flex items-center justify-between mb-5">
			<h1 class="text-xl font-bold text-gray-900">Community Petitions</h1>
			<button class="btn-glossy px-4 py-1.5 text-sm" onclick={() => showCreateModal = true}>Create Petition</button>
		</div>

		{#if loading}
			<div class="text-center py-12">
				<p class="text-gray-500">Loading petitions...</p>
			</div>
		{:else if error}
			<div class="text-center py-12">
				<p class="text-red-500">{error}</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each petitions as petition}
					<div class="petition-card">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<h3 class="text-sm font-semibold text-gray-900">{petition.title}</h3>
								<p class="text-xs text-gray-600 mt-1">{petition.description}</p>
								<span class="type-badge {getTypeClass(petition.type)} mt-2">{getTypeLabel(petition.type)}</span>
								{#if petition.approved}
									<span class="ml-2 text-xs text-green-600 font-medium">✓ Approved</span>
								{/if}
							</div>
							<div class="flex items-center gap-2 ml-4">
								<button 
									class="btn-secondary px-2 py-1 text-xs {petition.user_vote === 'upvote' ? 'bg-green-100' : ''}"
									onclick={() => vote(petition.id, 'upvote')}
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-3 mb-1 inline"><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/><path d="M7 10v12"/></svg> {petition.upvotes}
								</button>
								<button 
									class="btn-secondary px-2 py-1 text-xs {petition.user_vote === 'downvote' ? 'bg-red-100' : ''}"
									onclick={() => vote(petition.id, 'downvote')}
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-3 mb-1 inline"><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/><path d="M17 14V2"/></svg> {petition.downvotes}
								</button>
								{#if page.data.user.role === 'admin' && !petition.approved}
									<button 
										class="btn-glossy px-2 py-1 text-xs ml-2"
										onclick={() => approvePetition(petition.id)}
									>
										Approve
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Pagination -->
			{#if pagination.total > 0}
			<div class="flex items-center justify-between mt-5 pt-3 border-t border-gray-200">
				<span class="text-sm text-gray-600">Showing {pagination.from}–{pagination.to} of {pagination.total} petitions</span>
				<div class="flex gap-1">
					<button 
						class="btn-secondary px-3 py-1 text-sm" 
						disabled={!pagination.prev_page_url}
						onclick={() => goToPage(pagination.current_page - 1)}
					>← Previous</button>
					<button 
						class="btn-secondary px-3 py-1 text-sm" 
						disabled={!pagination.next_page_url}
						onclick={() => goToPage(pagination.current_page + 1)}
					>Next →</button>
				</div>
			</div>
			{/if}
		{/if}
	</div>
</main>

{#if showCreateModal}
<div class="modal-overlay" onclick={() => { if (showCreateModal) showCreateModal = false; }}>
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<h2 class="text-base font-semibold text-gray-900">New Petition</h2>
			<button class="close-btn" onclick={() => showCreateModal = false}>&times;</button>
		</div>
		<div class="modal-body">
			<div class="mb-3">
				<label class="form-label" for="petitionTitle">Title</label>
				<input type="text" id="petitionTitle" class="form-input" placeholder="Short, descriptive title" bind:value={newTitle}>
			</div>
			<div class="mb-3">
				<label class="form-label" for="petitionDescription">Description</label>
				<textarea id="petitionDescription" rows="3" class="form-input" placeholder="Explain your petition..." bind:value={newDescription}></textarea>
			</div>
			<div class="mb-4">
				<label class="form-label" for="petitionType">Type</label>
				<select id="petitionType" class="form-input" bind:value={newType}>
					<option value="add">Add Feature</option>
					<option value="remove">Remove Feature</option>
					<option value="change">Change Feature</option>
				</select>
			</div>
			<div class="flex justify-end gap-3">
				<button type="button" class="btn-secondary px-4 py-1.5 text-sm" onclick={() => showCreateModal = false}>Cancel</button>
				<button type="button" class="btn-glossy px-4 py-1.5 text-sm" onclick={createPetition}>Submit</button>
			</div>
		</div>
	</div>
</div>
{/if}
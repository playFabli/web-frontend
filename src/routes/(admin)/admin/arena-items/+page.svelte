<script lang="ts">
	import { config } from '$lib/config';
	import { page } from '$app/state';
	import { Swords, Shield, Plus, Search, X } from 'lucide-svelte';

	let { data } = $props();

	interface ArenaMove {
		id?: number;
		position: number;
		name: string;
		damage: number;
		cooldown?: number;
		border_color: string;
	}

	interface ArenaItem {
		id: number;
		item_id: number;
		attack: number;
		defense: number;
		item?: { id: number; title: string } | null;
		moves?: ArenaMove[];
	}

	let items = $state<ArenaItem[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Search / pagination
	let query = $state('');
	let pageNum = $state(1);
	let lastPage = $state(1);
	let total = $state(0);

	// Modal state
	let showModal = $state(false);
	let editingItem = $state<ArenaItem | null>(null);
	let formError = $state<string | null>(null);
	let saving = $state(false);

	// Create-form state
	let formItemId = $state<number | null>(null);
	let formAttack = $state(0);
	let formDefense = $state(0);

	// Move editor state (2 slots)
	let moveEnabled = $state([false, false]);
	let moveName = $state(['', '']);
	let moveDamage = $state([0, 0]);
	let moveCooldown = $state([0, 4]);
	let moveColor = $state(['#A2574F', '#1A4D4F']);

	// Marketplace item picker (for creating new arena items)
	let showPicker = $state(false);
	let pickerQuery = $state('');
	let pickerResults = $state<{ id: number; title: string }[]>([]);
	let picking = $state(false);

	async function fetchItems() {
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams();
			if (query.trim()) params.set('query', query.trim());
			params.set('page', String(pageNum));
			const res = await fetch(`${config.api}/admin/arena-items?${params}`, {
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});
			if (!res.ok) throw new Error('Failed to load arena items');
			const json = await res.json();
			items = json.data || [];
			lastPage = json.last_page || 1;
			total = json.total || 0;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load arena items';
		} finally {
			loading = false;
		}
	}

	// ---- Marketplace item picker ----
	async function searchPicker() {
		if (!pickerQuery.trim()) return;
		picking = true;
		try {
			const res = await fetch(`${config.api}/admin/assets?query=${encodeURIComponent(pickerQuery.trim())}`, {
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});
			if (!res.ok) throw new Error('Search failed');
			const json = await res.json();
			pickerResults = (json.data || []).map((i: { id: number; title: string }) => ({
				id: i.id,
				title: i.title
			}));
		} catch {
			pickerResults = [];
		} finally {
			picking = false;
		}
	}

	function pickItem(item: { id: number; title: string }) {
		formItemId = item.id;
		showPicker = false;
		pickerQuery = '';
		pickerResults = [];
	}

	// ---- Modal open/close ----
	function openCreate() {
		editingItem = null;
		formItemId = null;
		formAttack = 0;
		formDefense = 0;
		resetMoves();
		formError = null;
		showModal = true;
	}

	function openEdit(item: ArenaItem) {
		editingItem = item;
		formItemId = item.item_id;
		formAttack = item.attack;
		formDefense = item.defense;
		resetMoves();

		const moves = item.moves ?? [];
		for (const move of moves) {
			const idx = (move.position ?? 1) - 1;
			if (idx < 0 || idx > 1) continue;
			moveEnabled[idx] = true;
			moveName[idx] = move.name;
			moveDamage[idx] = move.damage;
			moveCooldown[idx] = move.cooldown ?? 0;
			moveColor[idx] = move.border_color;
		}
		formError = null;
		showModal = true;
	}

	function resetMoves() {
		moveEnabled = [false, false];
		moveName = ['', ''];
		moveDamage = [0, 0];
		moveCooldown = [0, 4];
		moveColor = ['#A2574F', '#1A4D4F'];
	}

	function closeModal() {
		if (saving) return;
		showModal = false;
		editingItem = null;
		showPicker = false;
		formError = null;
	}

	// ---- Save item (create or update ATK/DEF) ----
	async function saveItem() {
		saving = true;
		formError = null;
		try {
			const body: Record<string, unknown> = {
				attack: formAttack,
				defense: formDefense
			};

			let savedId: number;
			if (editingItem) {
				const res = await fetch(`${config.api}/admin/arena-items/${editingItem.id}`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						Authorization: `Bearer ${data.token}`
					},
					body: JSON.stringify(body)
				});
				const json = await res.json().catch(() => null);
				if (!res.ok) {
					formError = json?.message || 'Could not update the item';
					return;
				}
				savedId = editingItem.id;
			} else {
				if (!formItemId) {
					formError = 'Pick a marketplace item first';
					return;
				}
				const res = await fetch(`${config.api}/admin/arena-items`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						Authorization: `Bearer ${data.token}`
					},
					body: JSON.stringify({ ...body, item_id: formItemId })
				});
				const json = await res.json().catch(() => null);
				if (!res.ok) {
					formError = json?.message || 'Could not create the item';
					return;
				}
				savedId = json.data?.id;
			}

			// Persist the configured moves (only the enabled slots).
			const moves = moveEnabled
				.map((enabled, i) =>
					enabled && moveName[i].trim()
						? {
								position: i + 1,
								name: moveName[i].trim(),
								damage: Math.max(1, moveDamage[i] || 1),
								cooldown: Math.max(0, moveCooldown[i] || 0),
								border_color: moveColor[i]
							}
						: null
				)
				.filter((m): m is NonNullable<typeof m> => m !== null);

			const movesRes = await fetch(`${config.api}/admin/arena-items/${savedId}/moves`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({ moves })
			});
			if (!movesRes.ok) {
				// The item itself is saved; keep the modal open in edit mode so a
				// retry updates rather than tries to re-create the item.
				if (!editingItem && savedId) {
					editingItem = {
						id: savedId,
						item_id: formItemId ?? 0,
						attack: formAttack,
						defense: formDefense
					};
				}
				formError = 'Item saved, but its moves could not be saved — try again';
				return;
			}

			closeModal();
			await fetchItems();
		} catch {
			formError = 'Could not reach the server';
		} finally {
			saving = false;
		}
	}

	// ---- Delete ----
	async function deleteItem(item: ArenaItem) {
		if (!confirm(`Remove "${item.item?.title ?? `#${item.id}`}" from arena compatibility?`)) return;
		const res = await fetch(`${config.api}/admin/arena-items/${item.id}`, {
			method: 'DELETE',
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${data.token}`
			}
		});
		if (res.ok) await fetchItems();
	}

	// ---- Search submit ----
	function submitSearch(e: Event) {
		e.preventDefault();
		pageNum = 1;
		fetchItems();
	}

	fetchItems();
</script>

<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> ›
			<span class="text-gray-700">Arena Items</span>
		</div>

		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
			<div>
				<h1 class="text-xl font-bold text-gray-900">Manage Arena Items</h1>
				<p class="text-sm text-gray-500 mt-0.5">ATK/DEF stats and the two moves each weapon offers in the arena.</p>
			</div>
			<button onclick={openCreate} class="text-sm btn-glossy px-4 py-1">
				<Plus class="size-4 inline -mt-0.5" strokeWidth="3" /> Add Item
			</button>
		</div>

		<form onsubmit={submitSearch} class="mb-4 flex gap-2">
			<div class="relative flex-1">
				<Search class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
				<input
					bind:value={query}
					type="text"
					class="form-input pl-9"
					placeholder="Search arena items by item title…"
				/>
			</div>
			<button type="submit" class="btn-secondary px-4 py-1 text-sm">Search</button>
		</form>

		{#if loading}
			<div class="border border-[#EFE6E2] rounded-lg p-10 flex flex-col items-center gap-3">
				<div class="size-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
				<p class="text-sm text-gray-500 font-bold">Loading arena items…</p>
			</div>
		{:else if error}
			<div class="border border-[#EFE6E2] rounded-lg p-10 text-center">
				<p class="font-bold text-red-600 mb-3">{error}</p>
				<button onclick={fetchItems} class="btn-secondary px-4 py-1 text-sm">Retry</button>
			</div>
		{:else}
			<div class="border border-[#EFE6E2] rounded-lg overflow-x-auto">
				<table class="arena-items-table">
					<thead>
						<tr>
							<th class="w-14">ID</th>
							<th>Item</th>
							<th class="w-20">ATK</th>
							<th class="w-20">DEF</th>
							<th>Moves</th>
							<th class="w-28">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each items as item}
							<tr>
								<td class="text-xs text-gray-500">#{item.id}</td>
								<td class="font-bold text-gray-900">{item.item?.title ?? `Item #${item.item_id}`}</td>
								<td class="text-sm text-gray-600"><Swords class="size-3.5 inline -mt-0.5 text-gray-400" strokeWidth="3" /> {item.attack}</td>
								<td class="text-sm text-gray-600"><Shield class="size-3.5 inline -mt-0.5 text-gray-400" strokeWidth="3" /> {item.defense}</td>
								<td>
									{#if (item.moves ?? []).length === 0}
										<span class="text-xs text-gray-400 italic">No moves configured</span>
									{:else}
										<div class="flex flex-wrap gap-1.5">
											{#each item.moves ?? [] as move (move.position)}
												<span
													class="move-chip"
													style="--mc: {move.border_color}"
													title="Position {move.position}"
												>
													{move.name}
													<em>{move.damage} DMG{move.position === 2 && (move.cooldown ?? 0) > 0 ? ` · CD ${move.cooldown}` : ''}</em>
												</span>
											{/each}
										</div>
									{/if}
								</td>
								<td class="text-right">
									<div class="flex gap-1 justify-end">
										<button onclick={() => openEdit(item)} class="btn-glossy px-2 py-1 text-xs">Edit</button>
										<button onclick={() => deleteItem(item)} class="btn-danger px-2 py-1 text-xs">Delete</button>
									</div>
								</td>
							</tr>
						{/each}
						{#if items.length === 0}
							<tr>
								<td colspan="6" class="text-center text-gray-500 py-4">No arena items found.</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>

			{#if lastPage > 1}
				<div class="flex items-center justify-between mt-4 text-sm">
					<span class="text-xs text-gray-500 font-bold">{total} item{total === 1 ? '' : 's'}</span>
					<div class="flex gap-1">
						<button
							class="btn-secondary px-3 py-1 text-xs"
							disabled={pageNum <= 1}
							onclick={() => { pageNum -= 1; fetchItems(); }}
						>Prev</button>
						<span class="px-3 py-1 text-xs font-bold text-gray-600">{pageNum} / {lastPage}</span>
						<button
							class="btn-secondary px-3 py-1 text-xs"
							disabled={pageNum >= lastPage}
							onclick={() => { pageNum += 1; fetchItems(); }}
						>Next</button>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</main>

{#if showModal}
<div class="modal-overlay" onclick={closeModal}>
	<div class="modal-content" onclick={(e) => e.stopPropagation()}>
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-bold text-gray-900">{editingItem ? 'Edit Arena Item' : 'Add Arena Item'}</h2>
			<button onclick={closeModal} class="text-gray-400 hover:text-gray-700"><X class="size-5" /></button>
		</div>

		<div class="space-y-4">
			<!-- Marketplace item picker (create only) -->
			{#if !editingItem}
				<div>
					<label class="block text-xs font-bold text-gray-600 mb-1">Marketplace Item</label>
					{#if formItemId === null}
						<button onclick={() => { showPicker = true; }} class="btn-secondary w-full px-4 py-2 text-sm border-dashed">
							<Search class="size-4 inline -mt-0.5 mr-1" /> Search for an item…
						</button>
					{:else}
						<div class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2">
							<span class="text-sm font-bold text-gray-900">Item #{formItemId}</span>
							<button onclick={() => { formItemId = null; }} class="text-xs text-gray-400 hover:text-red-600 font-bold">Change</button>
						</div>
					{/if}
				</div>
			{:else}
				<div>
					<label class="block text-xs font-bold text-gray-600 mb-1">Marketplace Item</label>
					<div class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm font-bold text-gray-900">
						#{editingItem.item_id} — {editingItem.item?.title}
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-xs font-bold text-gray-600 mb-1">Attack</label>
					<input bind:value={formAttack} type="number" min="0" max="10000" class="form-input">
				</div>
				<div>
					<label class="block text-xs font-bold text-gray-600 mb-1">Defense</label>
					<input bind:value={formDefense} type="number" min="0" max="10000" class="form-input">
				</div>
			</div>

			<!-- Move editor -->
			<div>
				<div class="flex items-center justify-between mb-1.5">
					<label class="text-xs font-bold text-gray-600">Weapon Moves</label>
					<span class="text-[11px] text-gray-400 font-bold">Slot 1 = Attack · Slot 2 = Ability (cooldown in rounds)</span>
				</div>
				<div class="space-y-2.5">
					{#each [0, 1] as slot (slot)}
						<div class="move-editor-row" class:move-disabled={!moveEnabled[slot]}>
							<div class="flex items-center gap-2">
								<input
									type="checkbox"
									bind:checked={moveEnabled[slot]}
									class="size-4 accent-[#A2574F]"
									title="Enable this move slot"
								>
								<span class="text-xs font-bold text-gray-500 w-5">#{slot + 1}</span>
								<span class="text-[10px] font-bold uppercase tracking-wide text-gray-400 w-12 shrink-0">{slot === 0 ? 'Attack' : 'Ability'}</span>
							</div>
							<input
								bind:value={moveName[slot]}
								type="text"
								class="form-input flex-1"
								placeholder="Move name (e.g. Fire Slash)"
								disabled={!moveEnabled[slot]}
							>
							<input
								bind:value={moveDamage[slot]}
								type="number"
								min="1"
								max="10000"
								class="form-input w-20"
								placeholder="DMG"
								disabled={!moveEnabled[slot]}
							>
							<input
								bind:value={moveCooldown[slot]}
								type="number"
								min="0"
								max="30"
								class="form-input w-20"
								placeholder="CD"
								title="Cooldown in rounds (ability only)"
								disabled={!moveEnabled[slot]}
							>
							<div class="flex items-center gap-2">
								<input
									bind:value={moveColor[slot]}
									type="color"
									class="size-8 cursor-pointer rounded border border-gray-300 bg-transparent p-0.5"
									title="Move border color"
									disabled={!moveEnabled[slot]}
								>
								<input
									bind:value={moveColor[slot]}
									type="text"
									class="form-input w-24 font-mono text-xs"
									pattern="^#[0-9a-fA-F]{6}$"
									disabled={!moveEnabled[slot]}
								>
							</div>
						</div>
					{/each}
				</div>
			</div>

			{#if formError}
				<p class="text-sm text-red-600 font-semibold">{formError}</p>
			{/if}
		</div>

		<div class="flex gap-2 justify-end mt-5">
			<button onclick={closeModal} class="btn-secondary px-4 py-1 text-sm" disabled={saving}>Cancel</button>
			<button onclick={saveItem} class="btn-glossy px-4 py-1 text-sm" disabled={saving}>
				{saving ? 'Saving…' : 'Save'}
			</button>
		</div>
	</div>
</div>
{/if}

{#if showPicker}
<div class="modal-overlay" onclick={() => { showPicker = false; pickerResults = []; }}>
	<div class="modal-content" onclick={(e) => e.stopPropagation()}>
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-bold text-gray-900">Pick a Marketplace Item</h2>
			<button onclick={() => { showPicker = false; pickerResults = []; }} class="text-gray-400 hover:text-gray-700"><X class="size-5" /></button>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); searchPicker(); }} class="flex gap-2 mb-3">
			<input
				bind:value={pickerQuery}
				type="text"
				class="form-input flex-1"
				placeholder="Item title…"
			>
			<button type="submit" class="btn-glossy px-4 py-1 text-sm" disabled={picking}>
				{picking ? '…' : 'Search'}
			</button>
		</form>

		<div class="max-h-72 overflow-y-auto border border-gray-100 rounded-lg">
			{#if pickerResults.length === 0}
				<p class="text-sm text-gray-400 text-center py-6 font-bold">
					{pickerQuery ? 'No items match that title.' : 'Type a title above to search.'}
				</p>
			{:else}
				{#each pickerResults as result}
					<button
						class="picker-row w-full text-left"
						onclick={() => pickItem(result)}
					>
						<span class="text-xs text-gray-400 font-bold w-14 shrink-0">#{result.id}</span>
						<span class="text-sm font-bold text-gray-900 truncate">{result.title}</span>
					</button>
				{/each}
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
	.arena-items-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.arena-items-table th {
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
	.arena-items-table td {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.6rem 0.75rem;
		vertical-align: middle;
	}
	.arena-items-table tr:hover td {
		background-color: #fafafa;
	}

	.move-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.72rem;
		font-weight: 800;
		color: #1f2937;
		background: #ffffff;
		border: 2px solid var(--mc, #A2574F);
		border-radius: 8px;
		padding: 0.2rem 0.55rem;
		white-space: nowrap;
	}
	.move-chip em {
		font-style: normal;
		font-size: 0.62rem;
		font-weight: 800;
		color: #6b7280;
		background: #f3f4f6;
		border-radius: 999px;
		padding: 0.05rem 0.45rem;
	}

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
		padding: 1rem;
	}
	.modal-content {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		width: 100%;
		max-width: 560px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
	}

	.move-editor-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 0.6rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: #ffffff;
		transition: opacity 0.15s ease, background 0.15s ease;
	}
	.move-editor-row.move-disabled {
		opacity: 0.55;
		background: #fafafa;
	}
	.move-editor-row input:disabled {
		cursor: not-allowed;
	}

	.picker-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
		border-bottom: 1px solid #f3f4f6;
		cursor: pointer;
		transition: background 0.12s ease;
	}
	.picker-row:hover {
		background: #faf7f6;
	}
	.picker-row:last-child {
		border-bottom: none;
	}
</style>

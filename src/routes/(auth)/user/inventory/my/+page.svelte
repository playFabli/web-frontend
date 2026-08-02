<script>
	import { config } from '$lib/config';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ItemCard from '$lib/components/marketplace/ItemCard.svelte';

	let { data } = $props();
	
	// State
	let inventory = $state(data.inventory || []);
	let pagination = $state(data.pagination || {
		current_page: 1,
		last_page: 1,
		total: 0,
		per_page: 20
	});
	let categories = $state(data.categories || []);
	let activeFilter = $state('all');
	let isOpeningCase = $state(false);
	let caseContents = $state([]);
	let shuffleInterval = $state(null);
	let shuffleCount = $state(0);
	let finalItem = $state(null);
	let caseName = $state('');
	let showModal = $state(false);
	let isLoading = $state(false);

	const formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	// Fetch inventory with filter and pagination
	async function fetchInventory(filter = 'all', page = 1) {
		isLoading = true;
		try {
			const category = filter === 'all' ? 'all' : categories.find(c => c.title.toLowerCase() === filter)?.title || 'all';
			const res = await fetch(`${config.api}/user/inventory/me?category=${encodeURIComponent(category)}&page=${page}&limit=2&show_duplicates=1`, {
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			const json = await res.json();
			if (res.ok) {
				inventory = json.data || [];
				pagination = {
					current_page: json.current_page || 1,
					last_page: json.last_page || 1,
					total: json.total || 0,
					per_page: json.per_page || 20
				};
			}
		} catch (e) {
			console.error('Failed to load inventory', e);
		}
		isLoading = false;
	}

	// Handle filter change
	function setFilter(filter) {
		activeFilter = filter;
		fetchInventory(filter, 1);
	}

	// Initialize with 'all' filter on mount
	onMount(() => {
		fetchInventory('all', 1);
	});

	// Handle page change
	function changePage(page) {
		fetchInventory(activeFilter, page);
	}

	// Reactive rarity class
	let rarityClass = $derived(finalItem?.rarity ? (
		{
			'none': 'text-gray-500',
			'uncommon': 'text-green-500',
			'rare': 'text-blue-500',
			'ultra_rare': 'text-purple-500',
			'legendary': 'text-yellow-500'
		}[finalItem.rarity.toLowerCase()] || 'text-gray-500'
	) : 'text-gray-500');

	// Get case contents for animation
	async function getCaseContents(caseId) {
		try {
			const res = await fetch(`${config.api}/marketplace/case-contents/${caseId}`, {
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			const json = await res.json();
			if (res.ok) {
				return json.data || [];
			}
		} catch (e) {
			console.error('Failed to get case contents', e);
		}
		return [];
	}

	// Open case with animation
	async function openCase(inventoryId, caseId) {
		isOpeningCase = true;
		caseContents = await getCaseContents(caseId);
		
		if (caseContents.length === 0) {
			isOpeningCase = false;
			return;
		}

		// Find the case name
		const caseItem = inventory.find(i => i.id === inventoryId);
		caseName = caseItem?.item?.title || 'Case';

		// Start shuffling animation
		shuffleCount = 0;
		const shuffleDuration = 3000 + Math.random() * 2000; // 3-5 seconds
		const intervalTime = 100; // Change item every 100ms
		
		showModal = true;
		
		shuffleInterval = setInterval(() => {
			shuffleCount++;
			// Pick a random item to display during shuffle
			finalItem = caseContents[Math.floor(Math.random() * caseContents.length)];
		}, intervalTime);

		// After shuffle duration, open the case
		setTimeout(async () => {
			if (shuffleInterval) {
				clearInterval(shuffleInterval);
			}
			
			try {
				const res = await fetch(`${config.api}/user/inventory/open-case/${inventoryId}`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${data.token}`,
						'Content-Type': 'application/json',
						'Accept': 'application/json'
					}
				});
				
				if (res.ok) {
					const result = await res.json();
					finalItem = result.data.item;
					// Remove the opened case from inventory
					inventory = inventory.filter(i => i.id !== inventoryId);
					// Add the won item
					inventory = [...inventory, result.data];
				} else {
					const error = await res.json();
					alert(error.message || 'Failed to open case');
					showModal = false;
				}
			} catch (e) {
				console.error('Failed to open case', e);
				alert('Failed to open case');
				showModal = false;
			}
			
			isOpeningCase = false;
		}, shuffleDuration);
	}

	function closeModal() {
		if (isOpeningCase) return; // Don't close while opening
		showModal = false;
		finalItem = null;
	}
</script>

<style>
	.filter-tab {
		background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
		border: 1px solid #9ca3af;
		border-radius: 4px;
		color: #374151;
		font-weight: 500;
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.15s ease;
	}
	.filter-tab:hover {
		background: #f3f4f6;
		border-color: #6b7280;
		color: #1f2937;
	}
	.filter-tab.active {
		background: #f3f4f6;
		border-color: #6b7280;
		color: #1f2937;
		font-weight: 600;
	}
	.inventory-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 0.75rem;
		text-align: center;
		transition: box-shadow 0.15s ease;
		position: relative;
	}
	.inventory-card:hover {
		box-shadow: 0 4px 8px rgba(0,0,0,0.07);
	}
	.inventory-card img {
		width: 100%;
		height: auto;
		background: #f9fafb;
		display: block;
		border-radius: 2px;
		margin-bottom: 0.5rem;
	}
	.type-tag {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		color: #4b5563;
		margin-bottom: 0.3rem;
	}

	/* Modal styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0,0,0,0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.modal {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08);
		width: 90%;
		max-width: 400px;
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
		text-align: center;
	}
	.modal-footer {
		padding: 0.75rem 1rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: center;
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
	.pagination-btn {
		background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
		border: 1px solid #9ca3af;
		border-radius: 4px;
		color: #374151;
		font-weight: 500;
		cursor: pointer;
		padding: 0.25rem 0.75rem;
		font-size: 0.8rem;
		transition: all 0.15s ease;
	}
	.pagination-btn:hover:not(:disabled) {
		background: #f3f4f6;
		border-color: #6b7280;
	}
	.pagination-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.pagination-btn.active {
		background: #f3f4f6;
		border-color: #6b7280;
		color: #1f2937;
		font-weight: 600;
	}
</style>

<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<h1 class="text-xl font-bold text-gray-900 mb-5">Your Inventory</h1>

	<!-- Filter Tabs -->
	<div class="flex flex-wrap gap-2 mb-5">
		<button 
			class="filter-tab !px-4 !py-1" 
			class:active={activeFilter === 'all'}
			onclick={() => setFilter('all')}
		>All</button>
		{#each categories as category}
			<button 
				class="filter-tab !px-4 !py-1" 
				class:active={activeFilter === category.title.toLowerCase()}
				onclick={() => setFilter(category.title.toLowerCase())}
			>{category.title}</button>
		{/each}
	</div>

		<!-- Items Grid -->
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4.5">
			{#if isLoading}
				<p class="text-neutral-500 text-sm col-span-full">Loading...</p>
			{:else if inventory.length === 0}
				<p class="text-neutral-500 text-sm col-span-full">No items found...</p>
			{:else}
				{#each inventory as invObj}
					<ItemCard 
						item={invObj.item} 
						serial={invObj.serial ?? 1} 
						{formatter}
						hidePrice={true}
						onclick={() => goto(`/marketplace/item/${invObj.item.id}`)}
					/>
				{/each}
			{/if}
		</div>

		<!-- Pagination -->
		{#if pagination.last_page > 1}
			<div class="flex justify-center items-center gap-2 mt-6">
				<button 
					class="pagination-btn"
					disabled={pagination.current_page === 1}
					onclick={() => changePage(pagination.current_page - 1)}
				>
					Previous
				</button>
				<span class="text-sm text-gray-600">
					Page {pagination.current_page} of {pagination.last_page}
				</span>
				<button 
					class="pagination-btn"
					disabled={pagination.current_page === pagination.last_page}
					onclick={() => changePage(pagination.current_page + 1)}
				>
					Next
				</button>
			</div>
		{/if}
	</div>
</main>

<!-- Case Opening Modal -->
{#if showModal}
	<div class="modal-overlay">
		<div class="modal">
			<div class="modal-header">
				<h2 class="text-base font-semibold text-gray-900">Case Opening</h2>
				<button class="close-btn" onclick={closeModal} disabled={isOpeningCase}>&times;</button>
			</div>
			<div class="modal-body">
				<p class="text-sm text-gray-600 mb-3">You opened a <span class="font-medium">{caseName}</span>!</p>
				<div class="mb-2">
					<img 
						src="https://placehold.co/80x80/D9C5B2/1A4D4F" 
						alt={finalItem?.title} 
						class="w-20 h-20 mx-auto rounded-lg border border-[#EFE6E2] mb-2"
					>
					<p class="text-lg font-bold {rarityClass}">{finalItem?.title || '?'}</p>
					<p class="text-xs text-gray-500">{finalItem?.rarity}</p>
					{#if isOpeningCase}
						<p class="text-xs text-primary mt-2">Shuffling...</p>
					{/if}
				</div>
			</div>
			<div class="modal-footer">
				<button 
					class="btn-glossy px-6 py-2 text-sm"
					onclick={closeModal}
					disabled={isOpeningCase}
				>
					{isOpeningCase ? 'Opening...' : 'Cool!'}
				</button>
			</div>
		</div>
	</div>
{/if}
<script>
	import { goto } from '$app/navigation';
	import ItemCard from '$lib/components/marketplace/ItemCard.svelte';
	import { config } from '$lib/config.js';
	import { Plus } from 'lucide-svelte';

	let { data } = $props();
	
	let priceMin = $state(0);
	let priceMax = $state(null);

	let rapMin = $state(0);
	let rapMax = $state(null);

	const formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});


	let query = $state("");
	let categoriesSelected = $state([1,2,3,4,7,8,9]);
	let selectedCollection = $state('');
	let itemsPromise = $state(fetchItems());
	function selectCategory(id) {
		if (categoriesSelected.includes(id)) {
			categoriesSelected = categoriesSelected.filter((catId) => catId !== id);
		} else {
			categoriesSelected = [...categoriesSelected, id];
		}

		itemsPromise = fetchItems();
	}

	function selectCollection(id) {
		selectedCollection = id;
		itemsPromise = fetchItems();
	}

	async function fetchItems(page=1) {
		const collectionParam = selectedCollection ? `&collection_id=${selectedCollection}` : '';
		const response = await fetch(`${config.api}/marketplace/items/${categoriesSelected.join(',')}?page=${page}&price_min=${priceMin}&price_max=${priceMax}&rap_min=${rapMin}&rap_max=${rapMax}&query=${query}${collectionParam}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			},
		});

		const json = await response.json();
		if (!response.ok) {
			console.error(json?.message || 'Failed to fetch items.');
			return [];
		}

		return json || [];
	}
</script>
<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		{#if data.marketplaceBannerImage}
			<div class="mb-5 rounded-lg overflow-hidden">
				<img src={config.storage + '/' + data.marketplaceBannerImage} alt="Marketplace Banner" class="w-full h-auto object-cover" />
			</div>
		{/if}

		<div class="mb-3">
			<div class="grid grid-cols-2 gap-4">
				<div class="col-span-1 content-center">
					<h1 class="text-xl font-bold text-gray-900">Marketplace</h1>
				</div>
				<div class="col-span-1 text-right">
					<a href="/marketplace/item/create" class="text-sm btn-glossy px-4 !py-1 mb-3"><Plus strokeWidth="3" class="inline mb-0.5 size-3.5"/> Create</a>
				</div>
			</div>
		</div>

		<div class="flex flex-col md:flex-row gap-4">
			
			<aside class="w-full md:w-48 flex-shrink-0">
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-gray-50/30">
					<h3 class="text-sm font-bold text-gray-900 mb-3">Filters</h3>
					
					<div class="filter-section">
						<h4 class="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Type</h4>
						<div class="space-y-1.5">
							{#each data.categories as category}
							<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none group">
							<div class="relative flex items-center justify-center">
								<input 
								checked={categoriesSelected.includes(category.id)} 
								type="checkbox" 
								class="peer appearance-none w-4 h-4 rounded-sm cursor-pointer border border-gray-300 bg-white checked:bg-primary checked:border-primary transition-all duration-150" 
								onchange={() => selectCategory(category.id)}
								/>
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="absolute w-3 h-3 text-white pointer-events-none opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-150 ease-out"><path d="M20 6 9 17l-5-5"/></svg>
							</div>
							
							<span class="group-hover:text-gray-900 font-bold transition-colors duration-150">
								{category.title}
							</span>
							</label>

							{/each}
						</div>
					</div>

					<div class="filter-section">
						<h4 class="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Price</h4>
						<div class="flex items-center gap-2">
							<input oninput={()=> itemsPromise = fetchItems()} type="number" placeholder="Min" class="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm" bind:value={priceMin}>
							<span class="text-gray-400 text-sm">–</span>
							<input oninput={()=> itemsPromise = fetchItems()} type="number" placeholder="Max" class="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm" bind:value={priceMax}>
						</div>	
					</div>

					<div class="filter-section">
						<h4 class="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">VAL</h4>
						<div class="flex items-center gap-2">
							<input oninput={()=> itemsPromise = fetchItems()} type="number" placeholder="Min" class="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm" bind:value={rapMin}>
							<span class="text-gray-400 text-sm">–</span>
							<input oninput={()=> itemsPromise = fetchItems()} type="number" placeholder="Max" class="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm" bind:value={rapMax}>
						</div>
					</div>

				<div class="filter-section">
					<h4 class="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Search</h4>
					<input oninput={()=> itemsPromise = fetchItems()} type="text" placeholder="Search..." bind:value={query} class="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm">
				</div>

				{#if data.collections && data.collections.length > 0}
				<div class="filter-section">
					<h4 class="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Collection</h4>
					<select 
						onchange={(e) => selectCollection(e.target.value)} 
						value={selectedCollection}
						class="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
					>
						<option value="">All Collections</option>
						{#each data.collections as collection}
							<option value={collection.id}>{collection.name}</option>
						{/each}
					</select>
				</div>
				{/if}

				</div>
			</aside>

			<div class="flex-1">				
				<div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
					{#await itemsPromise}
						<div class="col-span-4">
							<p class="text-center text-neutral-400">Loading...</p>
						</div>
					{:then items}
						{#each items.data as item}
							<ItemCard item={item} formatter={formatter} />
						{/each}
						{#if items.total == 0}
							<div class="col-span-4">
								<p class="text-center text-neutral-400">No items found.</p>
							</div>
						{/if}
					{/await}

				</div>

				<div class="flex items-center justify-between mt-5 pt-3 border-t border-[#EFE6E2]">
					{#await itemsPromise}
					<span class="text-sm text-gray-600">Showing .. of .. items</span>
					<div class="flex gap-1">
						<button class="btn-secondary px-3 py-1 text-sm" disabled>← Previous</button>
						<button class="btn-secondary px-3 py-1 text-sm" disabled>Next →</button>
					</div>
					{:then items}
					<span class="text-sm text-gray-600">Showing {((items.current_page - 1) * 12) + 1}–{Math.min(items.current_page * 12, items.total)} of {items.total} items</span>
					<div class="flex gap-1">
						{#if items.prev_page_url != null}
							<button onclick={() => itemsPromise = fetchItems(items.current_page - 1)} class="btn-secondary px-3 py-1 text-sm">← Previous</button>
						{:else}
							<button class="btn-secondary px-3 py-1 text-sm" disabled>← Previous</button>
						{/if}
						{#if items.next_page_url != null}
							<button onclick={() => itemsPromise = fetchItems(items.current_page + 1)} class="btn-secondary px-3 py-1 text-sm">Next →</button>
						{:else}
							<button class="btn-secondary px-3 py-1 text-sm" disabled>Next →</button>
						{/if}
					</div>
					{/await}
				</div>
			</div>
		</div>
	</div>
</main>
<style>
	.filter-section {
		border-bottom: 1px solid #e5e7eb;
		padding-bottom: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.filter-section:last-child {
		border-bottom: none;
		margin-bottom: 0;
	}
	.item-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
		transition: box-shadow 0.15s ease;
	}
	.item-card:hover {
		box-shadow: 0 4px 8px rgba(0,0,0,0.07);
	}
	.item-card img {
		width: 100%;
		height: auto;
		display: block;
		background: #f9fafb;
	}
</style>
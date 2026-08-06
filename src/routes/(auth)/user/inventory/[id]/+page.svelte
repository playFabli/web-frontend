<script>
	import ItemCard from '$lib/components/marketplace/ItemCard.svelte';
	import { config } from '$lib/config';

	let { data } = $props();

	async function fetchInventory(category = 0, page = 1) {
		const res = await fetch(
			`${config.api}/user/inventory/${data.user.id}?limit=15&pagination=1&category=${category}&page=${page}`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			}
		);

		const json = await res.json();
		if (!res.ok) {
			console.error(json?.message || 'Failed to fetch inventory.');
			return { data: [], total: 0, last_page: 1, current_page: 1 };
		}

		return json || { data: [], total: 0, last_page: 1, current_page: 1 };
	}

	function setTab(tab) {
		activeTab = tab;
		currentPage = 1;
		inventoryPromise = fetchInventory(tab, 1);
	}

	let activeTab = $state(0);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let inventoryData = $state({ data: [], total: 0, last_page: 1, current_page: 1 });
	let inventoryPromise = $state(fetchInventory());

	// $effect(() => {
	// 	if (inventoryData && inventoryData.last_page) {
	// 		totalPages = inventoryData.last_page;
	// 	}
	// });
	let formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	function goToPage(page) {
		currentPage = page;
		inventoryPromise = fetchInventory(activeTab, page);
	}
</script>

<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="flex items-center gap-4 mb-5">
			<a href={`/user/profile/${data.user.id}`} class="text-xs text-gray-500 hover:text-primary"
				>в†ђ Back to profile</a
			>
			<div class="h-4 border-l border-gray-300"></div>
			<div class="flex items-center gap-2">
				<img
					src={`${config.headshotStorage}/${data.user.id}.png`}
					alt="RareCollector"
					class="w-7 h-7 rounded-full border border-[#EFE6E2]"
				/>
				<span class="font-bold text-gray-900 text-sm">{data.user.username}'s Inventory</span>
				<span class="text-xs text-gray-500">({data.user.item_count} items)</span>
			</div>
		</div>

		<div class="flex gap-1.5 flex-wrap mb-4 pb-3 border-b border-[#EFE6E2]">
			<button onclick={()=>setTab(0)} class="btn-secondary text-xs px-3 py-1" class:active-tab={activeTab === 0}>All</button>
			{#each data.categories as category}
			<button onclick={()=>setTab(category.id)} class="btn-secondary text-xs px-3 py-1" class:active-tab={activeTab === category.id}>{category.title}</button>
			{/each}
		</div>

		
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4.5">
			{#if data.user.privacy.who_can_see_inventory != 2}
				{#if data.user.privacy.who_can_see_inventory == 1 && data.user.friend_status != "friends"}
				<p class="text-neutral-500 text-sm">This user has hidden their inventory.</p>
				{:else}
					{#await inventoryPromise}
						<p class="text-neutral-500 text-sm">Loading inventory...</p>
					{:then inventory}
						{#if inventory.data.length == 0}
							<p class="text-neutral-500 text-sm">No items yet...</p>
						{/if}
						{#each inventory.data as invObj}
							<ItemCard serial={invObj.serial ?? 1} item={invObj.item} {formatter} />
						{/each}
					{/await}
				{/if}
			{:else}
				<p class="text-neutral-500 text-sm">This user has hidden their inventory.</p>
			{/if}
		</div>

		<!-- Pagination -->
		{#await inventoryPromise}
		<div class="flex justify-end gap-2 mt-6 pt-4 border-t border-[#EFE6E2]">
			<button
				class="btn-secondary !px-3 !py-1 !text-sm"
				disabled={true}
			>&larr; Previous</button>
			<span class="text-xs text-gray-500 self-center">Page 1 of 1</span>
			<button
				class="btn-secondary !px-3 !py-1 !text-sm"
				disabled={true}
			>Next &rarr;</button>
		</div>
		{:then inventory}
		<div class="flex justify-end gap-2 mt-6 pt-4 border-t border-[#EFE6E2]">
			<button
				class="btn-secondary !px-3 !py-1 !text-sm"
				disabled={inventory.prev_page_url == null}
				onclick={() => goToPage(currentPage - 1)}
			>&larr; Previous</button>
			<span class="text-xs text-gray-500 self-center">Page {inventory.current_page} of {inventory.last_page}</span>
			<button
				class="btn-secondary !px-3 !py-1 !text-sm"
				disabled={inventory.next_page_url == null}
				onclick={() => goToPage(currentPage + 1)}
			>Next &rarr;</button>
		</div>
		{/await}
	</div>
</main>

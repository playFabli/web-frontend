<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ItemCard from '$lib/components/marketplace/ItemCard.svelte';
	import { config } from '$lib/config.js';

	let { data } = $props();

	let inventoryModalOpen = $state(false);
	let inventoryPromise = $state();
	function fetchInventory(userId) {
		return fetch(`${config.api}/user/inventory/${userId}`, { headers: {  Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json', Accept: 'application/json' } }).then((r) => {
			if (!r.ok) throw new Error('Failed to load inventory');
			return r.json();
		})
	}

	let offering = $state([]);
	let receiving = $state([]);

	let offeringData = $state([]);
	let recevingData = $state([]);
	let modalSide = $state(0);

	let loading = $state(false);
	let success = $state(false);
	async function createTrade() {
		loading = true;
		try {
			let response = await fetch(`${config.api}/user/trades/create/${data.user.id}/`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({ offering, receiving, offering_coins: 0, receiving_coins: 0 })
			});

			const json = await response.json();
			loading = false;
			if (!response.ok) {
				console.error(json?.message || 'Failed to create trade.');
				return;
			}

			success = true;
			inventoryPromise = fetchInventory(data.user.id);
			goto(`/user/trades`);
		} catch (err) {
			console.error('Failed to create trade.');
		} finally {
			loading = false;
		}
	}
</script>
{#if inventoryModalOpen}
<div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 8px;"
     onclick={(e) => e.target === e.currentTarget && (inventoryModalOpen = false)}>
    
    <div class="modal" style="background: white; border: 1px solid #e5e7eb; border-radius: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08); width: 100%; max-width: 920px; max-height: 90vh; display: flex; flex-direction: column;">
        
        <div class="modal-header" style="padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
			{#if modalSide == 0}
			<h2 class="text-base font-semibold text-gray-900">Your Inventory</h2>
			{:else}
			<h2 class="text-base font-semibold text-gray-900">{data.user.username}'s Inventory</h2>
			{/if}
			<button onclick={()=>inventoryModalOpen = false} class="close-btn" style="background: none; border: none; font-size: 1.5rem; color: #6b7280; cursor: pointer; line-height: 1; padding: 0 0.5rem;">&times;</button>
        </div>
        
        <div class="modal-body" style="padding: 1rem; overflow-y-auto; flex-grow: 1;">
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
				{#await inventoryPromise}
				<p class="text-neutral-500 text-sm col-span-full">Loading inventory...</p>
				{:then inventory}
					{#if inventory.data.length == 0}
						<p class="text-neutral-500 text-sm col-span-full">No items yet...</p>
					{/if}
					{#each inventory.data as item}
					{#if modalSide == 1}
					{#if !receiving.includes(item.id)}
					<ItemCard onclick={() => { receiving = [...receiving, item.id]; recevingData = [...recevingData, item]; inventoryModalOpen = false }} item={item.item} formatter={null} hidePrice={true} serial={item.serial} />
					{/if}
					{/if}
					{#if modalSide == 0}
					{#if !offering.includes(item.id)}
					<ItemCard onclick={() => { offering = [...offering, item.id]; offeringData = [...offeringData, item]; inventoryModalOpen = false }} item={item.item} formatter={null} hidePrice={true} serial={item.serial} />
					{/if}
					{/if}
					{/each}
				{/await}
			</div>
        </div>
    </div>
</div>

{/if}
<main class="py-4 sm:py-6">
	<div class="max-w-container mx-auto px-4">
		<h1 class="text-xl font-bold text-gray-900 mb-4 sm:mb-5">New Trade</h1>
		<div id="createTrade" class="tab-content">
			<div class="border border-gray-200 rounded-[4px] p-3 sm:p-4 bg-white">
				<div class="flex flex-col lg:grid lg:grid-cols-2 gap-4 mb-4">

					<div>
						<label class="form-label mb-1.5 block text-sm font-medium text-gray-700">Your Offer</label>
						<div class="border border-gray-200 rounded-[4px] p-2.5 min-h-[180px] bg-gray-50/30">
							<div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-5 xl:grid-cols-6 gap-2" id="yourOfferItems">
								<img 
									onclick={()=>{ modalSide = 0; inventoryPromise = fetchInventory(page.data.globalUser.id); inventoryModalOpen = true; }} 
									src="https://placehold.co/48x48/D9C5B2/1A4D4F?text=Add" 
									class="trade-item-thumb opacity-50 cursor-pointer w-full aspect-square object-cover rounded-[4px] border border-dashed border-gray-300 hover:opacity-75 transition-opacity" 
									title="Click to add from your inventory"
									alt="Add item"
								>
								{#each offeringData as item}
									<ItemCard onclick={() => { offering = offering.filter((id) => id != item.id); offeringData = offeringData.filter((item) => item.id != item.id); }} item={item.item} formatter={null} hidePrice={true} serial={item.serial} />
								{/each}
							</div>
						</div>
					</div>

					<div>
						<label class="form-label mb-1.5 block text-sm font-medium text-gray-700">You Request</label>
						<div class="border border-gray-200 rounded-[4px] p-2.5 min-h-[180px] bg-gray-50/30">
							<div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-5 xl:grid-cols-6 gap-2" id="theirOfferItems">
								<img 
									onclick={()=>{ modalSide = 1; inventoryPromise = fetchInventory(data.user.id); inventoryModalOpen = true; }} 
									src="https://placehold.co/48x48/D9C5B2/1A4D4F?text=Add" 
									class="trade-item-thumb opacity-50 cursor-pointer w-full aspect-square object-cover rounded-[4px] border border-dashed border-gray-300 hover:opacity-75 transition-opacity" 
									title="Click to add from their inventory"
									alt="Add item"
								>
								{#each recevingData as item}
									<ItemCard onclick={() => { receiving = receiving.filter((id) => id != item.id); recevingData = recevingData.filter((item) => item.id != item.id); }} item={item.item} formatter={null} hidePrice={true} serial={item.serial} />
								{/each}
							</div>
						</div>
					</div>

				</div>
				
				<div class="flex justify-end gap-3 pt-2 border-t border-gray-100 sm:border-none">
					<button onclick={createTrade} disabled={offering.length == 0 && receiving.length == 0 || loading} class="btn-glossy px-4 py-1.5 text-sm rounded-[4px]">
						{#if loading}
							Sending...
						{:else}
							Send Trade
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
</main>

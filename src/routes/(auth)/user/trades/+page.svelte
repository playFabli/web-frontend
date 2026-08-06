<script>
	import { onMount } from 'svelte';
	import { config } from '$lib/config';
	import { page } from '$app/state';
	import ItemCard from '$lib/components/marketplace/ItemCard.svelte';
	import { timeSince } from '$lib/timeAgo.js';

	let { data } = $props();

	let activeTab = $state(0); // 0 = Active, 1 = Past, 2 = Create
	let currentPage = $state(1);
	let tradesPromise = $state(fetchTrades(0, 1));

	function fetchTrades(tab, page = 1) {
		return fetch(`${config.api}/user/trades/${tab}?page=${page}`, { headers: {  Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json', Accept: 'application/json' } }).then((r) => {
			if (!r.ok) throw new Error('Failed to load trades');
			return r.json();
		});
	}

	function setTab(idx) {
		activeTab = idx;
		currentPage = 1;
		if (idx === 0 || idx === 1) tradesPromise = fetchTrades(idx, 1);
	}

	function goToPage(page) {
		currentPage = page;
		tradesPromise = fetchTrades(activeTab, page);
	}

	let loading = $state(false);
	async function changeTradeState(id, state, page=1) {
		try {
			loading = true;
			let response = await fetch(`${config.api}/user/trades/update/${id}/${state}?page=${page}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await response.json();
			loading = false;
			if (!response.ok) {
				console.log(json)
				console.error(json?.message || 'Failed to change trade state.');
				return;
			}

			tradesPromise = fetchTrades(activeTab);
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
		}
	}

	let formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	})

</script>
<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<h1 class="text-xl font-bold text-gray-900 mb-5">Trades</h1>

		<!-- Tabs -->
		<div class="flex border-b border-[#EFE6E2] mb-4">
			{#await tradesPromise}
			<button onclick={()=>setTab(0)} class="btn-secondary active-tab px-4 py-2 text-sm !rounded-lg-none !border-0 !border-r !border-[#EFE6E2]">Active</button>
			{:then trades}
			<button onclick={()=>setTab(0)} class="btn-secondary active-tab px-4 py-2 text-sm !rounded-lg-none !border-0 !border-r !border-[#EFE6E2]">Active</button>
			{/await}
			<button onclick={()=>setTab(1)} class="btn-secondary px-4 py-2 text-sm !rounded-lg-none !border-0 !border-r !border-[#EFE6E2]">Past</button>
		</div>

		{#if activeTab == 0}
		<div class="tab-content">
			{#await tradesPromise}
				<div class="text-sm text-gray-500">Loading tradesвЂ¦</div>
			{:then trades}
				{#if trades && trades.data.length}
					{#each trades.data as t}
						<div class="trade-card card-shadow">
							<div class="flex flex-col sm:flex-row justify-between gap-4">
								<div class="flex-1">
									<div class="flex items-center gap-2 mb-2">
										<img src={`${config.headshotStorage}/${t.from.id}.png`} alt={t.from.username || 'user'} class="w-6 h-6 rounded-full">
										{#if t.from_id != page.data.globalUser.id}
										<span class="font-bold text-sm">{t.from.username}</span>
										{:else}
										<span class="font-bold text-sm">{t.to.username}</span>
										{/if}
										<span class="text-xs text-gray-500">вЂў {timeSince(t.created_at)} ago</span>
									</div>
									<div class="flex gap-2 mb-2">
										<div class="flex items-center gap-1 text-sm"><span class="text-gray-600">Offering:</span></div>
										<div class="flex gap-1">
											{#each t.offering as it}
												<img src={`${config.storage}/items/${it.item_id}.png`} alt={it.title} class="trade-item-thumb" title={it.title}>
											{/each}
										</div>
									</div>
									<div class="flex gap-2">
										<div class="flex items-center gap-1 text-sm"><span class="text-gray-600">Requesting:</span></div>
										<div class="flex gap-1">
											{#each t.requesting as it}
												<img src={`${config.storage}/items/${it.item_id}.png`} alt={it.title} class="trade-item-thumb" title={it.title}>
											{/each}
										</div>
									</div>
								</div>
								{#if t.to_id == page.data.globalUser.id}
								<div class="flex sm:flex-col gap-2 justify-end">
									<button disabled={loading} onclick={() => changeTradeState(t.id, 1)} class="btn-glossy px-4 py-1 text-xs">{#if loading}
										Updating...
										{:else}
										Accept
										{/if}
									</button>
									<button disabled={loading} onclick={() => changeTradeState(t.id, 2)} class="btn-danger px-4 py-1 text-xs">
										{#if loading}
										Updating...
										{:else}
										Decline
										{/if}
									</button>
								</div>
								{/if}
							</div>
						</div>
					{/each}
					<div class="mt-4 pt-3 flex items-center justify-between text-xs text-gray-600">
						<span>Page {trades.current_page} of {trades.last_page}</span>
						<div class="flex items-center gap-1">
							{#if trades.prev_page_url == null}
							<button class="btn-secondary px-2 py-1 text-[11px]" disabled>Prev</button>
							{:else}
							<button class="btn-secondary px-2 py-1 text-[11px]" onclick={() => goToPage(trades.current_page - 1)}>Prev</button>
							{/if}
							{#if trades.next_page_url == null}
							<button class="btn-secondary px-2 py-1 text-[11px]" disabled>Next</button>
							{:else}
							<button class="btn-secondary px-2 py-1 text-[11px]" onclick={() => goToPage(trades.current_page + 1)}>Next</button>
							{/if}
						</div>
					</div>	
				{:else}
					<div class="text-sm text-gray-500">No trades found.</div>
				{/if}
			{:catch err}
				<div class="text-sm text-red-600">Error loading trades: {err.message}</div>
			{/await}
		</div>
		{/if}

		{#if activeTab == 1}
		<div id="pastTrades" class="tab-content">
			{#await tradesPromise}
				<div class="text-sm text-gray-500">Loading tradesвЂ¦</div>
			{:then trades}
			{#if trades.total > 0}
			{#each trades.data as trade}
			<div class="trade-card card-shadow">
				<div class="flex items-center gap-2 mb-2">
					{#if trade.from_id == page.data.globalUser.id}
					<img src={config.headshotStorage + "/" + data.globalUser.id + ".png"} alt="TechieTim" class="w-6 h-6 rounded-full">
					{:else}
					<img src={config.headshotStorage + "/" + trade.from.id + ".png"} alt="TechieTim" class="w-6 h-6 rounded-full">
					{/if}
					{#if trade.from_id == page.data.globalUser.id}
					<span class="font-bold text-sm">{trade.to.username}</span>
					{:else}
					<span class="font-bold text-sm">{trade.from.username}</span>
					{/if}
					<span class="text-xs text-gray-500">вЂў {timeSince(trade.created_at)} ago</span>
					{#if trade.status === 1}
					<span class="text-xs text-green-600 font-bold ml-auto">Completed</span>
					{:else}
					<span class="text-xs text-red-600 font-bold ml-auto">Declined</span>
					{/if}
				</div>
				<div class="flex gap-2 text-sm">
					{#if trade.from_id == page.data.globalUser.id}
					<span class="text-gray-600">You gave:</span> {#each trade.offering as it}<img src={`${config.storage}/items/${it.item_id}.png`} alt={it.title} class="trade-item-thumb" title={it.title}>{/each}
					<span class="text-gray-600 ml-2">You got:</span> {#each trade.requesting as it}<img src={`${config.storage}/items/${it.item_id}.png`} alt={it.title} class="trade-item-thumb" title={it.title}>{/each}
					{:else}
					<span class="text-gray-600 ml-2">You gave:</span> {#each trade.requesting as it}<img src={`${config.storage}/items/${it.item_id}.png`} alt={it.title} class="trade-item-thumb" title={it.title}>{/each}
					<span class="text-gray-600">You got:</span> {#each trade.offering as it}<img src={`${config.storage}/items/${it.item_id}.png`} alt={it.title} class="trade-item-thumb" title={it.title}>{/each}
					{/if}
				</div>
			</div>
			{/each}
			<div class="mt-4 pt-3 flex items-center justify-between text-xs text-gray-600">
				<span>Page {trades.current_page} of {trades.last_page}</span>
				<div class="flex items-center gap-1">
					{#if trades.prev_page_url == null}
					<button class="btn-secondary px-2 py-1 text-[11px]" disabled>Prev</button>
					{:else}
					<button class="btn-secondary px-2 py-1 text-[11px]" onclick={() => goToPage(trades.current_page - 1)}>Prev</button>
					{/if}
					{#if trades.next_page_url == null}
					<button class="btn-secondary px-2 py-1 text-[11px]" disabled>Next</button>
					{:else}
					<button class="btn-secondary px-2 py-1 text-[11px]" onclick={() => goToPage(trades.current_page + 1)}>Next</button>
					{/if}
				</div>
			</div>
			{:else}
				<div class="text-sm text-gray-500">No trades found.</div>
			{/if}
			{/await}
		</div>
		{/if}
	</div>
</main>
<style>
	.trade-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 1rem;
		margin-bottom: 0.75rem;
		transition: box-shadow 0.15s ease;
	}
	.trade-card:hover {
		box-shadow: 0 4px 8px rgba(0,0,0,0.07);
	}
	.trade-item-thumb {
		width: 48px;
		height: 48px;
		object-fit: cover;
		border: 1px solid #e5e7eb;
		border-radius: 2px;
		background: #f9fafb;
	}
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
</style>
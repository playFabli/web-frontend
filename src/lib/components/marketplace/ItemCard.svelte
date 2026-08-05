<script>
	import { goto } from "$app/navigation";
	import { config } from "$lib/config";
	import { onMount, onDestroy } from "svelte";

	let { item, formatter, serial = -1, hidePrice = false, onclick = () => { goto(`/marketplace/item/${item.id}`) } } = $props();
	let format = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	// Timed item countdown
	let timeRemaining = $state('');
	let timeInterval = $state(null);

	function updateTimeRemaining() {
		if (!item.is_timed || !item.timed_end_at) {
			timeRemaining = '';
			return;
		}

		const end = new Date(item.timed_end_at).getTime();
		const now = Date.now();
		const diff = end - now;

		if (diff <= 0) {
			timeRemaining = 'Ended';
			return;
		}

		const days = Math.floor(diff / 86400000);
		const hours = Math.floor((diff % 86400000) / 3600000);
		const minutes = Math.floor((diff % 3600000) / 60000);
		const seconds = Math.floor((diff % 60000) / 1000);

		if (days > 0) {
			timeRemaining = `${days}d ${hours}h`;
		} else if (hours > 0) {
			timeRemaining = `${hours}h ${minutes}m`;
		} else if (minutes > 0) {
			timeRemaining = `${minutes}m ${seconds}s`;
		} else {
			timeRemaining = `${seconds}s`;
		}
	}

	onMount(() => {
		if (item.is_timed && item.timed_end_at) {
			updateTimeRemaining();
			timeInterval = setInterval(updateTimeRemaining, 1000);
		}
	});

	onDestroy(() => {
		if (timeInterval) {
			clearInterval(timeInterval);
		}
	});
</script>
<div {onclick} class="cursor-pointer item-card card-shadow">
		<div class="relative">
			<img src={`${config.storage}/items/${item.id}.png`} alt={item.name} loading="lazy" />
			{#if item.rarity != "none"}
			<span class="rarity-badge rarity-{item.rarity.toLowerCase()}">{item.rarity}</span>
			{/if}
			{#if item.is_limited && item.stock_left > 0}
				<div class="limited-banner">
					LIMITED
					<span class="stock-text">{item.stock_left} / {item.stock_count}</span>
				</div>
			{/if}
			{#if item.is_timed && timeRemaining}
				<div class="timed-banner">
					<span class="timed-text">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3 mb-0.5 inline"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
						{timeRemaining}</span>
				</div>
			{/if}
		</div>
		<div class="p-2">
			<p class="text-sm font-bold text-gray-900 truncate">{item.title} <span class="text-xs text-gray-400">{item.category.title}</span></p>
			{#if !hidePrice}
			{#if !item.is_offsale}
				{#if item.is_limited && item.stock_left == 0}
					<p class="text-xs text-gray-600"><span class="text-primary font-bold">VAL</span> {formatter.format(item.final_rap)} {#if serial != -1}<span class="text-neutral-500">(#{serial})</span>{/if}</p>
				{:else if item.is_limited && item.stock_left > 0}
					<p class="text-xs text-gray-600">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="size-4 inline mb-1 !text-primary"
							><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path
								d="m6.134 14.768.866-.5 2 3.464"
							/><circle cx="16" cy="8" r="6" /></svg
						>
						{format.format(item.price)}
					</p>
				{:else if !item.is_limited}
					<p class="text-xs text-gray-600">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="size-4 inline mb-1 !text-primary"
							><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path
								d="m6.134 14.768.866-.5 2 3.464"
							/><circle cx="16" cy="8" r="6" /></svg
						>
						{format.format(item.price)}
					</p>
				{/if}
			{:else}
				<p class="text-xs text-gray-600">Offsale</p>
			{/if}
			{/if}
		</div>
	</div>

<style>
</style>
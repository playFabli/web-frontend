<script>
	import { goto } from "$app/navigation";
	import { config } from "$lib/config";

	let { item, formatter, serial = -1, hidePrice = false, onclick = () => { goto(`/marketplace/item/${item.id}`) } } = $props();
	let format = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
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
		</div>
		<div class="p-2">
			<p class="text-sm font-medium text-gray-900 truncate">{item.title} <span class="text-xs text-gray-400">{item.category.title}</span></p>
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
							class="size-4 inline mb-1 !text-primary/80"
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
							class="size-4 inline mb-1 !text-primary/80"
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
<script lang="ts">
	import { page } from '$app/state';
	import { config } from '$lib/config';
	import { onMount } from 'svelte';

	interface InventoryItem {
		id: number;
		item_id: number;
		item?: {
			title?: string;
			category?: {
				title?: string;
			};
		};
	}

	interface WornItem {
		id: number;
		item_id: number;
		item?: {
			title?: string;
			category?: {
				title?: string;
			};
		};
	}

	interface AvatarColors {
		left_arm_color?: string;
		right_arm_color?: string;
		torso_color?: string;
		left_leg_color?: string;
		right_leg_color?: string;
		head_color?: string;
	}

	interface MarketplaceCategory {
		id: number;
		title: string;
		is_admin_only: boolean;
		needs_rendering: boolean;
	}

	let { data } = $props();
	
	// State
	let inventory = $state<InventoryItem[]>(data.inventory || []);
	let wearing = $state<WornItem[]>(data.wearing || []);
	let avatarColors = $state<AvatarColors>(data.avatarColors || {
		left_arm_color: '#D9C5B2',
		right_arm_color: '#D9C5B2',
		torso_color: '#D9C5B2',
		left_leg_color: '#D9C5B2',
		right_leg_color: '#D9C5B2',
		head_color: '#D9C5B2'
	});
	let categories = $state<MarketplaceCategory[]>([]);
	let loadingCategories = $state<boolean>(true);
	let activeFilter = $state<string>('all');
	let isLoading = $state<boolean>(false);
	let currentPage = $state<number>(1);
	let totalPages = $state<number>(1);
	
	// Color state
	let leftArmColor = $state<string>('#D9C5B2');
	let rightArmColor = $state<string>('#D9C5B2');
	let torsoColor = $state<string>('#D9C5B2');
	let leftLegColor = $state<string>('#D9C5B2');
	let rightLegColor = $state<string>('#D9C5B2');
	let headColor = $state<string>('#D9C5B2');
	
	// Render
	let avatarSrc = $state(config.avatarStorage + "/" + page.data.globalUser.id + ".png");
	let avatarLoading = $state(false);
	let cacheBreaker = $state(Date.now());

	// Get category name from filter value (filter value is the category title)
	function getFilterCategory(filter: string): string {
		if (filter === 'all') return 'all';
		return filter;
	}

	// Fetch inventory with filter and pagination
	async function fetchInventory(filter: string = 'all', page: number = 1): Promise<void> {
		isLoading = true;
		try {
			const res = await fetch(`${config.api}/user/inventory/me?category=${getFilterCategory(filter)}&page=${page}&limit=20&show_duplicates=0`, {
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			const json = await res.json();
			if (res.ok) {
				inventory = json.data || [];
				currentPage = json.current_page || 1;
				totalPages = json.last_page || 1;
			}
		} catch (e) {
			console.error('Failed to load inventory', e);
		}
		isLoading = false;
	}

	// Handle filter change
	function setFilter(filter: string): void {
		activeFilter = filter;
		fetchInventory(filter, 1);
	}

	// Check if item is equipped
	function isEquipped(itemId: number): boolean {
		return wearing.some((w: WornItem) => w.item_id === itemId);
	}

	// Check if the user already has a restricted-category item equipped (Face, Avatar Poses)
	function hasCategoryEquipped(categoryTitle: string): boolean {
		return wearing.some((w: WornItem) => w.item?.category?.title === categoryTitle);
	}

	// Categories that can only have one item equipped at a time
	const restrictedCategories = ['Face', 'Avatar Poses'];

	// Check if wearing an item from this category is blocked
	function isWearBlocked(categoryTitle: string | undefined): boolean {
		if (!categoryTitle) return false;
		if (!restrictedCategories.includes(categoryTitle)) return false;
		return hasCategoryEquipped(categoryTitle);
	}

	// Wear an item
	async function wearItem(inventoryId: number): Promise<void> {
		try {
			const res = await fetch(`${config.api}/user/avatar/wear/${inventoryId}`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			
			if (res.ok) {
				const result = await res.json();
				wearing = [...wearing, result.data];
			} else {
				const error = await res.json();
				alert(error.message || 'Failed to equip item');
			}
		} catch (e) {
			console.error('Failed to equip item', e);
			alert('Failed to equip item');
		}
	}

	// Remove an item
	async function removeItem(inventoryId: number): Promise<void> {
		try {
			const res = await fetch(`${config.api}/user/avatar/remove/${inventoryId}`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			
			if (res.ok) {
				const item = inventory.find((i: InventoryItem) => i.id === inventoryId);
				if (item) {
					wearing = wearing.filter((w: WornItem) => w.item_id !== item.item_id);
				}
			} else {
				const error = await res.json();
				alert(error.message || 'Failed to remove item');
			}
		} catch (e) {
			console.error('Failed to remove item', e);
			alert('Failed to remove item');
		}
	}

	// Save avatar colors
	async function saveAvatarColors(): Promise<void> {
		try {
			const res = await fetch(`${config.api}/user/avatar/colors`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify({
					left_arm_color: leftArmColor,
					right_arm_color: rightArmColor,
					torso_color: torsoColor,
					left_leg_color: leftLegColor,
					right_leg_color: rightLegColor,
					head_color: headColor
				})
			});
			
			if (res.ok) {
				alert('Avatar colors saved!');
			} else {
				const error = await res.json();
				alert(error.message || 'Failed to save avatar colors');
			}
		} catch (e) {
			console.error('Failed to save avatar colors', e);
			alert('Failed to save avatar colors');
		}
	}

	// Render avatar
	async function renderAvatar(): Promise<void> {
		try {
			avatarLoading = true;
			const res = await fetch(`${config.api}/user/avatar/render`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			
			if (res.ok) {
				avatarLoading = false;
				const result = await res.json();
				avatarSrc = config.avatarStorage + result.data.render_url;
				cacheBreaker = Date.now();
			} else {
				const error = await res.json();
				alert(error.message || 'Failed to render avatar');
			}
		} catch (e) {
			console.error('Failed to render avatar', e);
			alert('Failed to render avatar');
		}
	}

	// Fetch categories from marketplace with needs_rendering=true
	async function fetchCategories(): Promise<void> {
		loadingCategories = true;
		try {
			const res = await fetch(`${config.api}/marketplace/categories/1`, {
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			const json = await res.json();
			if (res.ok && json.data) {
				categories = json.data.filter((cat: MarketplaceCategory) => cat.needs_rendering === true);
			}
		} catch (e) {
			console.error('Failed to load categories', e);
		}
		loadingCategories = false;
	}

	// Initialize colors from data
	onMount(() => {
		if (data.avatarColors) {
			leftArmColor = data.avatarColors.left_arm_color || '#D9C5B2';
			rightArmColor = data.avatarColors.right_arm_color || '#D9C5B2';
			torsoColor = data.avatarColors.torso_color || '#D9C5B2';
			leftLegColor = data.avatarColors.left_leg_color || '#D9C5B2';
			rightLegColor = data.avatarColors.right_leg_color || '#D9C5B2';
			headColor = data.avatarColors.head_color || '#D9C5B2';
		}
		fetchCategories();
	});
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
		padding: 0.5rem;
		text-align: center;
		transition: box-shadow 0.15s ease;
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
		margin-bottom: 0.25rem;
	}
	.avatar-preview {
		width: 100%;
		aspect-ratio: 1 / 1;
		display: grid;
		place-items: center;
	}
	.avatar-preview img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.avatar-preview .loading-placeholder {
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
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
		margin-bottom: 0.25rem;
	}
	.worn {
		border-color: #A2574F;
		background: #fdf2f2;
	}
	.color-swatch {
		width: 24px;
		height: 24px;
		border-radius: 3px;
		border: 1px solid #d1d5db;
		cursor: pointer;
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
	<div class="max-w-container mx-auto px-4">
		<h1 class="text-xl font-bold text-gray-900 mb-5">Customize Avatar</h1>

		<div class="flex flex-col lg:flex-row gap-5">
			<div class="lg:w-1/3">
				<div class="border border-gray-200 rounded p-3 bg-white text-center">
					<div class="border border-gray-300 avatar-preview relative aspect-square w-full overflow-hidden">
					
					{#if !avatarLoading}
						<img src={`${avatarSrc}?t=${cacheBreaker}`} alt="Avatar Preview" class="w-full h-full object-cover" loading="lazy">
					{:else}
						<div class="absolute inset-0 flex items-center justify-center">
							<img src={`${config.storage}/loading.gif?r=5`} alt="Loading..." class="block w-32 h-32 max-w-32 max-h-32 object-contain" loading="lazy">
						</div>
					{/if}

					</div>
					<h2 class="text-sm font-semibold text-accent mt-2">Current Look</h2>
					<ul class="text-xs text-gray-600 mt-1 space-y-0.5 text-left list-disc list-inside">
						{#if wearing.length === 0}
							<li>No items equipped</li>
						{:else}
							{#each wearing as worn}
								<li>{worn.item?.title || 'Unknown Item'}</li>
							{/each}
						{/if}
					</ul>
					<button class="btn-secondary w-full mt-3 py-1 text-xs" onclick={renderAvatar}>Render Avatar</button>
				</div>
			</div>

			<!-- Right: Inventory & Colors -->
			<div class="lg:w-2/3 space-y-4">
				<!-- Inventory Section -->
				<div class="border border-gray-200 rounded p-4 bg-white">
					<h2 class="text-sm font-semibold text-accent mb-3">Inventory</h2>
					<!-- Filter Tabs -->
					<div class="flex flex-wrap gap-1 mb-3">
						<button 
							class="filter-tab px-4 py-1" 
							class:active={activeFilter === 'all'}
							onclick={() => setFilter('all')}
						>All</button>
						{#if loadingCategories}
							<span class="text-xs text-neutral-500 self-center">Loading categories...</span>
						{:else}
							{#each categories as cat}
								<button 
									class="filter-tab px-4 py-1" 
									class:active={activeFilter === cat.title}
									onclick={() => setFilter(cat.title)}
								>{cat.title}</button>
							{/each}
						{/if}
					</div>
					<!-- Items Grid -->
					<div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
						{#if isLoading}
							<p class="text-neutral-500 text-sm col-span-full">Loading...</p>
						{:else if inventory.length === 0}
							<p class="text-neutral-500 text-sm col-span-full">No items found...</p>
						{:else}
							{#each inventory as invObj}
								<div class="inventory-card cursor-pointer" class:worn={isEquipped(invObj.item_id)}>
									<img src={config.storage + "/items/" + invObj.item_id + ".png"} alt={invObj.item?.title} loading="lazy">
									<p class="text-xs mt-1 truncate">{invObj.item?.title}</p>
									<span class="type-tag">{invObj.item?.category?.title}</span>
									{#if isEquipped(invObj.item_id)}
										<button 
											class="btn-secondary w-full mt-1 text-xs py-0.5"
											onclick={() => removeItem(invObj.id)}
										>
											Remove
										</button>
									{:else if isWearBlocked(invObj.item?.category?.title)}
										<button 
											class="btn-glossy w-full mt-1 text-xs py-0.5 opacity-50 cursor-not-allowed"
											disabled
											title={"Remove the current " + invObj.item?.category?.title + " item first"}
										>
											Wear
										</button>
									{:else}
										<button 
											class="btn-glossy w-full mt-1 text-xs py-0.5"
											onclick={() => wearItem(invObj.id)}
										>
											Wear
										</button>
									{/if}
								</div>
							{/each}
						{/if}
					</div>
					
					<!-- Pagination -->
					{#if totalPages > 1}
						<div class="flex justify-center items-center gap-2 mt-4">
							<button 
								class="pagination-btn"
								disabled={currentPage === 1}
								onclick={() => fetchInventory(activeFilter, currentPage - 1)}
							>
								Previous
							</button>
							<span class="text-sm text-gray-600">
								Page {currentPage} of {totalPages}
							</span>
							<button 
								class="pagination-btn"
								disabled={currentPage === totalPages}
								onclick={() => fetchInventory(activeFilter, currentPage + 1)}
							>
								Next
							</button>
						</div>
					{/if}
				</div>

				<!-- Limb Colors Section -->
				<div class="border border-gray-200 rounded p-4 bg-white">
					<h2 class="text-sm font-semibold text-accent mb-3">Limb Colors</h2>
					<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
						<div class="flex items-center gap-2">
							<label class="text-xs font-medium w-20">Left Arm</label>
							<input type="color" class="color-swatch" bind:value={leftArmColor}>
						</div>
						<div class="flex items-center gap-2">
							<label class="text-xs font-medium w-20">Right Arm</label>
							<input type="color" class="color-swatch" bind:value={rightArmColor}>
						</div>
						<div class="flex items-center gap-2">
							<label class="text-xs font-medium w-20">Torso</label>
							<input type="color" class="color-swatch" bind:value={torsoColor}>
						</div>
						<div class="flex items-center gap-2">
							<label class="text-xs font-medium w-20">Left Leg</label>
							<input type="color" class="color-swatch" bind:value={leftLegColor}>
						</div>
						<div class="flex items-center gap-2">
							<label class="text-xs font-medium w-20">Right Leg</label>
							<input type="color" class="color-swatch" bind:value={rightLegColor}>
						</div>
						<div class="flex items-center gap-2">
							<label class="text-xs font-medium w-20">Head</label>
							<input type="color" class="color-swatch" bind:value={headColor}>
						</div>
					</div>
				</div>

				<!-- Save Button -->
				<div class="text-right">
					<button class="btn-glossy px-8 py-1 text-sm" onclick={saveAvatarColors}>Save Avatar</button>
				</div>
			</div>
		</div>
	</div>
</main>
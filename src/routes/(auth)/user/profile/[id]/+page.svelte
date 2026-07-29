<script>
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Tooltip from '$lib/components/global/Tooltip.svelte';
	import ItemCard from '$lib/components/marketplace/ItemCard.svelte';
	import { config } from '$lib/config.js';
	import { timeSince } from '$lib/timeAgo';
	import { Gavel } from 'lucide-svelte';
	let { data } = $props();

	function formatJoined(dateStr) {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		if (isNaN(d)) return dateStr;
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	let user = page.data.globalUser;

	// Check if profile is hidden (profile_visible is false and viewer is not owner or friend)
	// This is computed inline in the template

	let isOwnProfile = $derived(data.user.id === user?.id);
	let profileItems = $state([]);
	let showEditModal = $state(false);
	let loadingProfileItems = $state(false);

	async function fetchProfileItems() {
		loadingProfileItems = true;
		try {
			const res = await fetch(`${config.api}/user/profile/items/${data.user.id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await res.json();
			if (!res.ok) {
				console.error(json?.message || 'Failed to fetch profile items.');
				return;
			}

			profileItems = json.data || [];
		} catch (err) {
			console.error('Failed to fetch profile items.', err);
		} finally {
			loadingProfileItems = false;
		}
	}

	async function fetchWall(page = 1) {
		const res = await fetch(`${config.api}/user/wall/${data.user.id}?page=${page}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${data.token}`
			}
		});

		const json = await res.json();
		if (!res.ok) {
			console.error(json?.message || 'Failed to fetch wall.');
			return [];
		}

		return json || [];
	}
	let wallPromise = $state(fetchWall());

	let content = $state();
	let loading = $state(false);
	let error = $state('');

	async function deleteWallPost(postId) {
		if (!confirm('Are you sure you want to delete this wall post?')) return;

		try {
			const res = await fetch(`${config.api}/user/wall/post/${postId}`, {
				method: 'DELETE',
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			if (!res.ok) {
				const json = await res.json();
				console.error(json?.message || 'Failed to delete post.');
				return;
			}

			wallPromise = fetchWall();
		} catch (err) {
			console.error('Failed to delete post.', err);
		}
	}
	async function postToWall() {
		try {
			loading = true;
			const res = await fetch(`${config.api}/user/wall/${data.user.id}/post`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({ content: content })
			});
			const json = await res.json();
			if (!res.ok) {
				error = json?.message || 'Failed to post to wall.';
				return;
			}

			content = '';
			wallPromise = fetchWall();
			error = '';
		} catch (err) {
			console.error(err);
			error = 'An error occurred';
		} finally {
			loading = false;
		}
	}

	let creationsPage = $state(1);
	let creationsTotalPages = $state(1);
	let creationsTotal = $state(0);

	async function fetchCreations(page = 1) {
		const res = await fetch(`${config.api}/user/creations/${data.user.id}?page=${page}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${data.token}`
			}
		});

		const json = await res.json();
		if (!res.ok) {
			console.error(json?.message || 'Failed to fetch creations.');
			return { data: [], total: 0, totalPages: 1 };
		}

		creationsTotal = json.total || 0;
		creationsTotalPages = json.last_page || 1;

		return json.data || [];
	}

	function updateCreations(page) {
		creationsPage = page;
		creationsPromise = fetchCreations(page);
	}

	let creationsPromise = $derived(fetchCreations(creationsPage));

	let inventoryPage = $state(1);
	let inventoryTotalPages = $state(1);
	let inventoryTotal = $state(0);

	async function fetchInventory(page = 1) {
		const res = await fetch(`${config.api}/user/inventory/${data.user.id}?page=${page}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${data.token}`
			}
		});

		const json = await res.json();
		if (!res.ok) {
			console.error(json?.message || 'Failed to fetch inventory.');
			return { data: [], total: 0, totalPages: 1 };
		}

		inventoryTotal = json.total || 0;
		inventoryTotalPages = json.last_page || 1;

		return json.data || [];
	}

	function updateInventory(page) {
		inventoryPage = page;
		inventoryPromise = fetchInventory(page);
	}

	let inventoryPromise = $derived(fetchInventory(inventoryPage));

	let friendLoading = $state(false);
	async function saveProfileItems() {
		try {
			const itemsToSave = selectedItems.map(item => item.id);

			const res = await fetch(`${config.api}/user/profile/items/${data.user.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({ items: itemsToSave })
			});

			const json = await res.json();
			if (!res.ok) {
				console.error(json?.message || 'Failed to save profile items.');
				return;
			}

			await fetchProfileItems();
			showEditModal = false;
		} catch (err) {
			console.error('Failed to save profile items.', err);
		}
	}

	let availableItems = $state([]);
	let selectedItems = $state([]);
	let itemSearch = $state('');
	let itemCategory = $state('');
	let categories = $state([]);
	let loadingAvailableItems = $state(false);

	async function fetchAvailableItems() {
		loadingAvailableItems = true;
		try {
			const params = new URLSearchParams();
			if (itemSearch) params.append('search', itemSearch);
			if (itemCategory) params.append('category', itemCategory);

			const res = await fetch(`${config.api}/user/profile/available-items/${data.user.id}?${params.toString()}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await res.json();
			if (!res.ok) {
				console.error(json?.message || 'Failed to fetch available items.');
				return;
			}

			availableItems = json.data || [];

			// Pre-select items that are already on the wall
			selectedItems = availableItems.filter(item => item.on_wall);
		} catch (err) {
			console.error('Failed to fetch available items.', err);
		} finally {
			loadingAvailableItems = false;
		}
	}

	async function fetchCategories() {
		try {
			const res = await fetch(`${config.api}/user/profile/categories`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await res.json();
			if (!res.ok) {
				console.error(json?.message || 'Failed to fetch categories.');
				return;
			}

			categories = json.data || [];
		} catch (err) {
			console.error('Failed to fetch categories.', err);
		}
	}

	function openEditModal() {
		showEditModal = true;
		fetchCategories();
		// Fetch available items will be triggered after modal is shown and categories loaded
		setTimeout(() => {
			fetchAvailableItems();
		}, 100);
	}

	async function sendFriendRequest() {
		try {
			friendLoading = true;
			const res = await fetch(`${config.api}/user/friend/${data.user.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});
			const json = await res.json();
			if (!res.ok) {
				console.error(json?.message || 'Failed to send friend request.');
				return;
			}

			invalidateAll();
		} catch (err) {
			console.error(err);
		} finally {
			friendLoading = false;
		}
	}

		const format = new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		});

		let friendsCount = $derived(data.user.friends_count ?? 0);
		let itemsCount = $derived(data.user.item_count ?? 0);
		let postsCount = $state(0);

		// Fetch wall count for posts
		async function fetchWallCount() {
			try {
				const res = await fetch(`${config.api}/user/wall/${data.user.id}?page=1`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						Authorization: `Bearer ${data.token}`
					}
				});

				const json = await res.json();
				if (!res.ok) {
					return;
				}

				postsCount = json.total ?? 0;
			} catch (err) {
				console.error('Failed to fetch wall count.', err);
			}
		}

		if (isOwnProfile) {
			fetchProfileItems();
		}
		fetchWallCount();

	async function unfriend() {
		try {
			friendLoading = true;
			const res = await fetch(`${config.api}/user/unfriend/${data.user.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});
			const json = await res.json();
			if (!res.ok) {
				console.error(json?.message || 'Failed to unfriend.');
				return;
			}

			invalidateAll();
		} catch (err) {
			console.error(err);
		} finally {
			friendLoading = false;
		}
	}

	let tab = $state(0);
	let totalCollected = $state(0);
	let totalItems = $state(0);
	let overallPercentage = $state(0);

	// Fetch profile items on load
	if (isOwnProfile) {
		fetchProfileItems();
	}

	async function fetchCollections() {
		const res = await fetch(`${config.api}/user/collections/${data.user.id}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${data.token}`
			}
		});

		const json = await res.json();
		if (!res.ok) {
			console.error(json?.message || 'Failed to fetch collections.');
			return [];
		}

		const collections = json?.data || [];
		totalCollected = collections.reduce((sum, c) => sum + c.collected_items, 0);
		totalItems = collections.reduce((sum, c) => sum + c.total_items, 0);
		overallPercentage = totalItems > 0 ? Math.round((totalCollected / totalItems) * 100) : 0;

		return collections;
	}
	let collectionsPromise = $derived(fetchCollections());

	let friendsPage = $state(1);
	let friendsTotalPages = $state(1);
	let friendsTotal = $state(0);

	async function fetchFriends(page = 1) {
		const res = await fetch(`${config.api}/user/friends/${data.user.id}?page=${page}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${data.token}`
			}
		});

		const json = await res.json();
		if (!res.ok) {
			console.error(json?.message || 'Failed to fetch friends.');
			return { data: [], total: 0, last_page: 1 };
		}

		friendsTotal = json.total || 0;
		friendsTotalPages = json.last_page || 1;

		return json.data || [];
	}

	function updateFriends(page) {
		friendsPage = page;
		friendsPromise = fetchFriends(page);
	}

	let friendsPromise = $derived(fetchFriends(friendsPage));

	// --- Customization Modal State ---
	let showCustomizeModal = $state(false);
	let customizationData = $state(null);
	let selectedThemeId = $state(data.user.profile_theme_id);
	let selectedFrameId = $state(0);
	let loadingCustomization = $state(false);
	let savingCustomization = $state(false);
	let themeStylesheetId = $state(0);

	async function fetchCustomization() {
		loadingCustomization = true;
		try {
			const res = await fetch(`${config.api}/user/profile/customization`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await res.json();
			if (!res.ok) {
				console.error(json?.message || 'Failed to fetch customization.');
				return;
			}

			customizationData = json.data;
			selectedThemeId = json.data.profile_theme_id;
			selectedFrameId = json.data.avatar_frame_id;
		} catch (err) {
			console.error('Failed to fetch customization.', err);
		} finally {
			loadingCustomization = false;
		}
	}

	async function saveCustomization() {
		savingCustomization = true;
		try {
			const res = await fetch(`${config.api}/user/profile/customization`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({
					profile_theme_id: selectedThemeId,
					avatar_frame_id: selectedFrameId
				})
			});

			const json = await res.json();
			if (!res.ok) {
				console.error(json?.message || 'Failed to save customization.');
				return;
			}

			showCustomizeModal = false;
		} catch (err) {
			console.error('Failed to save customization.', err);
		} finally {
			savingCustomization = false;
		}
	}

	function openCustomizeModal() {
		showCustomizeModal = true;
		fetchCustomization();
	}

	console.log(data.user.profile_theme_id);
</script>
<svelte:head>
	{#if selectedThemeId > 0}
		<link 
			id="profile-theme-stylesheet" 
			rel="stylesheet" 
			href={`${config.storage}/stylesheets/${selectedThemeId}.css?t=${Date.now()}`} 
		/>
	{/if}
</svelte:head>
{#if data.user && !data.user.privacy?.profile_visible && data.user.id !== user?.id && data.user.friend_status !== 'friends'}
	<div class="max-w-container mx-auto px-4 py-6">
		<div class="max-w-md mx-auto border border-gray-200 rounded p-6 bg-white text-center">
			<p class="text-4xl mb-3">
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
					class="size-10 inline mb-1 text-gray-400"
					><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path
						d="M7 11V7a5 5 0 0 1 10 0v4"
					/></svg
				>
			</p>
			<h1 class="text-xl font-bold text-gray-900 mb-2">Profile Hidden</h1>
			<p class="text-sm text-gray-600">
				This user's profile is hidden. You must be friends with them to view their profile.
			</p>
		</div>
	</div>
{:else}
	<main class="py-6">
		<div class="max-w-container mx-auto px-4">
			<div class="border border-gray-200 rounded p-3 mb-3">
				<div class="grid grid-cols-12 gap-4">
					<div class="col-span-2">
						<img
							class="avatar-frame w-lg h-lg border border-gray-200 p-2"
							src={`${config.headshotStorage}/${data.user.id}.png`}
							alt=""
						/>
					</div>
					<div class="col-span-9">
						<div class="flex items-center gap-2">
							<span class="relative flex h-3 w-3">
								<span class="relative inline-flex rounded-full h-3 w-3 {data.user.is_online ? 'bg-green-500' : 'bg-gray-500'}"></span>
							</span>
							<h2 class="text-xl font-semibold">{data.user.username}</h2>
							{#if data.user.role === 'admin'}
								<Tooltip text="This user is a Fabli administrator!">
									<Gavel class="size-5 text-red-600"/>
								</Tooltip>
							{:else if data.user.role === 'moderator'}
								<Tooltip text="This user is a Fabli moderator!">
									<Gavel class="size-5 text-blue-600"/>
								</Tooltip>
							{/if}
						</div>
						<p class="text-sm text-gray-600/70 mb-3">"{data.user.bubble}"</p>
						<div class="flex items-center gap-2 mb-3">
							{#if data.user.id != page.data.globalUser.id}
							<div>
								{#if data.user.friend_status == "none"}
								<button class="btn-glossy px-4 py-1 text-sm" onclick={sendFriendRequest}>Friend</button>
								{:else if data.user.friend_status == "sent" || data.user.friend_status === "received"}
								<button class="btn-glossy px-4 py-1 text-sm" disabled={true}>Pending</button>
								{:else if data.user.friend_status == "friends"}
								<button class="btn-danger px-4 py-1 text-sm" onclick={unfriend}>Unfriend</button>
								{/if}
							</div>
							<div>
								<a href={`/user/trades/create/${data.user.id}`} class="btn-glossy px-4 py-1 text-sm">Trade</a>
							</div>
							{:else}
								<div>
									<button class="btn-glossy px-4 py-1 text-sm" onclick={openCustomizeModal}>Customize</button>
								</div>
							{/if}
						</div>
						<div class="flex items-center justify-around w-full min-w-full">
							<div class="text-center flex-1">
								<h3 class="text-lg text-primary font-semibold">{format.format(friendsCount)}</h3>
								<p class="text-sm text-gray-600/70">Friends</p>
							</div>
							<div class="text-center flex-1">
								<h3 class="text-lg text-primary font-semibold">{format.format(itemsCount)}</h3>
								<p class="text-sm text-gray-600/70">Items</p>
							</div>
							<div class="text-center flex-1">
								<h3 class="text-lg text-primary font-semibold">{format.format(postsCount)}</h3>
								<p class="text-sm text-gray-600/70">Posts</p>
							</div>
							<div class="text-center flex-1">
								<h3 class="text-lg text-primary font-semibold">{format.format(data.user.final_rap)}</h3>
								<p class="text-sm text-gray-600/70">VAL</p>
							</div>
							<div class="text-center flex-1">
								<h3 class="text-lg text-primary font-semibold">{data.user.level}</h3>
								<p class="text-sm text-gray-600/70">Level</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="grid grid-cols-10 gap-4 mb-3">
				<div class="col-span-2">
					<button 
						class="btn-secondary px-4 py-1 text-sm w-full {tab === 0 ? 'bg-primary text-white' : ''}"
						onclick={() => tab = 0}
					>Overview</button>
				</div>
				<div class="col-span-2">
					<button 
						class="btn-secondary px-4 py-1 text-sm w-full {tab === 1 ? 'bg-primary text-white' : ''}"
						onclick={() => tab = 1}
					>Creations</button>
				</div>
				<div class="col-span-2">
					<button 
						class="btn-secondary px-4 py-1 text-sm w-full {tab === 2 ? 'bg-primary text-white' : ''}"
						onclick={() => tab = 2}
					>Inventory</button>
				</div>
				<div class="col-span-2">
					<button 
						class="btn-secondary px-4 py-1 text-sm w-full {tab === 3 ? 'bg-primary text-white' : ''}"
						onclick={() => tab = 3}
					>Collections</button>
				</div>
			<div class="col-span-2">
				<button 
					class="btn-secondary px-4 py-1 text-sm w-full {tab === 4 ? 'bg-primary text-white' : ''}"
					onclick={() => tab = 4}
				>Friends</button>
			</div>
			</div>
			
			<!-- Tab Content -->			
			{#if tab === 0}
				<!-- Overview Tab -->
				<div class="grid grid-cols-12 gap-4">
					<div class="col-span-4">
						<div class="border border-gray-200 rounded p-3">
							<h5 class="text-sm font-semibold mb-3">Avatar</h5>
							<div class="text-center mb-3">
								<img
									class="inline h-64 w-64"
									src={`${config.avatarStorage}/${data.user.id}.png`}
									alt=""
								/>
							</div>
						</div>
					</div>
					<div class="col-span-8">
						<div class="border border-gray-200 rounded p-3 mb-5">
							<h5 class="text-sm font-semibold mb-3">About</h5>
							<p class="mb-3">
								{data.user.description}
							</p>
						</div>
						<div class="border border-gray-200 rounded p-3">
							<div class="flex items-center justify-between mb-3">
								<h5 class="text-sm font-semibold">Item Wall</h5>
								{#if isOwnProfile}
									<button 
										class="btn-glossy px-3 py-1 text-sm"
										onclick={openEditModal}
									>Edit</button>
								{/if}
							</div>
							{#if loadingProfileItems}
								<p class="text-center text-sm text-gray-500 py-8">Loading items...</p>
							{:else if profileItems.length === 0}
								<p class="text-center text-sm text-gray-500 py-8">No items on wall.</p>
							{:else}
								<div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
									{#each profileItems as profileItem}
										<div class="cursor-pointer item-card card-shadow">
											<div class="relative">
												<img 
													loading="lazy" 
													src={`${config.storage}/items/${profileItem.item.id}.png`}
													alt={profileItem.item.title}
												/>
												{#if profileItem.item.rarity != "none"}
													<span class="rarity-badge rarity-{profileItem.item.rarity.toLowerCase()}">{profileItem.item.rarity}</span>
												{/if}
											</div>
											<div class="p-2">
												<p class="text-sm font-medium text-gray-900 truncate">{profileItem.item.title}</p>
												<span class="text-xs text-gray-400">{profileItem.item.category?.title || ''}</span>
												{#if profileItem.serial != null}
													<p class="text-xs text-gray-500 mt-1">#{profileItem.serial}</p>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{:else if tab === 1}
				<!-- Creations Tab -->
				<div class="border border-gray-200 rounded p-3">
					<h3 class="text-sm font-semibold mb-4">Creations</h3>
					{#await creationsPromise}
						<p class="text-center text-sm text-gray-500 py-8">Loading creations...</p>
					{:then creations}
						{#if creations.length === 0}
							<p class="text-center text-sm text-gray-500 py-8">No creations yet.</p>
						{:else}
							<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
								{#each creations as creation}
									<ItemCard 
										item={creation}
										formatter={format}
									/>
								{/each}
							</div>
						{/if}
					{:catch error}
						<p class="text-center text-red-500 py-8">Failed to load creations.</p>
					{/await}
					{#if creationsTotalPages > 1}
						<div class="flex items-center justify-center gap-2 mt-4">
							<button 
								class="btn-glossy px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
								disabled={creationsPage <= 1}
								onclick={() => updateCreations(creationsPage - 1)}
							>Previous</button>
							<span class="text-sm text-gray-600">Page {creationsPage} of {creationsTotalPages}</span>
							<button 
								class="btn-glossy px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
								disabled={creationsPage >= creationsTotalPages}
								onclick={() => updateCreations(creationsPage + 1)}
							>Next</button>
						</div>
					{/if}
				</div>
			{:else if tab === 2}
				<!-- Inventory Tab -->
				<div class="border border-gray-200 rounded p-3">
					<h3 class="text-sm font-semibold mb-4">Inventory</h3>
					{#await inventoryPromise}
						<p class="text-center text-sm text-gray-500 py-8">Loading inventory...</p>
					{:then inventory}
						{#if !inventory || inventory.length === 0}
							<p class="text-center text-sm text-gray-500 py-8">No items in inventory.</p>
						{:else}
							<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
								{#each inventory as item}
									<ItemCard 
										item={item.item}
										serial={item.serial}
										formatter={format}
									/>
								{/each}
							</div>
						{/if}
					{:catch error}
						<p class="text-center text-red-500 py-8">Failed to load inventory.</p>
					{/await}
					{#if inventoryTotalPages > 1}
						<div class="flex items-center justify-center gap-2 mt-4">
							<button 
								class="btn-glossy px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
								disabled={inventoryPage <= 1}
								onclick={() => updateInventory(inventoryPage - 1)}
							>Previous</button>
							<span class="text-sm text-gray-600">Page {inventoryPage} of {inventoryTotalPages}</span>
							<button 
								class="btn-glossy px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
								disabled={inventoryPage >= inventoryTotalPages}
								onclick={() => updateInventory(inventoryPage + 1)}
							>Next</button>
						</div>
					{/if}
				</div>
			{:else if tab === 3}
				<!-- Collections Tab -->
				{#await collectionsPromise}
					<p class="text-center text-sm text-gray-500 py-8">Loading collections...</p>
				{:then collections}
					{#if collections.length === 0}
						<div class="border border-gray-200 rounded p-8 text-center">
							<p class="text-gray-500">No collections available.</p>
						</div>
					{:else}
						<div class="grid grid-cols-2 gap-4">
							<div class="border border-gray-200 rounded p-3">
								<h3 class="text-sm font-semibold mb-3">Collections</h3>
								<div class="max-h-80 overflow-y-auto space-y-0">
								{#each collections as collection}
									<div class="flex items-center justify-between py-2 px-2 border-b border-gray-100 last:border-b-0">
										<span class="text-sm font-medium" style="color: {collection.status === 'completed' ? '#22c55e' : collection.status === 'in_progress' ? '#eab308' : '#6b7280'}">{collection.name}</span>
										{#if collection.status !== 'not_started'}
											<span class="text-xs text-gray-500">{collection.percentage}%</span>
										{/if}
									</div>
								{/each}
								</div>
								<!-- {@const totalCollected = collections.reduce((sum, c) => sum + c.collected_items, 0)}
								{@const totalItems = collections.reduce((sum, c) => sum + c.total_items, 0)}
								{@const overallPercentage = totalItems > 0 ? Math.round((totalCollected / totalItems) * 100) : 0} -->
								<div class="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600 text-center">
									Collected items: {totalCollected} / {totalItems} ({overallPercentage}%)
								</div>
							</div>
							<div class="border border-gray-200 rounded p-3">
								<h3 class="text-sm font-semibold mb-3">Achievements</h3>
								<div class="grid grid-cols-12 gap-4">
									{#if data.user.id < 101}
									<div class="col-span-3">
										<Tooltip text="This user is a part of the Founder's programme!">
											<img src="/badges/FounderBadge.png" alt="">
										</Tooltip>
									</div>
									{/if}
									{#if data.user.role == "moderator"}
									<div class="col-span-3">
										<Tooltip text="This user is a Fabli moderator!">
											<img src="/badges/ModeratorBadge.png" alt="">
										</Tooltip>
									</div>							
									{/if}		
									{#if data.user.role == "admin"}
									<div class="col-span-3">
										<Tooltip text="This user is a Fabli administrator!">
											<img src="/badges/AdminBadge.png" alt="">
										</Tooltip>
									</div>							
									{/if}	
								</div>
							</div>
						</div>
					{/if}
				{:catch error}
					<p class="text-center text-red-500 py-8">Failed to load collections.</p>
				{/await}
			{:else if tab === 4}
				<!-- Friends Tab -->
				<div class="border border-gray-200 rounded p-3">
					<h3 class="text-sm font-semibold mb-4">Friends</h3>
					{#await friendsPromise}
						<p class="text-center text-sm text-gray-500 py-8">Loading friends...</p>
					{:then friends}
						{#if friends.length === 0}
							<p class="text-center text-sm text-gray-500 py-8">No friends yet.</p>
						{:else}
							<div class="space-y-2">
								{#each friends as friend}
									<a href={`/user/profile/${friend.id}`} class="flex items-center justify-between p-3 border border-gray-100 rounded hover:bg-gray-50 transition-colors">
										<div class="flex items-center gap-3">
											<img
												class="w-10 h-10 border border-gray-200 rounded-full"
												src={`${config.headshotStorage}/${friend.id}.png`}
												alt=""
											/>
											<div>
												<p class="text-sm font-medium text-gray-900">{friend.username}</p>
												<p class="text-xs text-gray-500">"{friend.bubble}"</p>
											</div>
										</div>
										<div class="text-xs text-gray-500">
											{friend.last_seen_at ? new Date(friend.last_seen_at).toLocaleDateString() : ''}
										</div>
									</a>
								{/each}
							</div>
						{/if}
					{:catch error}
						<p class="text-center text-red-500 py-8">Failed to load friends.</p>
					{/await}
					{#if friendsTotalPages > 1}
						<div class="flex items-center justify-center gap-2 mt-4">
							<button 
								class="btn-glossy px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
								disabled={friendsPage <= 1}
								onclick={() => updateFriends(friendsPage - 1)}
							>Previous</button>
							<span class="text-sm text-gray-600">Page {friendsPage} of {friendsTotalPages}</span>
							<button 
								class="btn-glossy px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
								disabled={friendsPage >= friendsTotalPages}
								onclick={() => updateFriends(friendsPage + 1)}
							>Next</button>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Other tabs placeholder -->
				<div class="border border-gray-200 rounded p-8 text-center">
					<p class="text-gray-500">Coming soon...</p>
				</div>
			{/if}
		</div>
	</main>
{/if}

{#if showEditModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showEditModal = false}>
		<div class="bg-white rounded border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onclick={(e) => e.stopPropagation()}>
			<div class="p-3 border-b border-gray-200 flex items-center justify-between">
				<h3 class="text-lg font-semibold">Edit Item Wall</h3>
				<button 
					class="cursor-pointer text-gray-500 hover:text-gray-700"
					onclick={() => showEditModal = false}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-6"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>
			<div class="p-3 border-b border-gray-200">
				<div class="flex gap-2">
					<input 
						type="text" 
						placeholder="Search items..." 
						class="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
						bind:value={itemSearch}
						oninput={() => fetchAvailableItems()}
					/>
					<select 
						class="px-3 py-1 border border-gray-300 rounded text-sm"
						bind:value={itemCategory}
						onchange={() => fetchAvailableItems()}
					>
						<option value="">All Categories</option>
						{#each categories as category}
							<option value={category.title}>{category.title}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="flex-1 overflow-y-auto p-3">
				{#if loadingAvailableItems}
					<p class="text-center text-sm text-gray-500 py-8">Loading items...</p>
				{:else if availableItems.length === 0}
					<p class="text-center text-sm text-gray-500 py-8">No items found.</p>
				{:else}
					<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
						{#each availableItems as item}
							<button 
								class="border-1 cursor-pointer rounded p-2 transition-all {selectedItems.some(si => si.id === item.id) ? 'border-primary bg-blue-50' : 'border-transparent hover:border-gray-300'}"
								onclick={() => {
									if (selectedItems.some(si => si.id === item.id)) {
										selectedItems = selectedItems.filter(si => si.id !== item.id);
									} else {
										selectedItems = [...selectedItems, item];
									}
								}}
							>
								<img 
									loading="lazy" 
									src={`${config.storage}/items/${item.id}.png`}
									alt={item.title}
									class="w-full aspect-square object-cover"
								/>
								<p class="text-sm font-medium text-gray-900 truncate mt-2">{item.title}</p>
								<span class="text-xs text-gray-400">{item.category_title}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
			<div class="p-4 border-t border-gray-200 flex justify-end gap-2">
				<button 
					class="btn-secondary px-4 py-1 text-sm"
					onclick={() => showEditModal = false}
				>Close</button>
				<button 
					class="btn-glossy px-4 py-1 text-sm"
					onclick={saveProfileItems}
				>Save Changes</button>
			</div>
		</div>
	</div>
{/if}

<!-- Customize Modal -->
{#if showCustomizeModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick={() => showCustomizeModal = false}>
		<div class="bg-white rounded border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onclick={(e) => e.stopPropagation()}>
			<div class="p-3 border-b border-gray-200 flex items-center justify-between">
				<h3 class="text-lg font-semibold">Customize Profile</h3>
				<button 
					class="cursor-pointer text-gray-500 hover:text-gray-700"
					onclick={() => showCustomizeModal = false}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-6"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</div>
			<div class="flex-1 overflow-y-auto p-3">
				{#if loadingCustomization}
					<p class="text-center text-sm text-gray-500 py-8">Loading customization options...</p>
				{:else if customizationData}
					<!-- Profile Theme Selection -->
					<div class="mb-6">
						<h4 class="text-sm font-semibold mb-3">Profile Theme</h4>
						{#if customizationData.themes.length === 0}
							<p class="text-sm text-gray-500 mb-2">You don't have any themes yet.</p>
						{:else}
							<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-2">
								<!-- Default option (no theme) -->
								<button 
									class="border-1 cursor-pointer rounded p-2 transition-all {selectedThemeId === 0 ? '!border-primary bg-blue-50 ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300'}"
									onclick={() => selectedThemeId = 0}
								>
									<div class="w-full aspect-square bg-gray-100 flex items-center justify-center">
										<span class="text-3xl text-gray-400">—</span>
									</div>
									<p class="text-sm font-medium text-gray-900 truncate mt-2">Default</p>
								</button>
								{#each customizationData.themes as theme}
									<button 
										class="border-1 cursor-pointer rounded p-2 transition-all {selectedThemeId === theme.id ? '!border-primary bg-blue-50 ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300'}"
										onclick={() => selectedThemeId = theme.id}
									>
										<img 
											loading="lazy" 
											src={`${config.storage}/items/${theme.id}.png`}
											alt={theme.title}
											class="w-full aspect-square object-cover"
										/>
										<p class="text-sm font-medium text-gray-900 truncate mt-2">{theme.title}</p>
									</button>
								{/each}
							</div>
						{/if}
						{#if customizationData.themes.length === 0}
							<p class="text-xs text-gray-400 mt-1">
								<a href="/marketplace" class="text-primary hover:underline">Buy them in the marketplace!</a>
							</p>
						{/if}
					</div>

					<!-- Avatar Frame Selection -->
					<div class="mb-6">
						<h4 class="text-sm font-semibold mb-3">Avatar Frame</h4>
						{#if customizationData.frames.length === 0}
							<p class="text-sm text-gray-500 mb-2">You don't have any frames yet.</p>
						{:else}
							<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-2">
								<!-- Default option (no frame) -->
								<button 
									class="border-1 cursor-pointer rounded p-2 transition-all {selectedFrameId === 0 ? 'border-primary bg-blue-50 ring-2 ring-primary' : 'border-gray-200 hover:border-gray-300'}"
									onclick={() => selectedFrameId = 0}
								>
									<div class="w-full aspect-square bg-gray-100 flex items-center justify-center">
										<span class="text-3xl text-gray-400">—</span>
									</div>
									<p class="text-sm font-medium text-gray-900 truncate mt-2">Default</p>
								</button>
								{#each customizationData.frames as frame}
									<button 
										class="border-1 cursor-pointer rounded p-2 transition-all {selectedFrameId === frame.id ? 'border-primary bg-blue-50 ring-2 ring-primary' : 'border-gray-200 hover:border-gray-300'}"
										onclick={() => selectedFrameId = frame.id}
									>
										<img 
											loading="lazy" 
											src={`${config.storage}/items/${frame.id}.png`}
											alt={frame.title}
											class="w-full aspect-square object-cover"
										/>
										<p class="text-sm font-medium text-gray-900 truncate mt-2">{frame.title}</p>
									</button>
								{/each}
							</div>
						{/if}
						{#if customizationData.frames.length === 0}
							<p class="text-xs text-gray-400 mt-1">
								<a href="/marketplace" class="text-primary hover:underline">Buy them in the marketplace!</a>
							</p>
						{/if}
					</div>

					<!-- Empty state message if both are empty -->
					{#if customizationData.themes.length === 0 && customizationData.frames.length === 0}
						<div class="text-center py-4 border-t border-gray-200">
							<p class="text-sm text-gray-500">Don't have any themes or frames? <a href="/marketplace" class="text-primary hover:underline">Buy them in the marketplace!</a></p>
						</div>
					{/if}
				{/if}
			</div>
			<div class="p-3 border-t border-gray-200 flex justify-end gap-2">
				<button 
					class="btn-secondary px-4 py-1 text-sm"
					onclick={() => showCustomizeModal = false}
				>Close</button>
				<button 
					class="btn-glossy px-4 py-1 text-sm"
					onclick={saveCustomization}
					disabled={savingCustomization}
				>{savingCustomization ? 'Saving...' : 'Save Changes'}</button>
			</div>
		</div>
	</div>
{/if}